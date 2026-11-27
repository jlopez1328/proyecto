import React from 'react';
import {beforeEach,expect,test,vi} from 'vitest';
import {render,screen,waitFor,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {UsersPage} from './vista/pages/Users';
import {Session} from './modelo/session';
import {api} from './modelo/api';
vi.mock('./modelo/api',async load=>({...await load(),api:vi.fn()}));
const admin={_id:'admin1',name:'Administrador',username:'admin',role:'administrador',active:true,createdAt:'2026-01-01'};
const person={_id:'seller1',name:'Vendedor',username:'vendedor',email:'seller@test.local',role:'vendedor',active:true,createdAt:'2026-01-01'};
beforeEach(()=>{api.mockReset();});
function mount(){return render(<Session.Provider value={{user:admin,setUser:vi.fn()}}><MemoryRouter><UsersPage/></MemoryRouter></Session.Provider>);}
test('papelera abre confirmación, cancela, elimina y recupera desde Usuarios eliminados',async()=>{
  const user=userEvent.setup();let deleted=false;
  api.mockImplementation(async(path,options)=>{
    if(options?.method==='DELETE'){deleted=true;return {message:'Usuario eliminado.'};}
    if(options?.method==='POST'){deleted=false;return {message:'Usuario recuperado como inactivo.'};}
    const archived=path.includes('archived=true');return {items:archived?(deleted?[{...person,active:false,deletedAt:'2026-11-26'}]:[]):(deleted?[]:[person]),total:archived?Number(deleted):Number(!deleted)};
  });
  mount();await user.click(await screen.findByRole('button',{name:'Eliminar usuario vendedor'}));
  expect(screen.getByRole('heading',{name:'Eliminar usuario'})).toBeTruthy();
  expect(api.mock.calls.some(([,opts])=>opts?.method==='DELETE')).toBe(false);
  await user.click(screen.getByRole('button',{name:'Cancelar'}));expect(screen.queryByRole('dialog')).toBeNull();
  await user.click(screen.getByRole('button',{name:'Eliminar usuario vendedor'}));
  await user.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Eliminar usuario',exact:true}));
  await waitFor(()=>expect(screen.queryByRole('button',{name:'Eliminar usuario vendedor'})).toBeNull());
  await user.click(screen.getByRole('button',{name:'Usuarios eliminados'}));
  await user.click(await screen.findByRole('button',{name:'Recuperar usuario vendedor'}));
  await waitFor(()=>expect(screen.queryByRole('button',{name:'Recuperar usuario vendedor'})).toBeNull());
  expect(api).toHaveBeenCalledWith('/users/seller1',{method:'DELETE'});expect(api).toHaveBeenCalledWith('/users/seller1/restore',{method:'POST'});
});
test('la papelera de la cuenta propia está deshabilitada',async()=>{
  api.mockResolvedValue({items:[admin],total:1});mount();
  expect((await screen.findByRole('button',{name:'Eliminar usuario admin'})).disabled).toBe(true);
});
