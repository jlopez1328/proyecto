import {useState,useEffect} from 'react';
import {api} from '../modelo/api';
import {useSession} from '../modelo/session';
import {useNavigate} from 'react-router-dom';
import {useResource, useSearch} from './resourceController';
export function useUserFormController({onClose,onSaved}) {
const [message,setMessage]=useState(null),[busy,setBusy]=useState(false);
  async function submit(e) {e.preventDefault();const body=Object.fromEntries(new FormData(e.currentTarget));setBusy(true);try{await api('/users',{method:'POST',body});onSaved();}catch(err){setMessage({type:'error',text:err.message});}finally{setBusy(false);}}

return {message,setMessage,busy,setBusy,submit};
}

export function useUserRowController({user,isSelf,onSaved,onError}) {
const [username,setUsername]=useState(user.username),[role,setRole]=useState(user.role),[active,setActive]=useState(user.active),[busy,setBusy]=useState(false);
  useEffect(()=>{setUsername(user.username);setRole(user.role);setActive(user.active);},[user.username,user.role,user.active]);
  async function save() {setBusy(true);try{await api(`/users/${user._id}`,{method:'PATCH',body:{username,role,active}});onSaved();}catch(err){onError(err.message);}finally{setBusy(false);}}

return {username,setUsername,role,setRole,active,setActive,busy,setBusy,save};
}

export function useUsersPageController() {
const [passwordTarget,setPasswordTarget]=useState(null);
const [archived,setArchived]=useState(false),[deleteTarget,setDeleteTarget]=useState(null),[deleteError,setDeleteError]=useState(null),[accountBusy,setAccountBusy]=useState(false);
const {user}=useSession(),[page,setPage]=useState(1),[create,setCreate]=useState(false),[message,setMessage]=useState(null),{search,setSearch,term}=useSearch(),r=useResource(`/users?page=${page}&search=${encodeURIComponent(term)}&archived=${archived}`);
  const saved=()=>{setCreate(false);setMessage({text:'Información de usuarios actualizada.'});r.refresh();};

const passwordSaved=()=>{setPasswordTarget(null);setMessage({text:'Contraseña actualizada. Se cerraron las sesiones anteriores de la cuenta.'});r.refresh();window.dispatchEvent(new Event('password-reset-updated'));};
function selectDelete(target){setDeleteError(null);setDeleteTarget(target);}
async function removeUser(){setAccountBusy(true);setDeleteError(null);try{const result=await api(`/users/${deleteTarget._id}`,{method:'DELETE'});setDeleteTarget(null);setMessage({text:result.message});r.refresh();window.dispatchEvent(new Event('password-reset-updated'));}catch(err){setDeleteError({type:'error',text:err.message});}finally{setAccountBusy(false);}}
async function restoreUser(target){setAccountBusy(true);try{const result=await api(`/users/${target._id}/restore`,{method:'POST'});setMessage({text:result.message});r.refresh();}catch(err){setMessage({type:'error',text:err.message});}finally{setAccountBusy(false);}}
return {user,page,setPage,create,setCreate,message,setMessage,search,setSearch,term,r,saved,passwordTarget,setPasswordTarget,passwordSaved,archived,setArchived,deleteTarget,setDeleteTarget,deleteError,accountBusy,selectDelete,removeUser,restoreUser};
}

export function usePasswordFormController({user,onSaved}) {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(null);
  const session=useSession(),navigate=useNavigate();
  async function submit(event){
    event.preventDefault();const body=Object.fromEntries(new FormData(event.currentTarget));
    if(body.password!==body.confirmPassword){setMessage({type:'error',text:'Las contraseñas no coinciden.'});return;}
    setBusy(true);setMessage(null);
    try{
      const result=await api(`/users/${user._id}/password`,{method:'PUT',body});
      if(result.currentSessionEnded){session.setUser(null);navigate('/login',{replace:true});}
      else onSaved();
    }catch(err){setMessage({type:'error',text:err.message});}finally{setBusy(false);}
  }
  return {busy,message,submit};
}
