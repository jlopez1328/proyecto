import {User} from './User.js';
export {User};
import {Counter} from './Counter.js';
export {Counter};
import {Product} from './Product.js';
export {Product};
import {Sale} from './Sale.js';
export {Sale};
import {Purchase} from './Purchase.js';
export {Purchase};
import {Movement} from './Movement.js';
export {Movement};
import {migrateUsernames} from '../usernames.js';
export async function nextCode(key, prefix, session) {
  const value = await Counter.findOneAndUpdate({_id: key}, {$inc: {seq: 1}}, {new: true, upsert: true, session});
  return `${prefix}-${String(value.seq).padStart(6, '0')}`;
}
export async function initializeDatabase() {
  await Promise.all([User.init(), Product.init(), Sale.init(), Purchase.init(), Movement.init()]);
  await migrateUsernames(User);
  for (const key of ['product', 'sale', 'purchase', 'damage', 'adjustment']) await Counter.updateOne({_id: key}, {$setOnInsert: {seq: 0}}, {upsert: true});
}
