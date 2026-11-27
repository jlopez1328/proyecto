
import {Product, Sale, Purchase, Movement, nextCode} from '../modelo/index.js';

import {ApiError, round, cost, suggested, saleTotals} from '../domain.js';
import * as v from '../validation.js';
import {transaction, hash, escaped} from '../services/operations.js';
async function priorOperation(Model, data, user, session) {
  const previous = await Model.findOne({requestId: data.requestId}).session(session);
  if (previous && (String(previous.user) !== String(user._id) || previous.requestHash !== hash(data))) throw new ApiError(409, 'Identificador de solicitud ya utilizado con otros datos.');
  return previous;
}
async function history(Model, req, res, sale = false) {
  const {page, limit, search} = v.listQuery.parse(req.query);
  const query = sale && req.user.role === 'vendedor' ? {user: req.user._id} : {};
  if (search) query.number = new RegExp(escaped(search), 'i');
  const [items, total] = await Promise.all([Model.find(query).sort({createdAt: -1}).skip((page - 1) * limit).limit(limit).populate('user', 'name role').select('-requestHash'), Model.countDocuments(query)]);
  res.json({items, total, page, limit});
}

export const createSale = async (req, res) => {
  const data = v.saleInput.parse(req.body);
  const sale = await transaction(async session => {
    const previous = await priorOperation(Sale, data, req.user, session);
    if (previous) return previous;
    const number = await nextCode('sale', 'VEN', session), lines = [];
    for (const item of data.lines) {
      const p = await Product.findOneAndUpdate({_id: item.product, active: true, stock: {$gte: item.quantity}}, {$inc: {stock: -item.quantity}}, {new: true, session});
      if (!p) throw new ApiError(409, 'Existencias insuficientes o producto no disponible. Actualiza el catálogo.');
      lines.push({...item, code: p.code, name: p.name, unitPrice: p.salePrice, subtotal: round(p.salePrice * item.quantity), total: round(p.salePrice * item.quantity * (1 - item.discount / 100))});
      await Movement.create([{product: p._id, user: req.user._id, kind: 'venta', quantity: -item.quantity, reference: number}], {session});
    }
    const [s] = await Sale.create([{...data, number, user: req.user._id, requestHash: hash(data), lines, ...saleTotals(lines, data.discount)}], {session});
    return s;
  });
  res.status(201).json({sale});
};

export const createPurchase = async (req, res) => {
  const data = v.purchaseInput.parse(req.body);
  const purchase = await transaction(async session => {
    const previous = await priorOperation(Purchase, data, req.user, session);
    if (previous) return previous;
    const number = await nextCode('purchase', 'COM', session), lines = [];
    for (const item of data.lines) {
      const suggestedPrice = suggested(item.netPrice, item.vat, item.tax, item.margin);
      const p = await Product.findOneAndUpdate({_id: item.product, active: true, stock: {$lte: 1000000000 - item.quantity}}, {$inc: {stock: item.quantity}, $set: {netPrice: item.netPrice, vat: item.vat, tax: item.tax, margin: item.margin, suggestedPrice, salePrice: suggestedPrice}}, {session, new: true, runValidators: true});
      if (!p) throw new ApiError(409, 'Producto no disponible o límite de existencias excedido.');
      lines.push({...item, code: p.code, name: p.name, unitPrice: cost(item.netPrice, item.vat, item.tax), subtotal: round(item.netPrice * item.quantity), total: round(cost(item.netPrice, item.vat, item.tax) * item.quantity)});
      await Movement.create([{product: p._id, user: req.user._id, kind: 'compra', quantity: item.quantity, reference: number}], {session});
    }
    const [p] = await Purchase.create([{...data, number, user: req.user._id, requestHash: hash(data), lines, subtotal: round(lines.reduce((sum, l) => sum + l.subtotal, 0)), total: round(lines.reduce((sum, l) => sum + l.total, 0))}], {session});
    return p;
  });
  res.status(201).json({purchase});
};

export const saleHistory = (req, res) => history(Sale, req, res, true);

export const purchaseHistory = (req, res) => history(Purchase, req, res);

export const movements = async (req, res) => {
  const {page, limit} = v.listQuery.parse(req.query);
  const [items, total] = await Promise.all([Movement.find().sort({createdAt: -1}).skip((page - 1) * limit).limit(limit).populate('product', 'code name').populate('user', 'name'), Movement.countDocuments()]);
  res.json({items, total, page, limit});
};
