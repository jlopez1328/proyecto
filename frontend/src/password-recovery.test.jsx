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
const code='A'.repeat(32);
function page(){return render(<Session.Provider value={{user:null,setUser:vi.fn()}}><MemoryRouter><RecoveryPage/></MemoryRouter></Session.Provider>);}
test('solicita autorización y muestra formulario para usar el código',async()=>{
  const user=userEvent.setup();api.mockResolvedValue({message:'Solicitud recibida por el administrador.'});page();
  await user.type(screen.getByLabelText('Correo electrónico'),'persona@test.local');await user.click(screen.getByRole('button',{name:'Solicitar autorización'}));
  expect(api).toHaveBeenCalledWith('/auth/password-reset/request',{method:'POST',body:{email:'persona@test.local'}});
  expect(await screen.findByLabelText('Código autorizado')).toBeTruthy();expect(screen.getByRole('status').textContent).toContain('Solicitud recibida');
});
test('confirma la nueva contraseña y regresa al acceso normal',async()=>{
  const user=userEvent.setup();api.mockResolvedValue({message:'Contraseña actualizada.'});page();
  await user.click(screen.getByRole('button',{name:'Ya tengo un código'}));
  await user.type(screen.getByLabelText('Correo electrónico'),'persona@test.local');await user.type(screen.getByLabelText('Código autorizado'),code);
  await user.type(screen.getByLabelText('Nueva contraseña',{exact:true}),'NuevaClaveSegura2026!');await user.type(screen.getByLabelText('Confirmar nueva contraseña'),'NuevaClaveSegura2026!');
  await user.click(screen.getByRole('button',{name:'Guardar nueva contraseña'}));
  expect((await screen.findByRole('link',{name:'Iniciar sesión'})).getAttribute('href')).toBe('/login');
  expect(api).toHaveBeenCalledWith('/auth/password-reset/confirm',{method:'POST',body:{email:'persona@test.local',code,password:'NuevaClaveSegura2026!',confirmPassword:'NuevaClaveSegura2026!'}});
});
test('muestra contraseñas diferentes sin enviar el cambio',async()=>{
  const user=userEvent.setup();page();await user.click(screen.getByRole('button',{name:'Ya tengo un código'}));
  await user.type(screen.getByLabelText('Correo electrónico'),'persona@test.local');await user.type(screen.getByLabelText('Código autorizado'),code);
  await user.type(screen.getByLabelText('Nueva contraseña',{exact:true}),'NuevaClaveSegura2026!');await user.type(screen.getByLabelText('Confirmar nueva contraseña'),'OtraClaveSegura2026!');
  await user.click(screen.getByRole('button',{name:'Guardar nueva contraseña'}));expect(screen.getByRole('alert').textContent).toContain('no coinciden');expect(api).not.toHaveBeenCalled();
});
test('administrador habilita, ve código una sola vez y puede revocarlo',async()=>{
  const user=userEvent.setup(),changed=vi.fn();
  const target={_id:'123456789012345678901234',name:'Persona',email:'persona@test.local',active:true,passwordResetRequestedAt:new Date().toISOString()};
  api.mockImplementation(async(path,opts)=>opts.method==='POST'?{code,expiresAt:new Date(Date.now()+900000).toISOString(),user:target}:{message:'Revocado'});
  render(<PasswordResetControl user={target} onChanged={changed} onError={vi.fn()}/>);
  expect(screen.getByText('Recuperación solicitada')).toBeTruthy();await user.click(screen.getByRole('button',{name:'Habilitar cambio'}));
  expect((await screen.findByLabelText('Código de recuperación')).value).toBe(code);expect(changed).toHaveBeenCalledTimes(1);
  await user.click(screen.getAllByRole('button',{name:'Revocar cambio'}).at(-1));
  await waitFor(()=>expect(screen.queryByLabelText('Código de recuperación')).toBeNull());
  expect(api).toHaveBeenCalledWith(`/users/${target._id}/password-reset`,{method:'DELETE'});
});
test('cuentas inactivas y cuenta propia no permiten habilitar',()=>{
  const {rerender}=render(<PasswordResetControl user={{_id:'1',active:false}} onChanged={vi.fn()} onError={vi.fn()}/>);
  expect(screen.getByRole('button',{name:'Habilitar cambio'}).disabled).toBe(true);
  rerender(<PasswordResetControl user={{_id:'1',active:true}} isSelf onChanged={vi.fn()} onError={vi.fn()}/>);
  expect(screen.getByRole('button',{name:'Habilitar cambio'}).disabled).toBe(true);
});
