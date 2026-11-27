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
const {User,Product,Sale,Purchase,Movement,Counter,initializeDatabase}=await import('../src/modelo/index.js');
let replica, admin, buyer, seller, otherSeller, users;
const password='Seguro123';
before(async()=>{
  replica=await MongoMemoryReplSet.create({replSet:{count:1,storageEngine:'wiredTiger'},binary:{version:'7.0.24'}});
  await mongoose.connect(replica.getUri());await initializeDatabase();
}, {timeout:240000});
after(async()=>{await mongoose.disconnect();if(replica)await replica.stop();});
beforeEach(async()=>{
  await Promise.all([User.deleteMany({}),Product.deleteMany({}),Sale.deleteMany({}),Purchase.deleteMany({}),Movement.deleteMany({}),Counter.updateMany({},{$set:{seq:0}})]);
  const hashed=await bcrypt.hash(password,4);users={};
  for(const [name,role] of [['Admin','administrador'],['Buyer','comprador'],['Seller','vendedor'],['Other','vendedor']])users[name]=await User.create({name,username:name.toLowerCase(),email:`${name.toLowerCase()}@test.local`,password:hashed,role});
  const login=async name=>{const agent=request.agent(app);await agent.post('/api/auth/login').send({username:name.toLowerCase(),password}).expect(200);return agent;};
  [admin,buyer,seller,otherSeller]=await Promise.all(['Admin','Buyer','Seller','Other'].map(login));
});
async function product(overrides={}){const res=await buyer.post('/api/products').send({name:'Arroz',netPrice:100,vat:19,tax:5,margin:30,minStock:2,...overrides}).expect(201);return res.body.product;}
const purchaseBody=(p,quantity=10)=>({requestId:randomUUID(),supplier:'Proveedor',lines:[{product:p._id,quantity,netPrice:100,vat:19,tax:5,margin:30}]});
async function stocked(quantity=10){const p=await product();await buyer.post('/api/purchases').send(purchaseBody(p,quantity)).expect(201);return p;}
const saleBody=(p,quantity=1,discount=0)=>({requestId:randomUUID(),discount,lines:[{product:p._id,quantity,discount:10}]});

test('comprador y administrador modifican fichas existentes; vendedor no puede y las existencias se conservan',async()=>{
  const p=await stocked(3),path='/api/products/'+p._id;
  const body={name:'Arroz actualizado',category:'Abarrotes',netPrice:200,vat:5,tax:2,margin:25,minStock:4,salePrice:280};
  await seller.patch(path).send(body).expect(403);
  for(const agent of [buyer,admin]){
    await agent.patch(path).send(body).expect(200);
    const stored=await Product.findById(p._id);
    for(const [key,value] of Object.entries(body))assert.equal(stored[key],value);
    assert.equal(stored.code,p.code);assert.equal(stored.stock,3);assert.equal(stored.damaged,0);assert.equal(stored.suggestedPrice,267.5);
  }
  await buyer.patch(path).send({...body,stock:99}).expect(400);
  await admin.patch(path).send({...body,code:'PRD-OTRO'}).expect(400);
});

test('registro público vendedor, contraseña cifrada, cookie segura y sesión',async()=>{
  await request(app).post('/api/auth/register').send({name:'Intruso',username:'intruso',email:'bad@test.local',password,role:'administrador'}).expect(400);
  const res=await request(app).post('/api/auth/register').send({name:'Nuevo',username:'nuevo',email:'new@test.local',password}).expect(201);
  assert.equal(res.body.user.role,'vendedor');assert.equal(res.body.user.password,undefined);
  assert.match(res.headers['set-cookie'][0],/HttpOnly/);assert.match(res.headers['set-cookie'][0],/SameSite=Strict/);
  const u=await User.findOne({email:'new@test.local'}).select('+password');assert.notEqual(u.password,password);assert.ok(await bcrypt.compare(password,u.password));
  await request(app).get('/api/products').expect(401);
  await request(app).post('/api/auth/login').send({username:'nuevo',password:'incorrect-password'}).expect(401);
});

test('sesión del navegador requiere la clave de la pestaña y no deja cookie persistente',async()=>{
  const browser=request.agent(app),key=randomUUID();
  const login=await browser.post('/api/auth/login').set('X-Tab-Session',key).send({username:'seller',password}).expect(200);
  assert.doesNotMatch(login.headers['set-cookie'][0],/Max-Age|Expires=/i);
  await browser.get('/api/auth/me').set('X-Tab-Session',key).expect(200);
  await browser.get('/api/auth/me').expect(401);
  await browser.get('/api/auth/me').set('X-Tab-Session',randomUUID()).expect(401);
  await browser.get('/api/products').set('X-Tab-Session',randomUUID()).expect(401);
  await browser.get('/api/auth/me').set('X-Tab-Session',key).expect(200);
  // A new document cannot reuse the old cookie, but can start a new login.
  const next=randomUUID();
  await browser.post('/api/auth/login').set('X-Tab-Session',next).send({username:'seller',password}).expect(200);
  await browser.get('/api/auth/me').set('X-Tab-Session',next).expect(200);
  await browser.get('/api/auth/me').set('X-Tab-Session',key).expect(401);
});
test('el navegador no recupera una sesión antigua sin vínculo de pestaña',async()=>{
  const browser=request.agent(app);await browser.post('/api/auth/login').send({username:'seller',password}).expect(200);
  await browser.get('/api/auth/me').set('X-Tab-Session',randomUUID()).expect(401);
});

test('crear desde Inventario guarda cantidad inicial con ajuste, validación y permisos',async()=>{
  const body={name:'Producto inicial',netPrice:100,initialStock:9};
  await seller.post('/api/products').send(body).expect(403);
  for(const agent of [buyer,admin]){
    const result=await agent.post('/api/products').send(body).expect(201),p=result.body.product;
    assert.equal((await Product.findById(p._id)).stock,9);
    const movement=await Movement.findOne({product:p._id,kind:'ajuste'});assert.equal(movement.quantity,9);assert.match(movement.reference,/^AJU-/);assert.match(movement.reason,/iniciales/);
  }
  const zero=await buyer.post('/api/products').send({...body,initialStock:0}).expect(201);assert.equal(await Movement.countDocuments({product:zero.body.product._id}),0);
  for(const value of [-1,0.5,1000000001])await buyer.post('/api/products').send({...body,initialStock:value}).expect(400);
  assert.equal(await Product.countDocuments(),3);assert.equal(await Purchase.countDocuments(),0);assert.equal(await Sale.countDocuments(),0);
});

test('comprador y administrador ajustan cantidades con movimientos auditables sin crear compras ni ventas',async()=>{
  const p=await stocked(3),path='/api/products/'+p._id;
  const fields={name:p.name,category:p.category,netPrice:p.netPrice,vat:p.vat,tax:p.tax,margin:p.margin,minStock:p.minStock,salePrice:p.salePrice};
  await seller.patch(path).send({...fields,stock:7,expectedStock:3}).expect(403);
  await buyer.patch(path).send({...fields,stock:7,expectedStock:3,adjustmentReason:'Conteo físico'}).expect(200);
  await admin.patch(path).send({...fields,stock:0,expectedStock:7}).expect(200);
  const movements=await Movement.find({kind:'ajuste'}).sort({createdAt:1});
  assert.equal(movements.length,2);assert.deepEqual(movements.map(m=>m.quantity),[4,-7]);assert.equal(movements[0].reason,'Conteo físico');assert.equal(String(movements[0].user),String(users.Buyer._id));assert.match(movements[1].reference,/^AJU-/);
  const stored=await Product.findById(p._id);assert.equal(stored.stock,0);assert.equal(stored.code,p.code);assert.equal(stored.damaged,0);
  assert.equal(await Purchase.countDocuments(),1);assert.equal(await Sale.countDocuments(),0);
  await admin.patch(path).send({...fields,stock:0,expectedStock:0}).expect(200);assert.equal(await Movement.countDocuments({kind:'ajuste'}),2);
});
test('ajuste rechaza cantidades inválidas y no sobrescribe compras hechas después de abrir el formulario',async()=>{
  const p=await stocked(3),path='/api/products/'+p._id;
  const fields={name:p.name,netPrice:p.netPrice,vat:p.vat,tax:p.tax,margin:p.margin,minStock:p.minStock};
  for(const stock of [-1,1.5,1000000001])await buyer.patch(path).send({...fields,stock,expectedStock:3}).expect(400);
  await buyer.patch(path).send({...fields,stock:8}).expect(400);
  await buyer.post('/api/purchases').send(purchaseBody(p,2)).expect(201);
  await buyer.patch(path).send({...fields,name:'No debe guardarse',stock:8,expectedStock:3}).expect(409);
  assert.equal((await Product.findById(p._id)).stock,5);assert.equal((await Product.findById(p._id)).name,p.name);assert.equal(await Movement.countDocuments({kind:'ajuste'}),0);
});

test('eliminar y recuperar usuarios requiere administrador y protege la cuenta actual',async()=>{
  const path='/api/users/'+users.Seller._id;
  await request(app).delete(path).expect(401);await seller.delete(path).expect(403);await buyer.delete(path).expect(403);
  await buyer.post(path+'/restore').expect(403);
  await admin.delete('/api/users/'+users.Admin._id).expect(409);
  assert.equal((await User.findById(users.Admin._id)).active,true);
});
test('papelera conserva ventas, revoca sesiones y permite recuperar la cuenta sin reactivar acceso',async()=>{
  const p=await stocked(3);await seller.post('/api/sales').send(saleBody(p)).expect(201);
  await approveReset();
  const path='/api/users/'+users.Seller._id;
  await admin.delete(path).expect(200);await seller.get('/api/auth/me').expect(401);
  await request(app).post('/api/auth/login').send({username:'seller',password}).expect(401);
  const normal=await admin.get('/api/users').expect(200);assert.ok(!normal.body.items.some(u=>u._id===String(users.Seller._id)));
  const deleted=await admin.get('/api/users?archived=true').expect(200);assert.equal(deleted.body.total,1);assert.ok(deleted.body.items[0].deletedAt);
  const history=await admin.get('/api/sales').expect(200);assert.equal(history.body.items[0].user.name,'Seller');assert.equal(await Sale.countDocuments(),1);
  await recovery.post('/api/auth/password-reset/confirm').send(resetBody()).expect(400);
  await admin.patch(path).send({role:'vendedor',active:true}).expect(404);
  await admin.delete(path).expect(404);
  const restored=await admin.post(path+'/restore').expect(200);assert.equal(restored.body.user.active,false);assert.equal(restored.body.user.deletedAt,null);
  await request(app).post('/api/auth/login').send({username:'seller',password}).expect(401);
  await admin.patch(path).send({role:'vendedor',active:true}).expect(200);
  await request(app).post('/api/auth/login').send({username:'seller',password}).expect(200);
  await seller.get('/api/auth/me').expect(401);
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
  const created=await admin.post('/api/users').send({name:'Comprador 2',username:'buyer2',email:'buyer2@test.local',password,role:'comprador'}).expect(201);assert.equal(created.body.user.password,undefined);
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

let recovery;
const resetBody=(extra={})=>({username:'seller',password:'1234',confirmPassword:'1234',...extra});
test('solo administrador cambia claves directamente, valida límites y confirmación',async()=>{
  const path='/api/users/'+users.Seller._id+'/password',body={password:'5678',confirmPassword:'5678'};
  await request(app).put(path).send(body).expect(401);await buyer.put(path).send(body).expect(403);await seller.put(path).send(body).expect(403);
  for(const value of ['123','1234567890123'])await admin.put(path).send({password:value,confirmPassword:value}).expect(400);
  await admin.put(path).send({...body,confirmPassword:'9999'}).expect(400);
  await admin.put(path).send({...body,role:'administrador'}).expect(400);
  await seller.get('/api/auth/me').expect(200);
});
test('administrador cambia clave ajena, consume recuperación y revoca sesiones sin cambiar rol',async()=>{
  await approveReset();
  const result=await admin.put('/api/users/'+users.Seller._id+'/password').send({password:'5678',confirmPassword:'5678'}).expect(200);
  assert.equal(result.body.currentSessionEnded,false);assert.equal(result.body.password,undefined);
  await seller.get('/api/auth/me').expect(401);await admin.get('/api/auth/me').expect(200);
  await request(app).post('/api/auth/login').send({username:'seller',password:'5678'}).expect(200);
  await recovery.post('/api/auth/password-reset/confirm').send(resetBody()).expect(400);
  const user=await User.findById(users.Seller._id).select('+password');
  assert.equal(user.role,'vendedor');assert.equal(user.passwordResetApprovedAt,null);assert.ok(await bcrypt.compare('5678',user.password));
});
test('administrador puede cambiar su propia clave y debe iniciar sesión nuevamente',async()=>{
  const result=await admin.put('/api/users/'+users.Admin._id+'/password').send({password:'jefe123',confirmPassword:'jefe123'}).expect(200);
  assert.equal(result.body.currentSessionEnded,true);assert.match(result.headers['set-cookie'][0],/session=;/);
  await admin.get('/api/auth/me').expect(401);
  await request(app).post('/api/auth/login').send({username:'admin',password:'jefe123'}).expect(200);
});
const askReset=async()=>{recovery=request.agent(app);await recovery.post('/api/auth/password-reset/request').send({username:'seller'}).expect(202);};
const approveReset=async()=>{await askReset();return (await admin.post('/api/users/'+users.Seller._id+'/password-reset').expect(201)).body;};

test('solicitud genérica, aprobación sin vencimiento y sin credenciales ni códigos',async()=>{
  const known=await request(app).post('/api/auth/password-reset/request').send({username:'seller'}).expect(202);
  const unknown=await request(app).post('/api/auth/password-reset/request').send({username:'missing'}).expect(202);
  assert.deepEqual(known.body,unknown.body);
  const grant=await admin.post('/api/users/'+users.Seller._id+'/password-reset').expect(201);
  assert.equal(grant.body.expiresAt,null);assert.ok(grant.body.approvedAt);assert.equal(grant.body.code,undefined);
  const listed=(await admin.get('/api/users')).body.items.find(u=>u._id===String(users.Seller._id));
  assert.ok(listed.passwordResetApprovedAt);assert.equal(listed.passwordResetRequestHash,undefined);assert.equal(listed.passwordResetApprovedBy,undefined);assert.equal(listed.password,undefined);
});
test('solo administrador autoriza solicitudes pendientes de otras cuentas',async()=>{
  const path='/api/users/'+users.Seller._id+'/password-reset';
  await request(app).post(path).expect(401);await seller.post(path).expect(403);await buyer.post(path).expect(403);await seller.delete(path).expect(403);
  await admin.post(path).expect(409);
  await admin.post('/api/users/'+users.Admin._id+'/password-reset').expect(409);
  await User.updateOne({_id:users.Seller._id},{$set:{active:false}});await admin.post(path).expect(404);
});
test('cambio autorizado desde el navegador solicitante consume autorización y revoca sesiones',async()=>{
  const second=request.agent(app);await second.post('/api/auth/login').send({username:'seller',password}).expect(200);
  await approveReset();
  await request(app).post('/api/auth/password-reset/confirm').send(resetBody()).expect(400);
  await recovery.post('/api/auth/password-reset/confirm').send(resetBody()).expect(200);
  await seller.get('/api/auth/me').expect(401);await second.get('/api/auth/me').expect(401);
  await request(app).post('/api/auth/login').send({username:'seller',password}).expect(401);
  await request(app).post('/api/auth/login').send({username:'seller',password:'1234'}).expect(200);
  await recovery.post('/api/auth/password-reset/confirm').send(resetBody()).expect(400);
  const stored=await User.findById(users.Seller._id).select('+password +passwordResetRequestHash');
  assert.ok(await bcrypt.compare('1234',stored.password));assert.equal(stored.passwordResetRequestHash,undefined);assert.equal(stored.passwordResetApprovedAt,null);
});
test('una autorización antigua sigue válida y otro navegador no puede apropiársela',async()=>{
  await approveReset();
  await User.updateOne({_id:users.Seller._id},{$set:{passwordResetApprovedAt:new Date('2020-01-01')}});
  const stranger=request.agent(app);await stranger.post('/api/auth/password-reset/request').send({username:'seller'}).expect(202);
  await stranger.post('/api/auth/password-reset/confirm').send(resetBody()).expect(400);
  await recovery.post('/api/auth/password-reset/confirm').send(resetBody()).expect(200);
});
test('revocación, cambios de permisos y administrador inactivo invalidan la autorización',async()=>{
  await approveReset();await admin.delete('/api/users/'+users.Seller._id+'/password-reset').expect(200);
  await recovery.post('/api/auth/password-reset/confirm').send(resetBody()).expect(400);
  await approveReset();await admin.patch('/api/users/'+users.Seller._id).send({role:'comprador',active:true}).expect(200);
  await recovery.post('/api/auth/password-reset/confirm').send(resetBody()).expect(400);
  await approveReset();await User.updateOne({_id:users.Admin._id},{$set:{active:false}});
  await recovery.post('/api/auth/password-reset/confirm').send(resetBody()).expect(400);
});
test('contraseñas de 4 a 12 caracteres sin complejidad y confirmación obligatoria',async()=>{
  await approveReset();
  for(const value of ['123','1234567890123'])await recovery.post('/api/auth/password-reset/confirm').send(resetBody({password:value,confirmPassword:value})).expect(400);
  await recovery.post('/api/auth/password-reset/confirm').send(resetBody({confirmPassword:'5678'})).expect(400);
  await recovery.post('/api/auth/password-reset/confirm').send(resetBody({adminUsername:'admin',adminPassword:password})).expect(400);
  await recovery.post('/api/auth/password-reset/confirm').send(resetBody({password:'123456789012',confirmPassword:'123456789012'})).expect(200);
  for(const [i,value] of ['abcd','123','1234567890123'].entries())await request(app).post('/api/auth/register').send({name:'Prueba',username:'simple'+i,email:'simple'+i+'@test.local',password:value}).expect(i===0?201:400);
});
test('dos intentos simultáneos consumen la autorización una sola vez',async()=>{
  await approveReset();
  const cookie=await recovery.get('/api/auth/me');
  // The agent retains its recovery cookie for both in-flight requests.
  const results=await Promise.all([recovery.post('/api/auth/password-reset/confirm').send(resetBody()),recovery.post('/api/auth/password-reset/confirm').send(resetBody())]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
});
test('las notificaciones de recuperación son privadas del administrador y se retiran al autorizar',async()=>{
  const endpoint='/api/users/password-reset/requests';
  await request(app).get(endpoint).expect(401);await seller.get(endpoint).expect(403);await buyer.get(endpoint).expect(403);
  await askReset();
  const pending=await admin.get(endpoint).expect(200);
  assert.equal(pending.body.total,1);assert.equal(pending.body.items[0].username,'seller');
  assert.equal(pending.body.items[0].passwordResetRequestHash,undefined);assert.equal(pending.body.items[0].password,undefined);
  await admin.post('/api/users/'+users.Seller._id+'/password-reset').expect(201);
  assert.equal((await admin.get(endpoint)).body.total,0);
});
test('las contraseñas anteriores de más de doce caracteres conservan el acceso',async()=>{
  const old='AnteriorDeMasDeDoce';
  await User.create({name:'Anterior',username:'anterior',email:'anterior@test.local',password:await bcrypt.hash(old,4)});
  await request(app).post('/api/auth/login').send({username:'anterior',password:old}).expect(200);
});

test('nombre de usuario único, normalizado y separado del correo de contacto',async()=>{
  const account={name:'Juan Pérez',username:'Juan.Perez',email:'contacto@test.local',password};
  const created=await request(app).post('/api/auth/register').send(account).expect(201);assert.equal(created.body.user.username,'juan.perez');assert.equal(created.body.user.email,'contacto@test.local');
  await request(app).post('/api/auth/login').send({username:'JUAN.PEREZ',password}).expect(200);
  await request(app).post('/api/auth/login').send({email:'contacto@test.local',password}).expect(400);
  await request(app).post('/api/auth/login').send({username:'contacto@test.local',password}).expect(400);
  await request(app).post('/api/auth/register').send({...account,username:'JUAN.PEREZ',email:'otrocontacto@test.local'}).expect(409);
  await request(app).post('/api/auth/register').send({...account,username:'nombre con espacios',email:'otrocontacto@test.local'}).expect(400);
  const updated=await admin.patch(`/api/users/${users.Seller._id}`).send({username:'nuevo.vendedor',role:'vendedor',active:true}).expect(200);assert.equal(updated.body.user.username,'nuevo.vendedor');
  await seller.get('/api/auth/me').expect(401);
  await request(app).post('/api/auth/login').send({username:'seller',password}).expect(401);
  await request(app).post('/api/auth/login').send({username:'nuevo.vendedor',password}).expect(200);
});
test('migración asigna usuarios sin cambiar contraseñas y resuelve nombres repetidos',async()=>{
  const {migrateUsernames}=await import('../src/usernames.js');
  const hashed=await bcrypt.hash(password,4);
  const inserted=await User.collection.insertMany([
    {name:'Administrador anterior',email:'legacyadmin@test.local',password:hashed,role:'administrador',active:true,tokenVersion:0},
    {name:'María Pérez',email:'maria1@test.local',password:hashed,role:'vendedor',active:true,tokenVersion:0},
    {name:'María Pérez',email:'maria2@test.local',password:hashed,role:'comprador',active:true,tokenVersion:0}
  ]);
  const migration=await migrateUsernames(User,{adminEmail:'legacyadmin@test.local',adminUsername:'jefe'});assert.equal(migration.length,3);
  const legacyAdmin=await User.findById(inserted.insertedIds[0]).select('+password');assert.equal(legacyAdmin.username,'jefe');assert.equal(legacyAdmin.password,hashed);
  const first=await User.findById(inserted.insertedIds[1]),second=await User.findById(inserted.insertedIds[2]);assert.equal(first.username,'maria.perez');assert.equal(second.username,'maria.perez_2');
  assert.deepEqual(await migrateUsernames(User,{adminEmail:'legacyadmin@test.local',adminUsername:'jefe'}),[]);
  await request(app).post('/api/auth/login').send({username:'jefe',password}).expect(200);
});
