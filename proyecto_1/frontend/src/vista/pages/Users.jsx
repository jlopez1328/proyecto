import {AdminPasswordForm} from '../components/AdminPasswordForm';
import React from 'react';

import {ShoppingCart, ShoppingBag, Package, Plus, Trash2, RotateCcw} from 'lucide-react';
import {date} from '../../modelo/api';

import { PasswordResetControl } from './PasswordRecovery';
import {PageHeader, Notice, ResourceState, Empty, SearchBox, Pager, Modal} from '../components/ui';

import {useUserFormController,useUserRowController,useUsersPageController} from '../../controlador/usersController';

export function UserForm(props) {
const {onClose,onSaved}=props;
const {message,setMessage,busy,setBusy,submit}=useUserFormController(props);
return <Modal title="Crear usuario" onClose={onClose}><form onSubmit={submit}><Notice message={message}/><label>Nombre<input name="name" required maxLength={100}/></label><label>Nombre de usuario<input name="username" required minLength={3} maxLength={32} autoComplete="off" autoCapitalize="none" spellCheck={false}/></label><p className="hint">3–32 caracteres: letras, números, punto, guion o guion bajo. Sin espacios ni @.</p><label>Correo electrónico (contacto)<input name="email" type="email" autoComplete="off" required maxLength={254}/></label><label>Contraseña inicial<input name="password" type="password" autoComplete="new-password" minLength={4} maxLength={12} required/></label><label>Rol<select name="role"><option value="vendedor">Vendedor · ventas</option><option value="comprador">Comprador · compras e inventario</option><option value="administrador">Administrador · acceso completo</option></select></label><div className="form-actions"><button className="button secondary" type="button" onClick={onClose}>Cancelar</button><button disabled={busy} className="button">{busy?'Creando…':'Crear usuario'}</button></div></form></Modal>;
}


export function UserRow(props) {
  const {user,isSelf,onSaved,onError,onChangePassword,onDelete,onRestore,accountBusy}=props;
  const {username,setUsername,role,setRole,active,setActive,busy,save}=useUserRowController(props);
  if(user.deletedAt)return <tr><td><strong>{user.name}</strong><small>{user.email}</small></td><td>{user.username}</td><td>{user.role}</td><td><span className="badge warning">Eliminado</span></td><td>Sin acceso</td><td>{date(user.deletedAt)}</td><td><button className="button secondary small" disabled={accountBusy} aria-label={`Recuperar usuario ${user.username}`} onClick={()=>onRestore(user)}><RotateCcw size={16}/>Recuperar</button></td></tr>;
  return <tr>
    <td><strong>{user.name}{isSelf?' (tú)':''}</strong><small>{user.email}</small></td>
    <td><input aria-label={`Nombre de usuario de ${user.name}`} value={username||''} onChange={e=>setUsername(e.target.value)} minLength={3} maxLength={32} autoCapitalize="none" spellCheck={false} disabled={isSelf||busy}/></td>
    <td><select aria-label={`Rol de ${user.name}`} value={role} onChange={e=>setRole(e.target.value)} disabled={isSelf||busy}><option value="vendedor">Vendedor</option><option value="comprador">Comprador</option><option value="administrador">Administrador</option></select></td>
    <td><label className="check-label"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)} disabled={isSelf||busy}/>Activo</label></td>
    <td><PasswordResetControl user={user} isSelf={isSelf} onChanged={onSaved} onError={onError}/></td>
    <td>{date(user.createdAt)}</td>
    <td><div className="user-actions"><button className="button secondary small" disabled={isSelf||busy||(username===user.username&&role===user.role&&active===user.active)||!username?.trim()} onClick={save}>{busy?'Guardando…':'Guardar'}</button><button className="button secondary small" disabled={!user.active||accountBusy} aria-label={`Cambiar clave de ${user.username}`} onClick={()=>onChangePassword(user)}>Cambiar clave</button><button type="button" className="icon-button delete-user" aria-label={`Eliminar usuario ${user.username}`} title={isSelf?'No puedes eliminar tu cuenta actual':`Eliminar usuario ${user.username}`} disabled={isSelf||busy||accountBusy} onClick={()=>onDelete(user)}><Trash2 size={20}/></button></div></td>
  </tr>;
}

export function UsersPage() {
  const {user,page,setPage,create,setCreate,message,setMessage,search,setSearch,r,saved,passwordTarget,setPasswordTarget,passwordSaved,archived,setArchived,deleteTarget,setDeleteTarget,deleteError,accountBusy,selectDelete,removeUser,restoreUser}=useUsersPageController();
  return <>
    <PageHeader eyebrow="ADMINISTRACIÓN" title="Usuarios y permisos" description="El acceso correcto para cada persona de tu equipo."><button className="button secondary" onClick={r.refresh}>Actualizar solicitudes</button><button className="button" onClick={()=>setCreate(true)}><Plus size={18}/>Crear usuario</button></PageHeader>
    <div className="permission-cards"><article><ShoppingCart/><strong>Vendedor</strong><p>Ventas y su historial.</p></article><article><ShoppingBag/><strong>Comprador</strong><p>Compras, inventario y estadísticas.</p></article><article><Package/><strong>Administrador</strong><p>Acceso completo y gestión de usuarios.</p></article></div>
    <Notice message={message}/>
    <div className="tabs"><button className={!archived?'selected':''} onClick={()=>{setArchived(false);setPage(1);}}>Usuarios</button><button className={archived?'selected':''} onClick={()=>{setArchived(true);setPage(1);}}>Usuarios eliminados</button></div>
    <section className="panel no-pad"><div className="table-toolbar"><SearchBox value={search} onChange={s=>{setSearch(s);setPage(1);}} placeholder="Buscar por usuario, nombre o correo…"/></div><ResourceState resource={r}/>{!r.loading&&!r.error&&(r.data?.items.length?<div className="table-wrap"><table><thead><tr><th>Persona / Correo de contacto</th><th>Nombre de usuario</th><th>Rol</th><th>Estado</th><th>Cambio de contraseña</th><th>{archived?'Eliminado':'Creado'}</th><th>Acción</th></tr></thead><tbody>{r.data.items.map(u=><UserRow key={u._id} user={u} isSelf={u._id===user._id} onSaved={saved} onChangePassword={setPasswordTarget} onError={text=>setMessage({type:'error',text})} onDelete={selectDelete} onRestore={restoreUser} accountBusy={accountBusy}/>)}</tbody></table></div>:<Empty text={archived?'No hay usuarios eliminados.':'No se encontraron usuarios.'}/>)}<Pager page={page} setPage={setPage} total={r.data?.total}/></section>
    {deleteTarget&&<Modal title="Eliminar usuario" onClose={()=>{if(!accountBusy)setDeleteTarget(null);}}><Notice message={deleteError}/><p>¿Eliminar a <strong>{deleteTarget.name}</strong> ({deleteTarget.username})?</p><p className="hint">Se cerrarán sus sesiones y no podrá ingresar. Sus compras y ventas se conservarán. Podrás recuperar la cuenta desde Usuarios eliminados.</p><div className="form-actions"><button className="button secondary" disabled={accountBusy} onClick={()=>setDeleteTarget(null)}>Cancelar</button><button className="button danger-button" disabled={accountBusy} onClick={removeUser}><Trash2 size={18}/>{accountBusy?'Eliminando…':'Eliminar usuario'}</button></div></Modal>}
    {passwordTarget&&<AdminPasswordForm user={passwordTarget} isSelf={passwordTarget._id===user._id} onClose={()=>setPasswordTarget(null)} onSaved={passwordSaved}/>}
    {create&&<UserForm onClose={()=>setCreate(false)} onSaved={saved}/>}
  </>;
}
