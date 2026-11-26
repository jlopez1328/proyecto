import React from 'react';
import { beforeEach, test, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RecoveryPage, PasswordResetControl } from './password-recovery';
import { Session } from './session';
import { api } from './api';
vi.mock('./api',async load=>({...await load(),api:vi.fn()}));
beforeEach(()=>{api.mockReset();});
function page(){return render(<Session.Provider value={{user:null,setUser:vi.fn()}}><MemoryRouter><RecoveryPage/></MemoryRouter></Session.Provider>);}
async function fill(user,confirmation='NuevaClaveSegura2026!') {
  await user.click(screen.getByRole('button',{name:'El administrador ya habilitó el cambio'}));
  await user.type(screen.getByLabelText('Nombre de usuario',{exact:true}),'persona');
  await user.type(screen.getByLabelText('Usuario administrador'),'admin');
  await user.type(screen.getByLabelText('Contraseña del administrador'),'ClaveAdmin2026!');
  await user.type(screen.getByLabelText('Nueva contraseña',{exact:true}),'NuevaClaveSegura2026!');
  await user.type(screen.getByLabelText('Confirmar nueva contraseña'),confirmation);
}
test('solicita habilitación y muestra autorización con credenciales administrativas',async()=>{
  const user=userEvent.setup();api.mockResolvedValue({message:'Solicitud recibida por el administrador.'});page();
  await user.type(screen.getByLabelText('Nombre de usuario',{exact:true}),'persona');await user.click(screen.getByRole('button',{name:'Solicitar autorización'}));
  expect(api).toHaveBeenCalledWith('/auth/password-reset/request',{method:'POST',body:{username:'persona'}});
  expect(await screen.findByLabelText('Contraseña del administrador')).toBeTruthy();expect(screen.getByRole('status').textContent).toContain('Solicitud recibida');
  expect(screen.queryByLabelText('Código autorizado')).toBeNull();
});
test('confirma nueva contraseña con credenciales administrativas y vuelve al login',async()=>{
  const user=userEvent.setup();api.mockResolvedValue({message:'Contraseña actualizada.'});page();await fill(user);
  await user.click(screen.getByRole('button',{name:'Guardar nueva contraseña'}));
  expect((await screen.findByRole('link',{name:'Iniciar sesión'})).getAttribute('href')).toBe('/login');
  expect(api).toHaveBeenCalledWith('/auth/password-reset/confirm',{method:'POST',body:{username:'persona',adminUsername:'admin',adminPassword:'ClaveAdmin2026!',password:'NuevaClaveSegura2026!',confirmPassword:'NuevaClaveSegura2026!'}});
});
test('muestra credenciales administrativas incorrectas sin anunciar un cambio exitoso',async()=>{
  const user=userEvent.setup();api.mockRejectedValue(new Error('Usuario o contraseña del administrador incorrectos.'));page();await fill(user);
  await user.click(screen.getByRole('button',{name:'Guardar nueva contraseña'}));
  expect((await screen.findByRole('alert')).textContent).toContain('administrador incorrectos');
  expect(screen.getByLabelText('Nueva contraseña',{exact:true})).toBeTruthy();expect(screen.queryByRole('status')).toBeNull();
});
test('muestra contraseñas diferentes sin enviar el cambio',async()=>{
  const user=userEvent.setup();page();await fill(user,'OtraClaveSegura2026!');
  await user.click(screen.getByRole('button',{name:'Guardar nueva contraseña'}));expect(screen.getByRole('alert').textContent).toContain('no coinciden');expect(api).not.toHaveBeenCalled();
});
test('administrador habilita y revoca sin generar un código',async()=>{
  const user=userEvent.setup(),changed=vi.fn();
  const target={_id:'123456789012345678901234',name:'Persona',username:'persona',email:'persona@test.local',active:true,passwordResetRequestedAt:new Date().toISOString()};
  api.mockImplementation(async(path,opts)=>opts.method==='POST'?{expiresAt:new Date(Date.now()+900000).toISOString(),user:target}:{message:'Revocado'});
  render(<PasswordResetControl user={target} onChanged={changed} onError={vi.fn()}/>);
  expect(screen.getByText('Recuperación solicitada')).toBeTruthy();await user.click(screen.getByRole('button',{name:'Habilitar cambio'}));
  expect(await screen.findByRole('heading',{name:'Cambio de contraseña habilitado'})).toBeTruthy();expect(changed).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button',{name:'Copiar código'})).toBeNull();
  await user.click(screen.getAllByRole('button',{name:'Revocar cambio'}).at(-1));
  await waitFor(()=>expect(screen.queryByRole('heading',{name:'Cambio de contraseña habilitado'})).toBeNull());
  expect(api).toHaveBeenCalledWith('/users/'+target._id+'/password-reset',{method:'DELETE'});
});
test('cuentas inactivas y cuenta propia no permiten habilitar',()=>{
  const {rerender}=render(<PasswordResetControl user={{_id:'1',active:false}} onChanged={vi.fn()} onError={vi.fn()}/>);
  expect(screen.getByRole('button',{name:'Habilitar cambio'}).disabled).toBe(true);
  rerender(<PasswordResetControl user={{_id:'1',active:true}} isSelf onChanged={vi.fn()} onError={vi.fn()}/>);
  expect(screen.getByRole('button',{name:'Habilitar cambio'}).disabled).toBe(true);
});
