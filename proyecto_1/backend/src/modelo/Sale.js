import mongoose from 'mongoose';
const {Schema, model}=mongoose;
import {operation} from './fields.js';
const saleSchema = new Schema({...operation, customer: {type: String, default: 'Consumidor final'}}, {timestamps: true});
saleSchema.index({createdAt: -1});
export const Sale = model('Sale', saleSchema);
