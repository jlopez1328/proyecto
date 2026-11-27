import {useState} from 'react';
import {api} from '../modelo/api';
import {useSession} from '../modelo/session';
export function useRecoveryPageController() {
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
  return {session,mode,setMode,username,setUsername,message,setMessage,busy,setBusy,submit};
}

export function usePasswordResetControlController({user, isSelf, onChanged, onError}) {
const [grant, setGrant] = useState(null), [busy, setBusy] = useState(false);
  const enabled = Boolean(user.passwordResetApprovedAt);
  const pending = Boolean(user.passwordResetRequestedAt);
  async function approve() {
    setBusy(true);
    try {const result = await api(`/users/${user._id}/password-reset`, {method: 'POST'}); setGrant(result); onChanged(); window.dispatchEvent(new Event('password-reset-updated'));}
    catch (error) {onError(error.message);} finally {setBusy(false);}
  }
  async function revoke() {
    setBusy(true);
    try {await api(`/users/${user._id}/password-reset`, {method: 'DELETE'}); setGrant(null); onChanged(); window.dispatchEvent(new Event('password-reset-updated'));}
    catch (error) {onError(error.message);} finally {setBusy(false);}
  }
  return {grant,setGrant,busy,setBusy,enabled,pending,approve,revoke};
}
