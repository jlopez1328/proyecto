import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Sales, Purchases, Inventory } from './pages';
import { api, totals, suggested } from './api';
vi.mock('./api', async importOriginal=>({...await importOriginal(),api:vi.fn()}));
const product={_id:'123456789012345678901234',name:'Arroz premium',code:'PRD-000001',category:'Granos',stock:10,minStock:2,damaged:0,netPrice:1000,vat:19,tax:0,margin:30,salePrice:1547,suggestedPrice:1547};
beforeEach(()=>{api.mockReset();});
function mount(element){return render(<MemoryRouter>{element}</MemoryRouter>);}
describe('Flujos de la interfaz',()=>{
  test('agrega al carrito, combina descuentos y envía la venta al servidor',async()=>{
    const user=userEvent.setup();
    api.mockImplementation(async(path,options)=>{
      if(path.startsWith('/catalog'))return {items:[product],total:1};
      if(path==='/sales')return {sale:{...options.body,number:'VEN-000001',createdAt:new Date().toISOString(),subtotal:3094,total:2227.68,lines:[{product:product._id,name:product.name,code:product.code,quantity:2,unitPrice:1547,discount:10,total:2784.6}]}};
      throw Error(path);
    });
    mount(<Sales/>);
    await user.click(await screen.findByRole('button',{name:'Agregar'}));
    const quantity=screen.getByLabelText('Cantidad');await user.clear(quantity);await user.type(quantity,'2');
    const individual=screen.getByLabelText('Descuento (%)');await user.clear(individual);await user.type(individual,'10');
    const general=screen.getByLabelText('Descuento general (%)');await user.clear(general);await user.type(general,'20');
    await user.click(screen.getByRole('button',{name:'Confirmar venta'}));
    await screen.findByText('Operación registrada');
    const call=api.mock.calls.find(([path])=>path==='/sales');
    expect(call[1].body.lines).toEqual([{product:product._id,quantity:2,discount:10}]);
    expect(call[1].body.discount).toBe(20);
    expect(call[1].body.requestId).toMatch(/^[\da-f-]{36}$/);
  });
  test('compra envía neto, impuestos, ganancia y proveedor',async()=>{
    const user=userEvent.setup();
    api.mockImplementation(async(path,options)=>path.startsWith('/products?')?{items:[product],total:1}:{purchase:{...options.body,number:'COM-000001',total:1190,subtotal:1000,createdAt:new Date().toISOString(),lines:[{product:product._id,name:product.name,quantity:1,unitPrice:1190,total:1190}]}});
    mount(<Purchases/>);await user.click(await screen.findByRole('button',{name:'Agregar'}));await user.type(screen.getByLabelText('Proveedor'),'Distribuidor Norte');await user.click(screen.getByRole('button',{name:'Confirmar compra'}));
    await screen.findByText('Operación registrada');
    expect(api.mock.calls.find(([path])=>path==='/purchases')[1].body).toMatchObject({supplier:'Distribuidor Norte',lines:[{product:product._id,quantity:1,netPrice:1000,vat:19,tax:0,margin:30}]});
  });
  test('informa un conflicto de stock sin borrar el carrito',async()=>{
    const user=userEvent.setup();api.mockImplementation(async path=>{if(path.startsWith('/catalog'))return {items:[product],total:1};throw Error('Existencias insuficientes');});
    mount(<Sales/>);await user.click(await screen.findByRole('button',{name:'Agregar'}));await user.click(screen.getByRole('button',{name:'Confirmar venta'}));expect((await screen.findByRole('alert')).textContent).toContain('Existencias insuficientes');expect(screen.getByLabelText('Cantidad').value).toBe('1');
  });
  test('inventario conserva precio y no permite eliminar productos con stock',async()=>{
    api.mockResolvedValue({items:[product],total:1});mount(<Inventory/>);await screen.findByText('Arroz premium');expect(screen.getByRole('button',{name:'Eliminar Arroz premium'}).disabled).toBe(true);expect(screen.getByRole('button',{name:'Modificar Arroz premium'}).disabled).toBe(false);
  });
  test('descuentos se aplican en orden y costo incluye ambos impuestos',()=>{
    expect(totals([{salePrice:100,quantity:2,discount:10}],20)).toEqual({subtotal:200,total:144});
    expect(suggested({netPrice:100,vat:19,tax:5,margin:30})).toBe(161.2);
  });
});
