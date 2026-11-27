import mongoose from 'mongoose';
const {Schema, model}=mongoose;
export const Counter = model('Counter', new Schema({_id: String, seq: {type: Number, default: 0}}));
