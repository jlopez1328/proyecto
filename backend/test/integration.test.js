import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

process.env.NODE_ENV='test';
process.env.JWT_SECRET='test-only-secret-with-more-than-32-characters-xyz';
const { app }=await import('../src/app.js');
const {User,Product,Sale,Purchase,Movement,Counter,initializeDatabase}=await import('../src/models.js');
let replica, admin, buyer, seller, otherSeller, users;
const password='SeguroNexus2026!';
before(async()=>{
  replica=await MongoMemoryReplSet.create({replSet:{count:1,storageEngine:'wiredTiger'},binary:{version:'7.0.24'}});
  await mongoose.connect(replica.getUri());await initializeDatabase();
}, {timeout:240000});
after(async()=>{await mongoose.disconnect();if(replica)await replica.stop();});
beforeEach(async()=>{
  await Promise.all([User.deleteMany({}),Product.deleteMany({}),Sale.deleteMany({}),Purchase.deleteMany({}),Movement.deleteMany({}),Counter.updateMany({},{$set:{seq:0}})]);
  const hashed=await bcrypt.hash(password,4);users={};
  for(const [name,role] of [['Admin','administrador'],['Buyer','comprador'],['Seller','vendedor'],['Other','vendedor']])users[name]=await User.create({name,email:`${name.toLowerCase()}@test.local`,password:hashed,role});
  const login=async name=>{const agent=request.agent(app);await agent.post('/api/auth/login').send({email:`${name.toLowerCase()}@test.local`,password}).expect(200);return agent;};
  [admin,buyer,seller,otherSeller]=await Promise.all(['Admin','Buyer','Seller','Other'].map(login));
});
async function product(overrides={}){const res=await buyer.post('/api/products').send({name:'Arroz',netPrice:100,vat:19,tax:5,margin:30,minStock:2,...overrides}).expect(201);return res.body.product;}
const purchaseBody=(p,quantity=10)=>({requestId:randomUUID(),supplier:'Proveedor',lines:[{product:p._id,quantity,netPrice:100,vat:19,tax:5,margin:30}]});
async function stocked(quantity=10){const p=await product();await buyer.post('/api/purchases').send(purchaseBody(p,quantity)).expect(201);return p;}
const saleBody=(p,quantity=1,discount=0)=>({requestId:randomUUID(),discount,lines:[{product:p._id,quantity,discount:10}]});

test('registro público vendedor, contraseña cifrada, cookie segura y sesión',async()=>{
  await request(app).post('/api/auth/register').send({name:'Intruso',email:'bad@test.local',password,role:'administrador'}).expect(400);
  const res=await request(app).post('/api/auth/register').send({name:'Nuevo',email:'new@test.local',password}).expect(201);
  assert.equal(res.body.user.role,'vendedor');assert.equal(res.body.user.password,undefined);
  assert.match(res.headers['set-cookie'][0],/HttpOnly/);assert.match(res.headers['set-cookie'][0],/SameSite=Strict/);
  const u=await User.findOne({email:'new@test.local'}).select('+password');assert.notEqual(u.password,password);assert.ok(await bcrypt.compare(password,u.password));
  await request(app).get('/api/products').expect(401);
  await request(app).post('/api/auth/login').send({email:'new@test.local',password:'incorrect-password'}).expect(401);
});
test('matriz de permisos aplicada en servidor y catálogo sin costos',async()=>{
  await product();await seller.get('/api/products').expect(403);await seller.get('/api/purchases').expect(403);await seller.get('/api/movements').expect(403);await buyer.get('/api/sales').expect(403);await buyer.get('/api/users').expect(403);
  await seller.post('/api/products').send({}).expect(403);await buyer.post('/api/sales').send({}).expect(403);
  const catalog=await seller.get('/api/catalog').expect(200);assert.equal(catalog.body.items[0].netPrice,undefined);assert.equal(catalog.body.items[0].margin,undefined);
  const report=await seller.get('/api/reports').expect(200);assert.equal(report.body.inventory,undefined);assert.equal(report.body.months[0].purchases,undefined);
  await admin.get('/api/products').expect(200);await admin.get('/api/users').expect(200);
});
test('productos consecutivos, búsqueda literal y cálculos con impuestos',async()=>{
  const p=await product(),p2=await product({name:'Aceite'});assert.equal(p.code,'PRD-000001');assert.equal(p2.code,'PRD-000002');assert.equal(p.suggestedPrice,161.2);assert.equal(p.salePrice,161.2);assert.equal(p.stock,0);
  const found=await buyer.get('/api/products?search=aceite').expect(200);assert.equal(found.body.total,1);
  const literal=await buyer.get('/api/products?search=%2E%2A').expect(200);assert.equal(literal.body.total,0);
  await buyer.patch(`/api/products/${p._id}`).send({name:'Arroz actualizado',netPrice:100,stock:99}).expect(400);
  const changed=await buyer.patch(`/api/products/${p._id}`).send({name:'Arroz actualizado',netPrice:100,vat:0,tax:0,margin:10,salePrice:150}).expect(200);assert.equal(changed.body.product.salePrice,150);assert.equal(changed.body.product.suggestedPrice,110);
  await buyer.delete(`/api/products/${p._id}`).expect(200);assert.equal((await Product.findById(p._id)).active,false);
});
test('compra, venta con descuentos sucesivos, idempotencia e historial',async()=>{
  const p=await product(),body=purchaseBody(p,10);const purchase=await buyer.post('/api/purchases').send(body).expect(201);assert.equal(purchase.body.purchase.total,1240);
  await buyer.post('/api/purchases').send(body).expect(201);assert.equal(await Purchase.countDocuments(),1);assert.equal((await Product.findById(p._id)).stock,10);
  const bodySale=saleBody(p,2,20),res=await seller.post('/api/sales').send(bodySale).expect(201);assert.equal(res.body.sale.subtotal,322.4);assert.equal(res.body.sale.total,232.13);
  await seller.post('/api/sales').send(bodySale).expect(201);assert.equal((await Product.findById(p._id)).stock,8);assert.equal(await Sale.countDocuments(),1);assert.equal(await Movement.countDocuments(),2);
  await seller.post('/api/sales').send({...bodySale,discount:30}).expect(409);await otherSeller.post('/api/sales').send(bodySale).expect(409);
  assert.equal((await seller.get('/api/sales')).body.total,1);assert.equal((await otherSeller.get('/api/sales')).body.total,0);assert.equal((await admin.get('/api/sales')).body.total,1);
});
test('una línea inválida revierte toda la venta y la compra',async()=>{
  const p=await stocked(5),missing=new mongoose.Types.ObjectId().toString();
  await seller.post('/api/sales').send({requestId:randomUUID(),lines:[{product:p._id,quantity:2},{product:missing,quantity:1}]}).expect(409);
  assert.equal((await Product.findById(p._id)).stock,5);assert.equal(await Sale.countDocuments(),0);assert.equal(await Movement.countDocuments({kind:'venta'}),0);
  const body=purchaseBody(p,3);body.lines.push({...body.lines[0],product:missing});await buyer.post('/api/purchases').send(body).expect(409);
  assert.equal((await Product.findById(p._id)).stock,5);assert.equal(await Purchase.countDocuments(),1);
});
test('ventas simultáneas no generan stock negativo',async()=>{
  const p=await stocked(1);const responses=await Promise.all([seller.post('/api/sales').send(saleBody(p)),otherSeller.post('/api/sales').send(saleBody(p))]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]);assert.equal((await Product.findById(p._id)).stock,0);assert.equal(await Sale.countDocuments(),1);
});
test('daños idempotentes, sin sobrepasar existencias, y eliminación lógica',async()=>{
  const p=await stocked(5);await buyer.delete(`/api/products/${p._id}`).expect(409);
  const damage={requestId:randomUUID(),quantity:2,reason:'Empaque roto'};await buyer.post(`/api/products/${p._id}/damage`).send(damage).expect(201);await buyer.post(`/api/products/${p._id}/damage`).send(damage).expect(201);
  let stored=await Product.findById(p._id);assert.equal(stored.stock,3);assert.equal(stored.damaged,2);
  await buyer.post(`/api/products/${p._id}/damage`).send({...damage,requestId:randomUUID(),quantity:4}).expect(409);
  await buyer.post(`/api/products/${p._id}/damage`).send({...damage,requestId:randomUUID(),quantity:3}).expect(201);await buyer.delete(`/api/products/${p._id}`).expect(200);
  assert.equal(await Movement.countDocuments({product:p._id}),3);
});
test('cantidades, descuentos, JSON y campos desconocidos son validados',async()=>{
  const p=await stocked();for(const quantity of [0,-1,1.5])await seller.post('/api/sales').send(saleBody(p,quantity)).expect(400);
  await seller.post('/api/sales').send(saleBody(p,1,101)).expect(400);
  const body=saleBody(p);body.lines.push(body.lines[0]);await seller.post('/api/sales').send(body).expect(400);
  await buyer.post('/api/products').send({name:'X',netPrice:0.001}).expect(400);
  await seller.post('/api/sales').send({...saleBody(p),total:1}).expect(400);
  await buyer.patch('/api/products/invalid').send({name:'x',netPrice:1}).expect(400);
  await seller.post('/api/sales').set('Content-Type','application/json').send('{oops').expect(400);
});
test('cambios de rol y cierre de sesión revocan JWT anteriores',async()=>{
  await admin.patch(`/api/users/${users.Admin._id}`).send({role:'vendedor',active:true}).expect(409);
  await admin.patch(`/api/users/${users.Seller._id}`).send({role:'comprador',active:true}).expect(200);await seller.get('/api/auth/me').expect(401);
  await buyer.post('/api/auth/logout').expect(200);await buyer.get('/api/auth/me').expect(401);
  const created=await admin.post('/api/users').send({name:'Comprador 2',email:'buyer2@test.local',password,role:'comprador'}).expect(201);assert.equal(created.body.user.password,undefined);
});
test('informes mensuales respetan año y zona horaria de Bogotá',async()=>{
  const p=await stocked();await seller.post('/api/sales').send(saleBody(p)).expect(201);
  await Sale.collection.updateOne({},{$set:{createdAt:new Date('2026-01-01T04:59:59Z')}});
  const previous=await admin.get('/api/reports?year=2025').expect(200);assert.equal(previous.body.months[11].saleCount,1);
  const current=await admin.get('/api/reports?year=2026').expect(200);assert.equal(current.body.months[0].saleCount,0);assert.equal(current.body.inventory.units,9);
});
test('rechaza origen ajeno y expone contrato Swagger',async()=>{
  await seller.post('/api/sales').set('Origin','https://ajeno.example').send({}).expect(403);
  const schema=await request(app).get('/api/openapi.json').expect(200);assert.equal(schema.body.openapi,'3.0.3');assert.ok(schema.body.paths['/products/{id}/damage']);
  await request(app).get('/api/health').expect(200);await request(app).get('/api/no-existe').expect(404);
});

const resetBody=(code,extra={})=>({email:'seller@test.local',code,password:'NuevaClaveNexus2026!',confirmPassword:'NuevaClaveNexus2026!',...extra});
const approveReset=async()=> (await admin.post(`/api/users/${users.Seller._id}/password-reset`).expect(201)).body;
test('recuperación solicita autorización sin revelar cuentas y conserva el código habilitado',async()=>{
  const known=await request(app).post('/api/auth/password-reset/request').send({email:'seller@test.local'}).expect(202);
  const unknown=await request(app).post('/api/auth/password-reset/request').send({email:'missing@test.local'}).expect(202);
  assert.deepEqual(known.body,unknown.body);
  assert.ok((await User.findById(users.Seller._id)).passwordResetRequestedAt);
  const grant=await approveReset();
  await request(app).post('/api/auth/password-reset/request').send({email:'seller@test.local'}).expect(202);
  const stored=await User.findById(users.Seller._id).select('+passwordResetHash');
  assert.equal(stored.passwordResetRequestedAt,null);assert.equal(stored.passwordResetExpiresAt.toISOString(),grant.expiresAt);
  assert.match(grant.code,/^[A-Za-z0-9_-]{32}$/);assert.notEqual(stored.passwordResetHash,grant.code);
  const listed=(await admin.get('/api/users')).body.items.find(u=>u._id===String(users.Seller._id));
  assert.equal(listed.passwordResetHash,undefined);assert.equal(listed.passwordResetApprovedBy,undefined);assert.equal(listed.password,undefined);
});
test('solo administrador puede habilitar o revocar y no puede habilitar su propia recuperación',async()=>{
  const path=`/api/users/${users.Seller._id}/password-reset`;
  await request(app).post(path).expect(401);await seller.post(path).expect(403);await buyer.post(path).expect(403);await seller.delete(path).expect(403);
  await admin.post(`/api/users/${users.Admin._id}/password-reset`).expect(409);
  await User.updateOne({_id:users.Seller._id},{$set:{active:false}});await admin.post(path).expect(404);
});
test('cambio autorizado cifra contraseña, consume código y revoca sesiones',async()=>{
  const second=request.agent(app);await second.post('/api/auth/login').send({email:'seller@test.local',password}).expect(200);
  const grant=await approveReset();assert.ok(new Date(grant.expiresAt)>new Date());assert.ok(new Date(grant.expiresAt)<=new Date(Date.now()+15*60000));
  await request(app).post('/api/auth/password-reset/confirm').send(resetBody(grant.code)).expect(200);
  await seller.get('/api/auth/me').expect(401);await second.get('/api/auth/me').expect(401);
  await request(app).post('/api/auth/login').send({email:'seller@test.local',password}).expect(401);
  await request(app).post('/api/auth/login').send({email:'seller@test.local',password:'NuevaClaveNexus2026!'}).expect(200);
  await request(app).post('/api/auth/password-reset/confirm').send(resetBody(grant.code)).expect(400);
  const stored=await User.findById(users.Seller._id).select('+password +passwordResetHash');
  assert.ok(await bcrypt.compare('NuevaClaveNexus2026!',stored.password));assert.equal(stored.passwordResetHash,undefined);assert.equal(stored.passwordResetExpiresAt,null);
});
test('rechaza códigos sin autorización, vencidos, revocados y reemplazados',async()=>{
  await request(app).post('/api/auth/password-reset/confirm').send(resetBody('A'.repeat(32))).expect(400);
  let grant=await approveReset();await User.updateOne({_id:users.Seller._id},{$set:{passwordResetExpiresAt:new Date(Date.now()-1000)}});
  await request(app).post('/api/auth/password-reset/confirm').send(resetBody(grant.code)).expect(400);
  grant=await approveReset();await admin.delete(`/api/users/${users.Seller._id}/password-reset`).expect(200);
  await request(app).post('/api/auth/password-reset/confirm').send(resetBody(grant.code)).expect(400);
  grant=await approveReset();const replacement=await approveReset();assert.notEqual(grant.code,replacement.code);
  await request(app).post('/api/auth/password-reset/confirm').send(resetBody(grant.code)).expect(400);
  await request(app).post('/api/auth/password-reset/confirm').send(resetBody(replacement.code,{email:'other@test.local'})).expect(400);
  await request(app).post('/api/auth/password-reset/confirm').send(resetBody(replacement.code)).expect(200);
});
test('valida confirmación y longitud sin consumir un código válido; cambios de permisos lo revocan',async()=>{
  const grant=await approveReset();
  await request(app).post('/api/auth/password-reset/confirm').send(resetBody(grant.code,{confirmPassword:'UnaClaveDistinta2026!'})).expect(400);
  await request(app).post('/api/auth/password-reset/confirm').send(resetBody(grant.code,{password:'corta',confirmPassword:'corta'})).expect(400);
  const long='á'.repeat(40);await request(app).post('/api/auth/password-reset/confirm').send(resetBody(grant.code,{password:long,confirmPassword:long})).expect(400);
  assert.ok((await User.findById(users.Seller._id).select('+passwordResetHash')).passwordResetHash);
  await admin.patch(`/api/users/${users.Seller._id}`).send({role:'comprador',active:true}).expect(200);
  await request(app).post('/api/auth/password-reset/confirm').send(resetBody(grant.code)).expect(400);
});
test('dos intentos simultáneos consumen el código una sola vez',async()=>{
  const grant=await approveReset();
  const results=await Promise.all([request(app).post('/api/auth/password-reset/confirm').send(resetBody(grant.code)),request(app).post('/api/auth/password-reset/confirm').send(resetBody(grant.code))]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
});
