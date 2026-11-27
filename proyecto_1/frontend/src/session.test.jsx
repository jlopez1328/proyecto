import React, {useState} from 'react';
import {beforeEach, expect, test, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter, Routes, Route} from 'react-router-dom';
import {Shell} from './vista/layouts/Shell';
import {Guard} from './vista/components/Guard';
import {Session} from './modelo/session';
import {api} from './modelo/api';
vi.mock('./modelo/api', async load => ({...await load(), api:vi.fn()}));
beforeEach(() => {api.mockReset();});
function mount(role) {
  function Harness() {
    const [user,setUser]=useState({_id:'user1',name:'Persona de prueba',role});
    return <Session.Provider value={{user,setUser}}><MemoryRouter initialEntries={['/app']}><Routes>
      <Route path="/login" element={<h1>Iniciar sesión</h1>}/>
      <Route element={<Guard/>}><Route path="/app" element={<Shell/>}><Route index element={<h1>Resumen de prueba</h1>}/></Route></Route>
    </Routes></MemoryRouter></Session.Provider>;
  }
  return render(<Harness/>);
}
test.each(['vendedor','comprador','administrador'])('cierra sesión desde la barra superior con rol %s', async role => {
  api.mockResolvedValue({message:'Sesión cerrada'});
  mount(role);
  const header=screen.getByRole('banner');
  await userEvent.click(within(header).getByRole('button',{name:'Cerrar sesión'}));
  expect(await screen.findByRole('heading',{name:'Iniciar sesión'})).toBeTruthy();
  expect(screen.queryByRole('navigation')).toBeNull();
  expect(api).toHaveBeenCalledWith('/auth/logout',{method:'POST'});
});
test('un fallo de conexión mantiene la sesión y permite reintentar el cierre',async()=>{
  let attempts=0;
  api.mockImplementation(async path=>{if(path==='/users/password-reset/requests')return {items:[],total:0};if(attempts++===0)throw new Error('Sin conexión');return {};});
  mount('administrador');
  await userEvent.click(screen.getByRole('button',{name:'Cerrar sesión'}));
  expect((await screen.findByRole('alert')).textContent).toContain('Sin conexión');
  expect(screen.getByRole('heading',{name:'Resumen de prueba'})).toBeTruthy();
  await userEvent.click(screen.getByRole('button',{name:'Cerrar sesión'}));
  expect(await screen.findByRole('heading',{name:'Iniciar sesión'})).toBeTruthy();
});
test('una sesión ya vencida regresa al acceso sin bloquear el cierre',async()=>{
  api.mockImplementation(async () => {throw Object.assign(new Error('Sesión vencida'), {status:401});});
  mount('vendedor');
  await userEvent.click(screen.getByRole('button',{name:'Cerrar sesión'}));
  expect(await screen.findByRole('heading',{name:'Iniciar sesión'})).toBeTruthy();
});
