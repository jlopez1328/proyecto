import {useRecoveryPageController,usePasswordResetControlController} from '../../controlador/recoveryController';
import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, ShieldCheck } from 'lucide-react';
import {date} from '../../modelo/api';

import { Modal, Notice } from '../components/ui';

export function RecoveryPage() {
  const {session,mode,setMode,username,setUsername,message,setMessage,busy,setBusy,submit}=useRecoveryPageController();
  return <main className="login">
    <section className="acceso">
      <header><Link to="/" className="logo"><ShoppingCart className="logo-carrito"/><span className="texto-logo"><strong className="nombre-logo">NexusStock</strong><span className="frase-logo">Gestiona. Vende. Crece.</span></span></Link></header>
      <article className="formulario-login">
        <p className="eyebrow">ACCESO A TU CUENTA</p>
        <h1>Recuperar contraseña</h1>
        <p className="muted">{mode === 'request' ? 'Solicita al administrador que habilite tu cambio de contraseña.' : mode === 'confirm' ? 'Cuando el administrador autorice la solicitud, elige tu nueva contraseña desde este mismo navegador.' : 'Ya puedes volver a ingresar a tu cuenta.'}</p>
        <Notice message={message}/>
        {mode !== 'done' ? <>
          <form onSubmit={submit} key={mode}>
            <fieldset disabled={busy}>
              <label>Nombre de usuario<input name="username" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required minLength={3} maxLength={32} autoCapitalize="none" spellCheck={false}/></label>
              {mode === 'confirm' && <>
                <label>Nueva contraseña<input name="password" type="password" minLength={4} maxLength={12} autoComplete="new-password" required/></label>
                <label>Confirmar nueva contraseña<input name="confirmPassword" type="password" minLength={4} maxLength={12} autoComplete="new-password" required/></label>
                <p className="hint">De 4 a 12 caracteres, sin requisitos de mayúsculas ni símbolos. La autorización no vence y permite un solo cambio.</p>
              </>}
              <button className="button large full" disabled={busy}>{busy ? 'Procesando…' : mode === 'request' ? 'Solicitar autorización' : 'Guardar nueva contraseña'}</button>
            </fieldset>
          </form>
          <button className="recovery-link" disabled={busy} onClick={() => {setMode(mode === 'request' ? 'confirm' : 'request'); setMessage(null);}}>{mode === 'request' ? 'El administrador ya habilitó el cambio' : 'Solicitar autorización nuevamente'}</button>
        </> : <Link className="button full" to="/login">Iniciar sesión</Link>}
        {mode !== 'done' && <p className="registro"><Link to="/login">Volver al inicio de sesión</Link></p>}
      </article>
      <p className="hint">Solicita el cambio y espera que el administrador lo autorice en Usuarios. No necesitas códigos ni las credenciales del administrador.</p>
    </section>
    <aside className="informacion-login"><div className="mensaje-login"><ShieldCheck size={44}/><h2>Recupera tu acceso<span>con autorización</span></h2><p>Tu administrador habilita el cambio. Tú eliges una contraseña nueva y privada.</p></div><img src="/img/login.png" alt="NexusStock para gestión segura de tu negocio"/></aside>
  </main>;
}

export function PasswordResetControl({user, isSelf, onChanged, onError}) {
  const {grant,setGrant,busy,setBusy,enabled,pending,approve,revoke}=usePasswordResetControlController({user,isSelf,onChanged,onError});
  return <>
    <div className="password-reset-control">
      {enabled ? <span className="badge good">Cambio habilitado</span> : pending ? <span className="badge warning">Recuperación solicitada</span> : <span className="hint">Sin autorización</span>}
      {enabled && <small>Sin límite de tiempo · un solo uso</small>}
      {pending && <small>Solicitud: {date(user.passwordResetRequestedAt)}</small>}
      <div className="password-reset-actions">
        <button className="button secondary small" disabled={isSelf || !user.active || busy || !pending || enabled} onClick={approve}>{busy ? 'Procesando…' : enabled ? 'Cambio autorizado' : 'Habilitar cambio'}</button>
        {(pending || enabled) && <button className="button secondary small" disabled={isSelf || busy} onClick={revoke}>Revocar cambio</button>}
      </div>
      {isSelf && <small>Otro administrador debe autorizar tu recuperación.</small>}
    </div>
    {grant && <Modal title="Cambio de contraseña habilitado" onClose={() => setGrant(null)}>
      <p><strong>{grant.user.name}</strong> · Usuario: {grant.user.username}</p>
      <p className="hint">El cambio está autorizado sin límite de tiempo. La persona debe volver al mismo navegador donde hizo la solicitud, abrir “¿Olvidaste tu contraseña?” y elegir “El administrador ya habilitó el cambio”.</p>
      <p className="hint">La persona solo necesita su nombre de usuario, la nueva contraseña y su confirmación. La autorización se consume al cambiarla y puede revocarse antes de usarla.</p>
      <div className="form-actions"><button className="button secondary" disabled={busy} onClick={revoke}>Revocar cambio</button><button className="button" onClick={() => setGrant(null)}>Cerrar</button></div>
    </Modal>}
  </>;
}
