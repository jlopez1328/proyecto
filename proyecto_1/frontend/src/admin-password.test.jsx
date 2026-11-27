import React from 'react';
import {beforeEach,expect,test,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import {AdminPasswordForm} from './vista/components/AdminPasswordForm';
import {Session} from './modelo/session';
import {api} from './modelo/api';
vi.mock('./modelo/api',async load=>({...await load(),api:vi.fn()}));
beforeEach(()=>{api.mockReset();});
function mount(onSaved=vi.fn(),setUser=vi.fn()){
 render(<Session.Provider value={{setUser}}><MemoryRouter><Routes><Route path="/" element={<AdminPasswordForm user={{_id:'user1',username:'persona',name:'Persona'}} onClose={vi.fn()} onSaved={onSaved}/>}/><Route path="/login" element={<h1>Iniciar sesión</h1>}/></Routes></MemoryRouter></Session.Provider>);
}
async function fill(confirm='5678'){
 const user=userEvent.setup();await user.type(screen.getByLabelText('Nueva contraseña',{exact:true}),'5678');await user.type(screen.getByLabelText('Confirmar nueva contraseña'),confirm);await user.click(screen.getByRole('button',{name:'Guardar nueva clave'}));
}
test('cambia una clave ajena sin pedir códigos ni contraseña de administrador',async()=>{
 const saved=vi.fn();api.mockResolvedValue({currentSessionEnded:false});mount(saved);await fill();
 expect(api).toHaveBeenCalledWith('/users/user1/password',{method:'PUT',body:{password:'5678',confirmPassword:'5678'}});expect(saved).toHaveBeenCalledTimes(1);
});
test('confirma coincidencia antes de enviar la clave',async()=>{
 mount();await fill('9999');expect(screen.getByRole('alert').textContent).toContain('no coinciden');expect(api).not.toHaveBeenCalled();
});
test('el cambio de clave propia cierra la sesión del administrador',async()=>{
 const setUser=vi.fn();api.mockResolvedValue({currentSessionEnded:true});mount(vi.fn(),setUser);await fill();expect(await screen.findByRole('heading',{name:'Iniciar sesión'})).toBeTruthy();expect(setUser).toHaveBeenCalledWith(null);
});
