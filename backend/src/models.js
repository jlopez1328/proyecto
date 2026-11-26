import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const money = {type: Number, min: 0, required: true};
const count = {type: Number, min: 0, default: 0, validate: Number.isSafeInteger};
const userSchema = new Schema({
  name: {type: String, required: true, trim: true},
  email: {type: String, required: true, lowercase: true, trim: true, unique: true},
  password: {type: String, required: true, select: false},
  role: {type: String, enum: ['vendedor', 'comprador', 'administrador'], default: 'vendedor'},
  active: {type: Boolean, default: true},
  passwordResetRequestedAt: {type: Date, default: null},
  passwordResetExpiresAt: {type: Date, default: null},
  passwordResetHash: {type: String, select: false},
  passwordResetApprovedBy: {type: Schema.Types.ObjectId, ref: 'User', select: false},
  tokenVersion: {type: Number, default: 0}
}, {timestamps: true});
userSchema.set('toJSON', {transform: (_, ret) => { delete ret.password; delete ret.tokenVersion; delete ret.passwordResetHash; delete ret.passwordResetApprovedBy; return ret; }});
export const User = model('User', userSchema);
export const Counter = model('Counter', new Schema({_id: String, seq: {type: Number, default: 0}}));
export const Product = model('Product', new Schema({
  code: {type: String, unique: true, required: true},
  name: {type: String, required: true, trim: true, index: true},
  category: {type: String, default: 'General'},
  netPrice: money, vat: {type: Number, min: 0, max: 100, default: 19},
  tax: {type: Number, min: 0, max: 100, default: 0},
  margin: {type: Number, min: 0, max: 1000, default: 30},
  suggestedPrice: money, salePrice: money,
  stock: count, damaged: count, minStock: {...count, default: 5},
  active: {type: Boolean, default: true}
}, {timestamps: true}));
const line = new Schema({
  product: {type: Schema.Types.ObjectId, ref: 'Product', required: true},
  code: String, name: String, quantity: {type: Number, required: true, min: 1},
  unitPrice: money, discount: {type: Number, default: 0},
  netPrice: Number, vat: Number, tax: Number, margin: Number,
  subtotal: money, total: money
}, {_id: false});
const operation = {
  requestHash: {type: String, required: true},
  requestId: {type: String, unique: true, required: true},
  number: {type: String, unique: true, required: true},
  user: {type: Schema.Types.ObjectId, ref: 'User', required: true},
  lines: {type: [line], required: true}, subtotal: money, total: money,
  discount: {type: Number, default: 0}, note: {type: String, default: ''}
};
const saleSchema = new Schema({...operation, customer: {type: String, default: 'Consumidor final'}}, {timestamps: true});
saleSchema.index({createdAt: -1});
export const Sale = model('Sale', saleSchema);
const purchaseSchema = new Schema({...operation, supplier: {type: String, required: true}}, {timestamps: true});
purchaseSchema.index({createdAt: -1});
export const Purchase = model('Purchase', purchaseSchema);
const movementSchema = new Schema({
  requestId: {type: String, unique: true, sparse: true},
  product: {type: Schema.Types.ObjectId, ref: 'Product', required: true},
  user: {type: Schema.Types.ObjectId, ref: 'User', required: true},
  kind: {type: String, enum: ['compra', 'venta', 'daño'], required: true},
  quantity: {type: Number, required: true}, reason: String,
  reference: {type: String, required: true}
}, {timestamps: true});
movementSchema.index({createdAt: -1});
export const Movement = model('Movement', movementSchema);
export async function nextCode(key, prefix, session) {
  const value = await Counter.findOneAndUpdate({_id: key}, {$inc: {seq: 1}}, {new: true, upsert: true, session});
  return `${prefix}-${String(value.seq).padStart(6, '0')}`;
}
export async function initializeDatabase() {
  await Promise.all([User.init(), Product.init(), Sale.init(), Purchase.init(), Movement.init()]);
  for (const key of ['product', 'sale', 'purchase', 'damage']) await Counter.updateOne({_id: key}, {$setOnInsert: {seq: 0}}, {upsert: true});
}
