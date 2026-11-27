import {useEffect, useState} from 'react';
import {api} from '../modelo/api';

export function useNotificationsController() {
  const [open,setOpen]=useState(false), [items,setItems]=useState([]), [total,setTotal]=useState(0), [error,setError]=useState('');
  useEffect(() => {
    let active=true, pending=false;
    async function refresh() {
      if (pending || document.visibilityState==='hidden') return;
      pending=true;
      try {
        const data=await api('/users/password-reset/requests');
        if(active){setItems(data.items || []);setTotal(data.total || 0);setError('');}
      } catch(err) {if(active)setError('No se pudieron consultar las solicitudes.');}
      finally {pending=false;}
    }
    refresh();
    const interval=setInterval(refresh,15000);
    window.addEventListener('focus',refresh);
    window.addEventListener('password-reset-updated',refresh);
    document.addEventListener('visibilitychange',refresh);
    return ()=>{active=false;clearInterval(interval);window.removeEventListener('focus',refresh);window.removeEventListener('password-reset-updated',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[]);
  return {open,setOpen,items,total,error};
}
