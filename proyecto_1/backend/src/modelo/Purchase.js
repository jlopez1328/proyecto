import mongoose from 'mongoose';
const {Schema, model}=mongoose;
import {operation} from './fields.js';
const purchaseSchema = new Schema({...operation, supplier: {type: String, required: true}}, {timestamps: true});
purchaseSchema.index({createdAt: -1});
export const Purchase = model('Purchase', purchaseSchema);
