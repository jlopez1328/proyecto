import {useState} from 'react';
import {api, suggested} from '../modelo/api';

const newProduct={name:'',category:'General',netPrice:0,vat:19,tax:0,margin:30,minStock:5,salePrice:''};
export function useProductFormController({product,onClose,onSaved,forPurchase=false}) {
  const [purchaseQuantity,setPurchaseQuantity]=useState(1);
  const [initialQuantity,setInitialQuantity]=useState(0);
  const [availableQuantity,setAvailableQuantity]=useState(product?.stock??0),[adjustmentReason,setAdjustmentReason]=useState('');
const [values,setValues]=useState(product?Object.fromEntries(Object.keys(newProduct).map(k=>[k,product[k]])):{...newProduct}),[busy,setBusy]=useState(false),[message,setMessage]=useState(null);
  const set=(key,value)=>setValues(v=>({...v,[key]:value}));
  const price=suggested({...values,netPrice:Number(values.netPrice),vat:Number(values.vat),tax:Number(values.tax),margin:Number(values.margin)});
  async function submit(e) {e.preventDefault();setBusy(true);setMessage(null);try{const body={...values};if(body.salePrice==='')delete body.salePrice;if(!product&&!forPurchase)body.initialStock=initialQuantity;if(product&&availableQuantity!==product.stock){body.stock=availableQuantity;body.expectedStock=product.stock;if(adjustmentReason.trim())body.adjustmentReason=adjustmentReason.trim();}const result=await api(product?`/products/${product._id}`:'/products',{method:product?'PATCH':'POST',body});onSaved(result.product,forPurchase&&!product?purchaseQuantity:undefined);}catch(err){setMessage({type:'error',text:err.message});}finally{setBusy(false);}}

return {values,setValues,busy,setBusy,message,setMessage,set,price,submit,purchaseQuantity,setPurchaseQuantity,availableQuantity,setAvailableQuantity,adjustmentReason,setAdjustmentReason,initialQuantity,setInitialQuantity};
}
