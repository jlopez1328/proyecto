import mongoose from 'mongoose';
const {Schema, model}=mongoose;
const movementSchema = new Schema({
  requestId: {type: String, unique: true, sparse: true},
  product: {type: Schema.Types.ObjectId, ref: 'Product', required: true},
  user: {type: Schema.Types.ObjectId, ref: 'User', required: true},
  kind: {type: String, enum: ['compra', 'venta', 'daño', 'ajuste'], required: true},
  quantity: {type: Number, required: true}, reason: String,
  reference: {type: String, required: true}
}, {timestamps: true});
movementSchema.index({createdAt: -1});
export const Movement = model('Movement', movementSchema);
