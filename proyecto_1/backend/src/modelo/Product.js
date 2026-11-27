import mongoose from 'mongoose';
const {Schema, model}=mongoose;
import {money,count} from './fields.js';
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
