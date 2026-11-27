import React from 'react';
import {Modal,Notice} from './ui';
import {usePasswordFormController} from '../../controlador/usersController';

export function AdminPasswordForm({user,isSelf,onClose,onSaved}) {
  const {busy,message,submit}=usePasswordFormController({user,onSaved});
  return <Modal title={`Cambiar clave de ${user.username}`} onClose={onClose}>
    <p>{user.name} · {user.username}</p>
    <p className="hint">Contraseña sencilla de 4 a 12 caracteres. Se cerrarán las sesiones anteriores de esta cuenta.{isSelf?' Al cambiar tu propia clave tendrás que iniciar sesión nuevamente.':''}</p>
    <form onSubmit={submit}><Notice message={message}/><fieldset disabled={busy}>
      <label>Nueva contraseña<input name="password" type="password" autoComplete="new-password" minLength={4} maxLength={12} required autoFocus/></label>
      <label>Confirmar nueva contraseña<input name="confirmPassword" type="password" autoComplete="new-password" minLength={4} maxLength={12} required/></label>
      <div className="form-actions"><button className="button secondary" type="button" onClick={onClose}>Cancelar</button><button className="button" disabled={busy}>{busy?'Guardando…':'Guardar nueva clave'}</button></div>
    </fieldset></form>
  </Modal>;
}
