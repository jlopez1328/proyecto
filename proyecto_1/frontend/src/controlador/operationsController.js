import {useState} from 'react';
import {api, totals, round} from '../modelo/api';

import {useResource,useSearch,useRequest} from './resourceController';
export function useCatalogController({purchase,onAdd,version}) {
const {search,setSearch,term}=useSearch(),[page,setPage]=useState(1);
  const r=useResource(`${purchase?'/products':'/catalog'}?search=${encodeURIComponent(term)}&page=${page}&refresh=${version||0}`);

return {search,setSearch,term,page,setPage,r};
}

export function useOperationPageController({purchase=false}) {
  const [editing,setEditing]=useState(null);
  function productSaved(product) {
    setEditing(null);
    setLines(previous=>previous.map(line=>line._id===product._id?{...line,...product,quantity:line.quantity,discount:line.discount}:line));
    setVersion(value=>value+1);
    setMessage({text:`${product.code} actualizado. Los datos del producto se guardaron correctamente.`});
  }
const [lines,setLines]=useState([]),[discount,setDiscount]=useState(0),[partner,setPartner]=useState(''),[note,setNote]=useState(''),[message,setMessage]=useState(null),[busy,setBusy]=useState(false),[receipt,setReceipt]=useState(null),[version,setVersion]=useState(0),[create,setCreate]=useState(false);
  const request=useRequest();
  function add(p,quantity=1) {setMessage(null);setLines(prev=>{const found=prev.find(l=>l._id===p._id);if(found){return prev.map(l=>l._id===p._id?{...l,quantity:purchase?l.quantity+quantity:Math.min(l.quantity+quantity,p.stock)}:l);}return [...prev,{...p,quantity,discount:0}];});}
  function productCreated(product,quantity=1){setCreate(false);add(product,quantity);setVersion(value=>value+1);setMessage({text:`${product.code} creado. ${quantity} unidades añadidas a la orden; pulsa Confirmar compra para ingresar las existencias.`});}
  const update=(id,key,value)=>setLines(prev=>prev.map(l=>l._id===id?{...l,[key]:value}:l));
  const saleSummary=totals(lines,Number(discount));
  const total=purchase?round(lines.reduce((s,l)=>s+round(round(l.netPrice*(1+(l.vat+l.tax)/100))*l.quantity),0)):saleSummary.total;
  async function submit(e) {
    e.preventDefault();if(!lines.length)return;setBusy(true);setMessage(null);
    const body=purchase?{supplier:partner,note,lines:lines.map(l=>({product:l._id,quantity:l.quantity,netPrice:l.netPrice,vat:l.vat,tax:l.tax,margin:l.margin}))}:{customer:partner.trim()||'Consumidor final',note,discount:Number(discount),lines:lines.map(l=>({product:l._id,quantity:l.quantity,discount:l.discount}))};
    try {const result=await api(purchase?'/purchases':'/sales',{method:'POST',body:request(body)});setReceipt(result[purchase?'purchase':'sale']);setLines([]);setDiscount(0);setPartner('');setNote('');setVersion(v=>v+1);}
    catch(err){setMessage({type:'error',text:err.message});setVersion(v=>v+1);}finally{setBusy(false);}
  }

return {lines,setLines,discount,setDiscount,partner,setPartner,note,setNote,message,setMessage,busy,setBusy,receipt,setReceipt,version,setVersion,create,setCreate,request,add,update,saleSummary,total,submit,editing,setEditing,productSaved,productCreated};
}
