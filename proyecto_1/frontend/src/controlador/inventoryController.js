import {useState} from 'react';
import {api} from '../modelo/api';

import {useResource,useSearch,useRequest} from './resourceController';
export function useDamageFormController({product,onClose,onSaved}) {
const [quantity,setQuantity]=useState(1),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(null),request=useRequest();
  async function submit(e) {e.preventDefault();setBusy(true);try{await api(`/products/${product._id}/damage`,{method:'POST',body:request({quantity,reason})});onSaved();}catch(err){setMessage({type:'error',text:err.message});}finally{setBusy(false);}}

return {quantity,setQuantity,reason,setReason,busy,setBusy,message,setMessage,request,submit};
}

export function useInventoryController() {
const {search,setSearch,term}=useSearch(), [page,setPage]=useState(1),[tab,setTab]=useState('products'),[editing,setEditing]=useState(null),[damage,setDamage]=useState(null),[deleting,setDeleting]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(null);
  const r=useResource(tab==='products'?`/products?search=${encodeURIComponent(term)}&page=${page}`:`/movements?page=${page}`);
  const refresh=text=>{setEditing(null);setDamage(null);setMessage({text});r.refresh();};
  async function remove() {setBusy(true);try{await api(`/products/${deleting._id}`,{method:'DELETE'});setDeleting(null);refresh('Producto eliminado del catálogo; su historial se conserva.');}catch(err){setMessage({type:'error',text:err.message});setDeleting(null);}finally{setBusy(false);}}

return {search,setSearch,term,page,setPage,tab,setTab,editing,setEditing,damage,setDamage,deleting,setDeleting,busy,setBusy,message,setMessage,r,refresh,remove};
}
