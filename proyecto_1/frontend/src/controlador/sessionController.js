import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {api} from '../modelo/api';
import {useSession} from '../modelo/session';

export function useAppController() {
  const [user, setUser] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  async function load() {
    setError(''); setLoading(true);
    try {const data = await api('/auth/me'); setUser(data.user);}
    catch (err) {if (err.status !== 401) setError('No se pudo conectar con el servidor. Verifica que esté iniciado.');}
    finally {setLoading(false);}
  }
  useEffect(() => {
    load();
    const expired = () => setUser(null);
    window.addEventListener('session-expired', expired);
    return () => window.removeEventListener('session-expired', expired);
  }, []);
  return {user, setUser, loading, error, load};
}

export function useAuthController({register = false}) {
  const {user, setUser} = useSession();
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const data = await api(register ? '/auth/register' : '/auth/login', {method: 'POST', body});
      setUser(data.user); navigate('/app', {replace: true});
    } catch (err) {setError(err.message);}
    finally {setBusy(false);}
  }
  return {user, error, busy, submit};
}

export function useShellController() {
  const {user, setUser} = useSession();
  const [open, setOpen] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const seller = ['vendedor', 'administrador'].includes(user.role), buyer = ['comprador', 'administrador'].includes(user.role);
  async function logout() {
    if (busy) return;
    setBusy(true); setError('');
    try {await api('/auth/logout', {method: 'POST'});}
    catch (err) {
      // An expired session is already closed; a network failure must allow retry.
      if (err.status !== 401) {setError(err.message); setBusy(false); return;}
    }
    setOpen(false); setUser(null); navigate('/login', {replace: true});
  }
  return {user, open, setOpen, error, busy, seller, buyer, logout};
}
