import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { ZodError } from 'zod';
import { config } from './config.js';
import { User, Product, Sale, Purchase, Movement, nextCode } from './models.js';
import { authenticate, allow, issueToken, cookieOptions } from './auth.js';
import { ApiError, round, cost, suggested, saleTotals } from './domain.js';
import * as v from './validation.js';
import { openapi } from './openapi.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({origin: (origin, done) => done(null, !origin || config.origins.includes(origin)), credentials: true}));
app.use(express.json({limit: '150kb'}));
app.use(cookieParser());
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin && !config.origins.includes(req.headers.origin)) return next(new ApiError(403, 'Origen no permitido.'));
  next();
});
app.use('/api', rateLimit({windowMs: 60000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false, message: {error: 'Demasiadas solicitudes. Espera un minuto.'}}));
const authLimit = rateLimit({windowMs: 15 * 60000, limit: process.env.NODE_ENV === 'test' ? 200 : 30, standardHeaders: 'draft-8', legacyHeaders: false, message: {error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.'}});
const resetLimit = rateLimit({windowMs: 15 * 60000, limit: process.env.NODE_ENV === 'test' ? 200 : 15, standardHeaders: 'draft-8', legacyHeaders: false, message: {error: 'Demasiados intentos de recuperación. Intenta de nuevo en 15 minutos.'}});
const dummyPasswordHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxloUp3B/Vm1W5p2vV.R6l5tG3K';
const resetFields = {passwordResetRequestedAt: null, passwordResetExpiresAt: null};
function clearSession(res) {
  const {maxAge, ...options} = cookieOptions;
  res.clearCookie('session', options);
}
const admin = allow('administrador');
const inventory = allow('comprador', 'administrador');
const sales = allow('vendedor', 'administrador');
const hash = body => createHash('sha256').update(JSON.stringify(body)).digest('hex');
const transaction = work => mongoose.connection.transaction(work, {readPreference: 'primary', writeConcern: {w: 'majority'}, maxCommitTimeMS: 15000});
const escaped = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const publicProduct = p => ({_id: p._id, code: p.code, name: p.name, category: p.category, salePrice: p.salePrice, stock: p.stock, minStock: p.minStock});

app.get('/api/health', (req, res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({status: mongoose.connection.readyState === 1 ? 'ok' : 'unavailable'}));
app.get('/api/openapi.json', (req, res) => res.json(openapi));
app.use('/api/docs', (req, res, next) => {res.removeHeader('Content-Security-Policy'); next();}, swaggerUi.serve, swaggerUi.setup(openapi, {swaggerOptions: {persistAuthorization: false}}));
app.post('/api/auth/register', authLimit, async (req, res) => {
  const data = v.registration.parse(req.body);
  const user = await User.create({...data, role: 'vendedor', password: await bcrypt.hash(data.password, 12)});
  res.status(201).json({user: issueToken(user, res)});
});
app.post('/api/auth/login', authLimit, async (req, res) => {
  const data = v.credentials.parse(req.body);
  const user = await User.findOne({username: data.username}).select('+password');
  // A fixed valid hash keeps bcrypt work comparable for unknown users.
  const valid = await bcrypt.compare(data.password, user?.password || dummyPasswordHash);
  if (!user?.active || !valid) throw new ApiError(401, 'Usuario o contraseña incorrectos.');
  res.json({user: issueToken(user, res)});
});
app.get('/api/auth/me', authenticate, (req, res) => res.json({user: req.user}));
app.post('/api/auth/password-reset/request', resetLimit, async (req, res) => {
  const {username} = v.resetRequest.parse(req.body);
  const now = new Date();
  await User.updateOne({username, active: true, $and: [
    {$or: [{passwordResetExpiresAt: null}, {passwordResetExpiresAt: {$lte: now}}]},
    {$or: [{passwordResetRequestedAt: null}, {passwordResetRequestedAt: {$lte: new Date(now.getTime() - 60000)}}]}
  ]}, {$set: {passwordResetRequestedAt: now}});
  res.status(202).json({message: 'Si la cuenta está activa, el administrador podrá habilitar el cambio. Pídele que complete personalmente la autorización con su nombre de usuario y contraseña.'});
});
app.post('/api/auth/password-reset/confirm', resetLimit, async (req, res) => {
  const data = v.resetPassword.parse(req.body);
  const administrator = await User.findOne({username: data.adminUsername}).select('+password');
  const valid = await bcrypt.compare(data.adminPassword, administrator?.password || dummyPasswordHash);
  if (!valid || !administrator?.active || administrator.role !== 'administrador') throw new ApiError(401, 'Usuario o contraseña del administrador incorrectos, o cuenta sin permiso.');
  if (data.username === data.adminUsername) throw new ApiError(409, 'Otro administrador debe autorizar la recuperación de tu cuenta.');
  const filter = {username: data.username, active: true, passwordResetApprovedBy: {$ne: null}, passwordResetExpiresAt: {$gt: new Date()}};
  const authorization = await User.findOne(filter).select('passwordResetExpiresAt +passwordResetApprovedBy');
  if (!authorization) throw new ApiError(400, 'El cambio no está habilitado o la autorización venció. Solicita al administrador que lo habilite en Usuarios.');
  const password = await bcrypt.hash(data.password, 12);
  if (!(await User.exists({_id: administrator._id, active: true, role: 'administrador', password: administrator.password, tokenVersion: administrator.tokenVersion}))) throw new ApiError(401, 'La autorización del administrador cambió. Verifica sus credenciales nuevamente.');
  const user = await User.findOneAndUpdate({_id: authorization._id, active: true, passwordResetApprovedBy: authorization.passwordResetApprovedBy, passwordResetExpiresAt: {$eq: authorization.passwordResetExpiresAt, $gt: new Date()}}, {$set: {password, ...resetFields}, $unset: {passwordResetHash: '', passwordResetApprovedBy: ''}, $inc: {tokenVersion: 1}}, {new: true});
  if (!user) throw new ApiError(400, 'La autorización venció, cambió o ya fue utilizada. Solicita una nueva habilitación.');
  clearSession(res);
  res.json({message: 'Contraseña actualizada. Inicia sesión con tu nueva contraseña. Se cerraron las sesiones anteriores.'});
});
app.post('/api/auth/logout', authenticate, async (req, res) => {
  await User.updateOne({_id: req.user._id}, {$inc: {tokenVersion: 1}});
  clearSession(res);
  res.json({message: 'Sesión cerrada en todos tus dispositivos.'});
});
app.get('/api/users', authenticate, admin, async (req, res) => {
  const {page, limit, search} = v.listQuery.parse(req.query);
  const query = search ? {$or: [{name: new RegExp(escaped(search), 'i')}, {username: new RegExp(escaped(search), 'i')}, {email: new RegExp(escaped(search), 'i')}]} : {};
  const [items, total] = await Promise.all([User.find(query).sort({createdAt: -1}).skip((page - 1) * limit).limit(limit), User.countDocuments(query)]);
  res.json({items, total, page, limit});
});
app.post('/api/users', authenticate, admin, async (req, res) => {
  const data = v.userCreation.parse(req.body);
  const user = await User.create({...data, password: await bcrypt.hash(data.password, 12)});
  res.status(201).json({user});
});
app.patch('/api/users/:id', authenticate, admin, async (req, res) => {
  const id = v.parseId(req.params.id), data = v.userUpdate.parse(req.body);
  if (id === String(req.user._id)) throw new ApiError(409, 'No puedes modificar tu propia cuenta. Otro administrador debe hacerlo.');
  const user = await User.findByIdAndUpdate(id, {$set: {...data, ...resetFields}, $unset: {passwordResetHash: '', passwordResetApprovedBy: ''}, $inc: {tokenVersion: 1}}, {new: true, runValidators: true});
  if (!user) throw new ApiError(404, 'Usuario no encontrado.');
  res.json({user});
});
app.post('/api/users/:id/password-reset', authenticate, admin, async (req, res) => {
  const id = v.parseId(req.params.id);
  if (id === String(req.user._id)) throw new ApiError(409, 'Otro administrador debe habilitar la recuperación de tu cuenta.');
  const expiresAt = new Date(Date.now() + 15 * 60000);
  const user = await User.findOneAndUpdate({_id: id, active: true}, {$set: {passwordResetRequestedAt: null, passwordResetExpiresAt: expiresAt, passwordResetApprovedBy: req.user._id}, $unset: {passwordResetHash: ''}}, {new: true});
  if (!user) throw new ApiError(404, 'Usuario activo no encontrado.');
  res.status(201).json({expiresAt, user: {_id: user._id, name: user.name, username: user.username, email: user.email}});
});
app.delete('/api/users/:id/password-reset', authenticate, admin, async (req, res) => {
  const id = v.parseId(req.params.id);
  if (id === String(req.user._id)) throw new ApiError(409, 'Otro administrador debe gestionar la recuperación de tu cuenta.');
  const user = await User.findByIdAndUpdate(id, {$set: resetFields, $unset: {passwordResetHash: '', passwordResetApprovedBy: ''}});
  if (!user) throw new ApiError(404, 'Usuario no encontrado.');
  res.json({message: 'Cambio de contraseña revocado. La autorización anterior ya no es válida.'});
});
async function listProducts(req, res, catalog = false) {
  const {search, page, limit} = v.listQuery.parse(req.query);
  const query = {active: true};
  if (search) query.$or = [{name: new RegExp(escaped(search), 'i')}, {code: new RegExp(escaped(search), 'i')}];
  const [items, total] = await Promise.all([Product.find(query).sort({code: 1}).skip((page - 1) * limit).limit(limit).lean(), Product.countDocuments(query)]);
  res.json({items: catalog ? items.map(publicProduct) : items, total, page, limit});
}
app.get('/api/catalog', authenticate, sales, (req, res) => listProducts(req, res, true));
app.get('/api/products', authenticate, inventory, (req, res) => listProducts(req, res));
app.post('/api/products', authenticate, inventory, async (req, res) => {
  const data = v.productInput.parse(req.body);
  const product = await transaction(async session => {
    const code = await nextCode('product', 'PRD', session);
    const suggestedPrice = suggested(data.netPrice, data.vat, data.tax, data.margin);
    const [p] = await Product.create([{...data, code, suggestedPrice, salePrice: data.salePrice ?? suggestedPrice}], {session});
    return p;
  });
  res.status(201).json({product});
});
app.patch('/api/products/:id', authenticate, inventory, async (req, res) => {
  const data = v.productInput.parse(req.body), id = v.parseId(req.params.id);
  const suggestedPrice = suggested(data.netPrice, data.vat, data.tax, data.margin);
  const product = await Product.findOneAndUpdate({_id: id, active: true}, {...data, suggestedPrice, salePrice: data.salePrice ?? suggestedPrice}, {new: true, runValidators: true});
  if (!product) throw new ApiError(404, 'Producto no encontrado.');
  res.json({product});
});
app.delete('/api/products/:id', authenticate, inventory, async (req, res) => {
  const id = v.parseId(req.params.id);
  const product = await Product.findOneAndUpdate({_id: id, active: true, stock: 0}, {active: false}, {new: true});
  if (!product) throw new ApiError(409, 'Solo se pueden eliminar productos activos sin existencias. Registra antes sus salidas.');
  res.json({message: 'Producto archivado. Su historial se conserva.'});
});
app.post('/api/products/:id/damage', authenticate, inventory, async (req, res) => {
  const id = v.parseId(req.params.id), data = v.damageInput.parse(req.body);
  const movement = await transaction(async session => {
    const previous = await Movement.findOne({requestId: data.requestId}).session(session);
    if (previous) {
      if (String(previous.user) !== String(req.user._id) || String(previous.product) !== id || previous.quantity !== -data.quantity || previous.reason !== data.reason) throw new ApiError(409, 'Identificador de solicitud ya utilizado.');
      return previous;
    }
    const p = await Product.findOneAndUpdate({_id: id, active: true, stock: {$gte: data.quantity}}, {$inc: {stock: -data.quantity, damaged: data.quantity}}, {session, new: true});
    if (!p) throw new ApiError(409, 'Producto inexistente o existencias insuficientes.');
    const reference = await nextCode('damage', 'DAN', session);
    const [m] = await Movement.create([{product: id, user: req.user._id, kind: 'daño', quantity: -data.quantity, reason: data.reason, requestId: data.requestId, reference}], {session});
    return m;
  });
  res.status(201).json({movement});
});
async function priorOperation(Model, data, user, session) {
  const previous = await Model.findOne({requestId: data.requestId}).session(session);
  if (previous && (String(previous.user) !== String(user._id) || previous.requestHash !== hash(data))) throw new ApiError(409, 'Identificador de solicitud ya utilizado con otros datos.');
  return previous;
}
app.post('/api/sales', authenticate, sales, async (req, res) => {
  const data = v.saleInput.parse(req.body);
  const sale = await transaction(async session => {
    const previous = await priorOperation(Sale, data, req.user, session);
    if (previous) return previous;
    const number = await nextCode('sale', 'VEN', session), lines = [];
    for (const item of data.lines) {
      const p = await Product.findOneAndUpdate({_id: item.product, active: true, stock: {$gte: item.quantity}}, {$inc: {stock: -item.quantity}}, {new: true, session});
      if (!p) throw new ApiError(409, 'Existencias insuficientes o producto no disponible. Actualiza el catálogo.');
      lines.push({...item, code: p.code, name: p.name, unitPrice: p.salePrice, subtotal: round(p.salePrice * item.quantity), total: round(p.salePrice * item.quantity * (1 - item.discount / 100))});
      await Movement.create([{product: p._id, user: req.user._id, kind: 'venta', quantity: -item.quantity, reference: number}], {session});
    }
    const [s] = await Sale.create([{...data, number, user: req.user._id, requestHash: hash(data), lines, ...saleTotals(lines, data.discount)}], {session});
    return s;
  });
  res.status(201).json({sale});
});
app.post('/api/purchases', authenticate, inventory, async (req, res) => {
  const data = v.purchaseInput.parse(req.body);
  const purchase = await transaction(async session => {
    const previous = await priorOperation(Purchase, data, req.user, session);
    if (previous) return previous;
    const number = await nextCode('purchase', 'COM', session), lines = [];
    for (const item of data.lines) {
      const suggestedPrice = suggested(item.netPrice, item.vat, item.tax, item.margin);
      const p = await Product.findOneAndUpdate({_id: item.product, active: true, stock: {$lte: 1000000000 - item.quantity}}, {$inc: {stock: item.quantity}, $set: {netPrice: item.netPrice, vat: item.vat, tax: item.tax, margin: item.margin, suggestedPrice, salePrice: suggestedPrice}}, {session, new: true, runValidators: true});
      if (!p) throw new ApiError(409, 'Producto no disponible o límite de existencias excedido.');
      lines.push({...item, code: p.code, name: p.name, unitPrice: cost(item.netPrice, item.vat, item.tax), subtotal: round(item.netPrice * item.quantity), total: round(cost(item.netPrice, item.vat, item.tax) * item.quantity)});
      await Movement.create([{product: p._id, user: req.user._id, kind: 'compra', quantity: item.quantity, reference: number}], {session});
    }
    const [p] = await Purchase.create([{...data, number, user: req.user._id, requestHash: hash(data), lines, subtotal: round(lines.reduce((sum, l) => sum + l.subtotal, 0)), total: round(lines.reduce((sum, l) => sum + l.total, 0))}], {session});
    return p;
  });
  res.status(201).json({purchase});
});
async function history(Model, req, res, sale = false) {
  const {page, limit, search} = v.listQuery.parse(req.query);
  const query = sale && req.user.role === 'vendedor' ? {user: req.user._id} : {};
  if (search) query.number = new RegExp(escaped(search), 'i');
  const [items, total] = await Promise.all([Model.find(query).sort({createdAt: -1}).skip((page - 1) * limit).limit(limit).populate('user', 'name role').select('-requestHash'), Model.countDocuments(query)]);
  res.json({items, total, page, limit});
}
app.get('/api/sales', authenticate, sales, (req, res) => history(Sale, req, res, true));
app.get('/api/purchases', authenticate, inventory, (req, res) => history(Purchase, req, res));
app.get('/api/movements', authenticate, inventory, async (req, res) => {
  const {page, limit} = v.listQuery.parse(req.query);
  const [items, total] = await Promise.all([Movement.find().sort({createdAt: -1}).skip((page - 1) * limit).limit(limit).populate('product', 'code name').populate('user', 'name'), Movement.countDocuments()]);
  res.json({items, total, page, limit});
});
app.get('/api/reports', authenticate, async (req, res) => {
  const {year} = v.monthQuery.parse(req.query);
  const isSeller = req.user.role === 'vendedor';
  // Boundaries and grouping share the business time zone (America/Bogota).
  const range = {createdAt: {$gte: new Date(`${year}-01-01T00:00:00-05:00`), $lt: new Date(`${year + 1}-01-01T00:00:00-05:00`)}};
  const grouped = (Model, extra = {}) => Model.aggregate([{$match: {...range, ...extra}}, {$group: {_id: {$month: {date: '$createdAt', timezone: 'America/Bogota'}}, total: {$sum: '$total'}, count: {$sum: 1}, units: {$sum: {$sum: '$lines.quantity'}}}}]);
  const [salesData, purchasesData, stockData] = await Promise.all([
    grouped(Sale, isSeller ? {user: req.user._id} : {}),
    isSeller ? [] : grouped(Purchase),
    isSeller ? [] : Product.aggregate([{$match: {active: true}}, {$group: {_id: null, products: {$sum: 1}, units: {$sum: '$stock'}, damaged: {$sum: '$damaged'}, value: {$sum: {$multiply: ['$stock', '$netPrice']}}, low: {$sum: {$cond: [{$lte: ['$stock', '$minStock']}, 1, 0]}}}}])
  ]);
  const months = Array.from({length: 12}, (_, i) => ({month: i + 1, sales: round(salesData.find(s => s._id === i + 1)?.total || 0), saleCount: salesData.find(s => s._id === i + 1)?.count || 0, saleUnits: salesData.find(s => s._id === i + 1)?.units || 0, ...(!isSeller ? {purchases: round(purchasesData.find(p => p._id === i + 1)?.total || 0), purchaseCount: purchasesData.find(p => p._id === i + 1)?.count || 0} : {})}));
  const stock = stockData[0];
  res.json({year, months, ...(!isSeller ? {inventory: {products: stock?.products || 0, units: stock?.units || 0, damaged: stock?.damaged || 0, value: round(stock?.value || 0), low: stock?.low || 0}} : {})});
});
const frontendDist = fileURLToPath(new URL('../../frontend/dist/', import.meta.url));
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('/{*path}', (req, res, next) => req.path.startsWith('/api') ? next() : res.sendFile(`${frontendDist}/index.html`));
}
app.use((req, res) => res.status(404).json({error: 'Ruta no encontrada.'}));
app.use((error, req, res, next) => {
  if (error instanceof ZodError) return res.status(400).json({error: 'Revisa los datos enviados.', details: error.issues.map(i => ({field: i.path.join('.'), message: i.message}))});
  if (error.code === 11000) return res.status(409).json({error: 'El nombre de usuario, correo o identificador de solicitud ya existe.'});
  if (error.type === 'entity.parse.failed') return res.status(400).json({error: 'JSON inválido.'});
  if (error.type === 'entity.too.large') return res.status(413).json({error: 'Solicitud demasiado grande.'});
  if (error.status) return res.status(error.status).json({error: error.message});
  if (process.env.NODE_ENV !== 'test') console.error(error);
  res.status(500).json({error: 'No fue posible completar la operación. Intenta de nuevo.'});
});
