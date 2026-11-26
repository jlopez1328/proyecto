import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, ShieldCheck } from 'lucide-react';
import { api, date } from './api';
import { useSession } from './session';
import { Modal, Notice } from './ui';

export function RecoveryPage() {
  const session = useSession();
  const [mode, setMode] = useState('request');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (mode === 'confirm' && values.password !== values.confirmPassword) {
      setMessage({type: 'error', text: 'Las contraseñas no coinciden.'});
      return;
    }
    setBusy(true); setMessage(null);
    try {
      const result = await api(`/auth/password-reset/${mode}`, {method: 'POST', body: values});
      setMessage({text: result.message});
      if (mode === 'request') setMode('confirm');
      else {session?.setUser(null); setMode('done');}
    } catch (error) {setMessage({type: 'error', text: error.message});}
    finally {setBusy(false);}
  }
  return <main className="login">
    <section className="acceso">
      <header><Link to="/" className="logo"><ShoppingCart className="logo-carrito"/><span className="texto-logo"><strong className="nombre-logo">NexusStock</strong><span className="frase-logo">Gestiona. Vende. Crece.</span></span></Link></header>
      <article className="formulario-login">
        <p className="eyebrow">ACCESO A TU CUENTA</p>
        <h1>Recuperar contraseña</h1>
        <p className="muted">{mode === 'request' ? 'Solicita al administrador que habilite tu cambio de contraseña.' : mode === 'confirm' ? 'El administrador debe introducir su nombre de usuario y contraseña para autorizar el cambio. Tú eliges tu nueva contraseña.' : 'Ya puedes volver a ingresar a tu cuenta.'}</p>
        <Notice message={message}/>
        {mode !== 'done' ? <>
          <form onSubmit={submit} key={mode}>
            <fieldset disabled={busy}>
              <label>Nombre de usuario<input name="username" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required minLength={3} maxLength={32} autoCapitalize="none" spellCheck={false}/></label>
              {mode === 'confirm' && <>
                <div className="admin-authorization"><strong>Autorización del administrador</strong><p className="hint">Solicita al administrador que complete personalmente estos campos.</p><label>Usuario administrador<input name="adminUsername" autoComplete="off" required minLength={3} maxLength={32} autoCapitalize="none" spellCheck={false}/></label><label>Contraseña del administrador<input name="adminPassword" type="password" autoComplete="off" required minLength={10} maxLength={72}/></label></div>
                <label>Nueva contraseña<input name="password" type="password" minLength={10} maxLength={72} autoComplete="new-password" required/></label>
                <label>Confirmar nueva contraseña<input name="confirmPassword" type="password" minLength={10} maxLength={72} autoComplete="new-password" required/></label>
                <p className="hint">Mínimo 10 caracteres y máximo 72 bytes. El cambio debe estar habilitado en Usuarios; la autorización vence a los 15 minutos y permite un solo cambio.</p>
              </>}
              <button className="button large full" disabled={busy}>{busy ? 'Procesando…' : mode === 'request' ? 'Solicitar autorización' : 'Guardar nueva contraseña'}</button>
            </fieldset>
          </form>
          <button className="recovery-link" disabled={busy} onClick={() => {setMode(mode === 'request' ? 'confirm' : 'request'); setMessage(null);}}>{mode === 'request' ? 'El administrador ya habilitó el cambio' : 'Solicitar autorización nuevamente'}</button>
        </> : <Link className="button full" to="/login">Iniciar sesión</Link>}
        {mode !== 'done' && <p className="registro"><Link to="/login">Volver al inicio de sesión</Link></p>}
      </article>
      <p className="hint">El administrador habilita el cambio y confirma con sus propias credenciales.</p>
    </section>
    <aside className="informacion-login"><div className="mensaje-login"><ShieldCheck size={44}/><h2>Recupera tu acceso<span>con autorización</span></h2><p>Tu administrador habilita el cambio. Tú eliges una contraseña nueva y privada.</p></div><img src="/img/login.png" alt="NexusStock para gestión segura de tu negocio"/></aside>
  </main>;
}

export function PasswordResetControl({user, isSelf, onChanged, onError}) {
  const [grant, setGrant] = useState(null), [busy, setBusy] = useState(false);
  const enabled = user.passwordResetExpiresAt && new Date(user.passwordResetExpiresAt) > new Date();
  const pending = Boolean(user.passwordResetRequestedAt);
  async function approve() {
    setBusy(true);
    try {const result = await api(`/users/${user._id}/password-reset`, {method: 'POST'}); setGrant(result); onChanged();}
    catch (error) {onError(error.message);} finally {setBusy(false);}
  }
  async function revoke() {
    setBusy(true);
    try {await api(`/users/${user._id}/password-reset`, {method: 'DELETE'}); setGrant(null); onChanged();}
    catch (error) {onError(error.message);} finally {setBusy(false);}
  }
  return <>
    <div className="password-reset-control">
      {enabled ? <span className="badge good">Cambio habilitado</span> : pending ? <span className="badge warning">Recuperación solicitada</span> : user.passwordResetExpiresAt ? <span className="badge warning">Autorización vencida</span> : <span className="hint">Sin autorización</span>}
      {enabled && <small>Hasta {date(user.passwordResetExpiresAt)}</small>}
      {pending && <small>Solicitud: {date(user.passwordResetRequestedAt)}</small>}
      <div className="password-reset-actions">
        <button className="button secondary small" disabled={isSelf || !user.active || busy} onClick={approve}>{busy ? 'Procesando…' : enabled ? 'Renovar autorización' : 'Habilitar cambio'}</button>
        {(pending || user.passwordResetExpiresAt) && <button className="button secondary small" disabled={isSelf || busy} onClick={revoke}>Revocar cambio</button>}
      </div>
      {isSelf && <small>Otro administrador debe autorizar tu recuperación.</small>}
    </div>
    {grant && <Modal title="Cambio de contraseña habilitado" onClose={() => setGrant(null)}>
      <p><strong>{grant.user.name}</strong> · Usuario: {grant.user.username}</p>
      <p className="hint">El cambio está habilitado hasta {date(grant.expiresAt)}. La persona debe abrir “¿Olvidaste tu contraseña?” y elegir “El administrador ya habilitó el cambio”.</p>
      <p className="hint">Un administrador activo debe introducir personalmente su nombre de usuario y contraseña en ese formulario para autorizar la nueva contraseña. No se genera ni se solicita un código.</p>
      <div className="form-actions"><button className="button secondary" disabled={busy} onClick={revoke}>Revocar cambio</button><button className="button" onClick={() => setGrant(null)}>Cerrar</button></div>
    </Modal>}
  </>;
}
