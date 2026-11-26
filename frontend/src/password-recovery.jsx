import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, ShieldCheck } from 'lucide-react';
import { api, date } from './api';
import { useSession } from './session';
import { Modal, Notice } from './ui';

export function RecoveryPage() {
  const session = useSession();
  const [mode, setMode] = useState('request');
  const [email, setEmail] = useState('');
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
        <p className="muted">{mode === 'request' ? 'Solicita al administrador que habilite tu cambio de contraseña.' : mode === 'confirm' ? 'Introduce el código que te entregó el administrador y elige tu nueva contraseña.' : 'Ya puedes volver a ingresar a tu cuenta.'}</p>
        <Notice message={message}/>
        {mode !== 'done' ? <>
          <form onSubmit={submit} key={mode}>
            <fieldset disabled={busy}>
              <label>Correo electrónico<input name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required maxLength={254}/></label>
              {mode === 'confirm' && <>
                <label>Código autorizado<input name="code" required minLength={32} maxLength={32} autoComplete="off" spellCheck={false} placeholder="Pega el código del administrador"/></label>
                <label>Nueva contraseña<input name="password" type="password" minLength={10} maxLength={72} autoComplete="new-password" required/></label>
                <label>Confirmar nueva contraseña<input name="confirmPassword" type="password" minLength={10} maxLength={72} autoComplete="new-password" required/></label>
                <p className="hint">Mínimo 10 caracteres y máximo 72 bytes. El código vence en 15 minutos y se utiliza una sola vez.</p>
              </>}
              <button className="button large full" disabled={busy}>{busy ? 'Procesando…' : mode === 'request' ? 'Solicitar autorización' : 'Guardar nueva contraseña'}</button>
            </fieldset>
          </form>
          <button className="recovery-link" disabled={busy} onClick={() => {setMode(mode === 'request' ? 'confirm' : 'request'); setMessage(null);}}>{mode === 'request' ? 'Ya tengo un código' : 'Solicitar un nuevo código'}</button>
        </> : <Link className="button full" to="/login">Iniciar sesión</Link>}
        {mode !== 'done' && <p className="registro"><Link to="/login">Volver al inicio de sesión</Link></p>}
      </article>
      <p className="hint">El administrador debe verificar tu identidad antes de entregarte el código.</p>
    </section>
    <aside className="informacion-login"><div className="mensaje-login"><ShieldCheck size={44}/><h2>Recupera tu acceso<span>con autorización</span></h2><p>Tu administrador habilita el cambio. Tú eliges una contraseña nueva y privada.</p></div><img src="/img/login.png" alt="NexusStock para gestión segura de tu negocio"/></aside>
  </main>;
}

export function PasswordResetControl({user, isSelf, onChanged, onError}) {
  const [grant, setGrant] = useState(null), [busy, setBusy] = useState(false), [copied, setCopied] = useState(false);
  const enabled = user.passwordResetExpiresAt && new Date(user.passwordResetExpiresAt) > new Date();
  const pending = Boolean(user.passwordResetRequestedAt);
  async function approve() {
    setBusy(true); setCopied(false);
    try {const result = await api(`/users/${user._id}/password-reset`, {method: 'POST'}); setGrant(result); onChanged();}
    catch (error) {onError(error.message);} finally {setBusy(false);}
  }
  async function revoke() {
    setBusy(true);
    try {await api(`/users/${user._id}/password-reset`, {method: 'DELETE'}); setGrant(null); onChanged();}
    catch (error) {onError(error.message);} finally {setBusy(false);}
  }
  async function copy() {
    try {await navigator.clipboard.writeText(grant.code); setCopied(true);}
    catch {onError('No se pudo copiar. Selecciona el código y cópialo manualmente.');}
  }
  return <>
    <div className="password-reset-control">
      {enabled ? <span className="badge good">Cambio habilitado</span> : pending ? <span className="badge warning">Recuperación solicitada</span> : user.passwordResetExpiresAt ? <span className="badge warning">Código vencido</span> : <span className="hint">Sin autorización</span>}
      {enabled && <small>Hasta {date(user.passwordResetExpiresAt)}</small>}
      {pending && <small>Solicitud: {date(user.passwordResetRequestedAt)}</small>}
      <div className="password-reset-actions">
        <button className="button secondary small" disabled={isSelf || !user.active || busy} onClick={approve}>{busy ? 'Procesando…' : enabled ? 'Generar otro código' : 'Habilitar cambio'}</button>
        {(pending || user.passwordResetExpiresAt) && <button className="button secondary small" disabled={isSelf || busy} onClick={revoke}>Revocar cambio</button>}
      </div>
      {isSelf && <small>Otro administrador debe autorizar tu recuperación.</small>}
    </div>
    {grant && <Modal title="Cambio de contraseña habilitado" onClose={() => setGrant(null)}>
      <p><strong>{grant.user.name}</strong> · {grant.user.email}</p>
      <p className="hint">Verifica la identidad de la persona y entrégale este código directamente. Se muestra una sola vez; generar otro invalida el anterior.</p>
      <label className="reset-code">Código de recuperación<input value={grant.code} readOnly onFocus={event => event.target.select()} autoComplete="off" spellCheck={false}/></label>
      <p className="hint">Válido hasta {date(grant.expiresAt)}. La persona debe abrir “¿Olvidaste tu contraseña?” en el login y elegir “Ya tengo un código”.</p>
      {copied && <p role="status" className="hint">Código copiado.</p>}
      <div className="form-actions"><button className="button secondary" disabled={busy} onClick={revoke}>Revocar cambio</button><button className="button secondary" onClick={copy}>Copiar código</button><button className="button" onClick={() => setGrant(null)}>Cerrar</button></div>
    </Modal>}
  </>;
}
