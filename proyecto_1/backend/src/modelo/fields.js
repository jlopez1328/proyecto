import mongoose from 'mongoose';
const {Schema, model}=mongoose;
export const money = {type: Number, min: 0, required: true};
export const count = {type: Number, min: 0, default: 0, validate: Number.isSafeInteger};
const line = new Schema({
  product: {type: Schema.Types.ObjectId, ref: 'Product', required: true},
  code: String, name: String, quantity: {type: Number, required: true, min: 1},
  unitPrice: money, discount: {type: Number, default: 0},
  netPrice: Number, vat: Number, tax: Number, margin: Number,
  subtotal: money, total: money
}, {_id: false});
export const operation = {
  requestHash: {type: String, required: true},
  requestId: {type: String, unique: true, required: true},
  number: {type: String, unique: true, required: true},
  user: {type: Schema.Types.ObjectId, ref: 'User', required: true},
  lines: {type: [line], required: true}, subtotal: money, total: money,
  discount: {type: Number, default: 0}, note: {type: String, default: ''}
};
