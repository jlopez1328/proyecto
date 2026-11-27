
import {Product, Movement, nextCode} from '../modelo/index.js';

import {ApiError, suggested} from '../domain.js';
import * as v from '../validation.js';
import {transaction, escaped, publicProduct} from '../services/operations.js';
async function listProducts(req, res, catalog = false) {
  const {search, page, limit} = v.listQuery.parse(req.query);
  const query = {active: true};
  if (search) query.$or = [{name: new RegExp(escaped(search), 'i')}, {code: new RegExp(escaped(search), 'i')}];
  const [items, total] = await Promise.all([Product.find(query).sort({code: 1}).skip((page - 1) * limit).limit(limit).lean(), Product.countDocuments(query)]);
  res.json({items: catalog ? items.map(publicProduct) : items, total, page, limit});
}

export const catalog = (req, res) => listProducts(req, res, true);

export const list = (req, res) => listProducts(req, res);

export const create = async (req, res) => {
  const {initialStock,...data} = v.productCreation.parse(req.body);
  const product = await transaction(async session => {
    const code = await nextCode('product', 'PRD', session);
    const suggestedPrice = suggested(data.netPrice, data.vat, data.tax, data.margin);
    const [p] = await Product.create([{...data, code, stock:initialStock, suggestedPrice, salePrice: data.salePrice ?? suggestedPrice}], {session});
    if(initialStock>0){
      const reference=await nextCode('adjustment','AJU',session);
      await Movement.create([{product:p._id,user:req.user._id,kind:'ajuste',quantity:initialStock,reference,reason:'Existencias iniciales al crear producto desde Inventario'}],{session});
    }
    return p;
  });
  res.status(201).json({product});
};

export const update = async (req, res) => {
  const {stock,expectedStock,adjustmentReason,...data} = v.productUpdate.parse(req.body), id = v.parseId(req.params.id);
  const suggestedPrice = suggested(data.netPrice, data.vat, data.tax, data.margin);
  const product = await transaction(async session=>{
    const previous=await Product.findOne({_id:id,active:true}).session(session);
    if(!previous)throw new ApiError(404,'Producto no encontrado.');
    if(stock!==undefined&&previous.stock!==expectedStock)throw new ApiError(409,'La cantidad cambió por otra operación. Cierra el formulario y vuelve a abrir Modificar para consultar las existencias actuales.');
    const updated=await Product.findOneAndUpdate({_id:id,active:true},{...data,suggestedPrice,salePrice:data.salePrice??suggestedPrice,...(stock!==undefined?{stock}:{})},{new:true,runValidators:true,session});
    if(stock!==undefined&&stock!==previous.stock){
      const reference=await nextCode('adjustment','AJU',session);
      await Movement.create([{product:id,user:req.user._id,kind:'ajuste',quantity:stock-previous.stock,reference,reason:adjustmentReason||'Corrección de cantidad desde Modificar producto'}],{session});
    }
    return updated;
  });
  res.json({product});
};

export const archive = async (req, res) => {
  const id = v.parseId(req.params.id);
  const product = await Product.findOneAndUpdate({_id: id, active: true, stock: 0}, {active: false}, {new: true});
  if (!product) throw new ApiError(409, 'Solo se pueden eliminar productos activos sin existencias. Registra antes sus salidas.');
  res.json({message: 'Producto archivado. Su historial se conserva.'});
};

export const damage = async (req, res) => {
  const id = v.parseId(req.params.id), data = v.damageInput.parse(req.body);
  const movement = await transaction(async session => {
    const previous = await Movement.findOne({requestId: data.requestId}).session(session);
    if (previous) {
      if (String(previous.user) !== String(req.user._id) || String(previous.product) !== id || previous.quantity !== -data.quantity || previous.reason !== data.reason) throw new ApiError(409, 'Identificador de solicitud ya utilizado.');
      return previous;
    }
    const p = await Product.findOneAndUpdate({_id: id, active: true, stock: {$gte: data.quantity}}, {$inc: {stock: -data.quantity, damaged: data.quantity}}, {session, new: true});
    if (!p) throw new ApiError(409, 'Producto inexistente o existencias insuficientes.');
    const reference = await nextCode('damage', 'DAN', session);
    const [m] = await Movement.create([{product: id, user: req.user._id, kind: 'daño', quantity: -data.quantity, reason: data.reason, requestId: data.requestId, reference}], {session});
    return m;
  });
  res.status(201).json({movement});
};
