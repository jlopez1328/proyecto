import mongoose from 'mongoose';
import {createHash} from 'node:crypto';
import {cookieOptions} from '../middleware/auth.js';
export const dummyPasswordHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxloUp3B/Vm1W5p2vV.R6l5tG3K';
export const resetFields = {passwordResetRequestedAt: null, passwordResetExpiresAt: null, passwordResetApprovedAt: null};
export function clearSession(res) {
  res.clearCookie('session', cookieOptions);
}
export const hash = body => createHash('sha256').update(JSON.stringify(body)).digest('hex');
export const transaction = work => mongoose.connection.transaction(work, {readPreference: 'primary', writeConcern: {w: 'majority'}, maxCommitTimeMS: 15000});
export const escaped = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const publicProduct = p => ({_id: p._id, code: p.code, name: p.name, category: p.category, salePrice: p.salePrice, stock: p.stock, minStock: p.minStock});
