import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {api} from './modelo/api';
import {discardTabSession,tabSessionKey} from './modelo/tabSession';
beforeEach(()=>{discardTabSession();sessionStorage.clear();localStorage.clear();});
afterEach(()=>{vi.unstubAllGlobals();});
test('usa la misma clave durante la navegación y no la guarda en almacenamiento persistente',async()=>{
  const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({})});vi.stubGlobal('fetch',fetch);
  await api('/auth/login',{method:'POST',body:{username:'persona',password:'1234'}});await api('/auth/me');
  const first=fetch.mock.calls[0][1].headers['X-Tab-Session'];
  expect(first).toMatch(/^[a-f\d-]{36}$/);expect(fetch.mock.calls[1][1].headers['X-Tab-Session']).toBe(first);
  expect(sessionStorage.length).toBe(0);expect(localStorage.length).toBe(0);
});
test('al salir de la página descarta la clave y no puede reutilizarla al reabrir',()=>{
  const previous=tabSessionKey();window.dispatchEvent(new Event('pagehide'));
  expect(tabSessionKey()).not.toBe(previous);
});
test('volver desde la caché descarta el acceso anterior y avisa a la aplicación',()=>{
  const previous=tabSessionKey(),expired=vi.fn();window.addEventListener('session-expired',expired);
  const event=new Event('pageshow');Object.defineProperty(event,'persisted',{value:true});window.dispatchEvent(event);
  expect(expired).toHaveBeenCalledTimes(1);expect(tabSessionKey()).not.toBe(previous);
  window.removeEventListener('session-expired',expired);
});
