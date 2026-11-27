
import {Product, Sale, Purchase} from '../modelo/index.js';

import {round} from '../domain.js';
import * as v from '../validation.js';

export const reports = async (req, res) => {
  const {year} = v.monthQuery.parse(req.query);
  const isSeller = req.user.role === 'vendedor';
  // Boundaries and grouping share the business time zone (America/Bogota).
  const range = {createdAt: {$gte: new Date(`${year}-01-01T00:00:00-05:00`), $lt: new Date(`${year + 1}-01-01T00:00:00-05:00`)}};
  const grouped = (Model, extra = {}) => Model.aggregate([{$match: {...range, ...extra}}, {$group: {_id: {$month: {date: '$createdAt', timezone: 'America/Bogota'}}, total: {$sum: '$total'}, count: {$sum: 1}, units: {$sum: {$sum: '$lines.quantity'}}}}]);
  const [salesData, purchasesData, stockData] = await Promise.all([
    grouped(Sale, isSeller ? {user: req.user._id} : {}),
    isSeller ? [] : grouped(Purchase),
    isSeller ? [] : Product.aggregate([{$match: {active: true}}, {$group: {_id: null, products: {$sum: 1}, units: {$sum: '$stock'}, damaged: {$sum: '$damaged'}, value: {$sum: {$multiply: ['$stock', '$netPrice']}}, low: {$sum: {$cond: [{$lte: ['$stock', '$minStock']}, 1, 0]}}}}])
  ]);
  const months = Array.from({length: 12}, (_, i) => ({month: i + 1, sales: round(salesData.find(s => s._id === i + 1)?.total || 0), saleCount: salesData.find(s => s._id === i + 1)?.count || 0, saleUnits: salesData.find(s => s._id === i + 1)?.units || 0, ...(!isSeller ? {purchases: round(purchasesData.find(p => p._id === i + 1)?.total || 0), purchaseCount: purchasesData.find(p => p._id === i + 1)?.count || 0} : {})}));
  const stock = stockData[0];
  res.json({year, months, ...(!isSeller ? {inventory: {products: stock?.products || 0, units: stock?.units || 0, damaged: stock?.damaged || 0, value: round(stock?.value || 0), low: stock?.low || 0}} : {})});
};
