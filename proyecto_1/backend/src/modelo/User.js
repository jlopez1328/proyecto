import mongoose from 'mongoose';
const {Schema, model}=mongoose;
import {usernamePattern} from '../usernames.js';
const userSchema = new Schema({
  name: {type: String, required: true, trim: true},
  username: {type: String, required: true, lowercase: true, trim: true, match: usernamePattern},
  email: {type: String, required: true, lowercase: true, trim: true, unique: true},
  password: {type: String, required: true, select: false},
  role: {type: String, enum: ['vendedor', 'comprador', 'administrador'], default: 'vendedor'},
  active: {type: Boolean, default: true},
  deletedAt: {type: Date, default: null},
  passwordResetRequestedAt: {type: Date, default: null},
  passwordResetExpiresAt: {type: Date, default: null},
  passwordResetApprovedAt: {type: Date, default: null},
  passwordResetRequestHash: {type: String, select: false},
  // Solo para limpiar códigos de versiones previas; el flujo actual no los utiliza.
  passwordResetHash: {type: String, select: false},
  passwordResetApprovedBy: {type: Schema.Types.ObjectId, ref: 'User', select: false},
  tokenVersion: {type: Number, default: 0}
}, {timestamps: true});
userSchema.index({username: 1}, {unique: true, partialFilterExpression: {username: {$type: 'string'}}});
userSchema.set('toJSON', {transform: (_, ret) => { delete ret.password; delete ret.tokenVersion; delete ret.passwordResetHash; delete ret.passwordResetRequestHash; delete ret.passwordResetApprovedBy; return ret; }});
export const User = model('User', userSchema);
