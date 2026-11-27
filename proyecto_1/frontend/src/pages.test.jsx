import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Sales, Purchases, Inventory } from './vista/pages';
import { api, totals, suggested } from './modelo/api';
vi.mock('./modelo/api', async importOriginal=>({...await importOriginal(),api:vi.fn()}));
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
  test('Inventario permite cantidad inicial al crear y cantidad disponible al modificar',async()=>{
    const user=userEvent.setup();let stored=null;
    api.mockImplementation(async(path,options)=>{
      if(path.startsWith('/products?'))return {items:stored?[stored]:[],total:stored?1:0};
      if(path==='/products'){stored={...product,...options.body,name:'Producto de inventario',stock:options.body.initialStock};return {product:stored};}
      if(options?.method==='PATCH'){stored={...stored,...options.body};return {product:stored};}
      throw new Error(path);
    });
    mount(<Inventory/>);await user.click(screen.getByRole('button',{name:'Crear producto'}));
    await user.type(screen.getByLabelText('Nombre del producto'),'Producto de inventario');
    await user.clear(screen.getByLabelText('Cantidad inicial'));await user.type(screen.getByLabelText('Cantidad inicial'),'9');
    await user.click(screen.getByRole('button',{name:'Guardar producto'}));
    await user.click(await screen.findByRole('button',{name:'Modificar Producto de inventario'}));
    expect(screen.getByLabelText('Cantidad disponible').value).toBe('9');
    await user.clear(screen.getByLabelText('Cantidad disponible'));await user.type(screen.getByLabelText('Cantidad disponible'),'11');
    await user.click(screen.getByRole('button',{name:'Guardar producto'}));
    await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText('11 unidades')).toBeTruthy();
    expect(api.mock.calls.find(([path])=>path==='/products')[1].body.initialStock).toBe(9);
    expect(api.mock.calls.find(([,opts])=>opts?.method==='PATCH')[1].body).toMatchObject({stock:11,expectedStock:9});
  });
  test('modifica un producto existente desde Compras y conserva las cantidades del carrito',async()=>{
    const user=userEvent.setup();let stored={...product};
    api.mockImplementation(async(path,options)=>{
      if(path.startsWith('/products?'))return {items:[stored],total:1};
      if(path===`/products/${product._id}`&&options.method==='PATCH'){stored={...stored,...options.body};return {product:stored};}
      throw new Error(path);
    });
    mount(<Purchases/>);
    await user.click(await screen.findByRole('button',{name:'Agregar'}));
    await user.clear(screen.getByLabelText('Cantidad'));await user.type(screen.getByLabelText('Cantidad'),'2');
    await user.click(screen.getByRole('button',{name:'Modificar Arroz premium'}));
    const name=screen.getByLabelText('Nombre del producto');expect(name.value).toBe('Arroz premium');
    await user.clear(name);await user.type(name,'Arroz actualizado');
    await user.clear(screen.getByLabelText('Categoría'));await user.type(screen.getByLabelText('Categoría'),'Abarrotes');
    await user.clear(screen.getByLabelText('Cantidad disponible'));await user.type(screen.getByLabelText('Cantidad disponible'),'12');
    await user.click(screen.getByRole('button',{name:'Guardar producto'}));
    await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByLabelText('Cantidad').value).toBe('2');
    expect(api.mock.calls.find(([path,opts])=>path===`/products/${product._id}`&&opts.method==='PATCH')[1].body).toMatchObject({name:'Arroz actualizado',category:'Abarrotes',netPrice:1000,vat:19,tax:0,margin:30,minStock:2,salePrice:1547,stock:12,expectedStock:10});
    expect(await screen.findByRole('button',{name:'Modificar Arroz actualizado'})).toBeTruthy();
  });
  test('el catálogo de ventas no ofrece modificar productos',async()=>{
    api.mockResolvedValue({items:[product],total:1});mount(<Sales/>);
    await screen.findByRole('button',{name:'Agregar'});
    expect(screen.queryByRole('button',{name:'Modificar Arroz premium'})).toBeNull();
  });
  test('un conflicto de cantidad mantiene abierto el formulario y conserva lo escrito',async()=>{
    const user=userEvent.setup();api.mockImplementation(async(path,options)=>{if(options?.method==='PATCH')throw new Error('La cantidad cambió por otra operación.');return {items:[product],total:1};});
    mount(<Inventory/>);await user.click(await screen.findByRole('button',{name:'Modificar Arroz premium'}));
    await user.clear(screen.getByLabelText('Cantidad disponible'));await user.type(screen.getByLabelText('Cantidad disponible'),'8');
    await user.click(screen.getByRole('button',{name:'Guardar producto'}));
    expect((await screen.findByRole('alert')).textContent).toContain('La cantidad cambió');
    expect(screen.getByLabelText('Cantidad disponible').value).toBe('8');
  });
  test('crear producto permite elegir cantidad y la registra solo al confirmar la compra',async()=>{
    const user=userEvent.setup();let created=null;
    api.mockImplementation(async(path,options)=>{
      if(path.startsWith('/products?'))return {items:created?[created]:[],total:created?1:0};
      if(path==='/products'&&options.method==='POST'){created={...product,...options.body,stock:0};return {product:created};}
      if(path==='/purchases')return {purchase:{...options.body,number:'COM-000002',subtotal:7000,total:8330,createdAt:new Date().toISOString(),lines:[{product:product._id,name:'Producto nuevo',quantity:7,unitPrice:1190,total:8330}]}};
      throw new Error(path);
    });
    mount(<Purchases/>);await user.click(screen.getByRole('button',{name:'Crear producto'}));
    const dialog=screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nombre del producto'),'Producto nuevo');
    await user.clear(within(dialog).getByLabelText('Cantidad a comprar'));await user.type(within(dialog).getByLabelText('Cantidad a comprar'),'7');
    await user.clear(within(dialog).getByLabelText('Precio neto (COP)'));await user.type(within(dialog).getByLabelText('Precio neto (COP)'),'1000');
    await user.click(within(dialog).getByRole('button',{name:'Guardar producto'}));
    await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByLabelText('Cantidad').value).toBe('7');expect(created.stock).toBe(0);
    const body=api.mock.calls.find(([path])=>path==='/products')[1].body;
    expect(body).not.toHaveProperty('stock');expect(body).not.toHaveProperty('quantity');
    expect(api.mock.calls.some(([path])=>path==='/purchases')).toBe(false);
    await user.type(screen.getByLabelText('Proveedor'),'Proveedor de prueba');
    await user.click(screen.getByRole('button',{name:'Confirmar compra'}));
    await screen.findByText('Operación registrada');
    expect(api.mock.calls.find(([path])=>path==='/purchases')[1].body.lines[0].quantity).toBe(7);
  });
  test('descuentos se aplican en orden y costo incluye ambos impuestos',()=>{
    expect(totals([{salePrice:100,quantity:2,discount:10}],20)).toEqual({subtotal:200,total:144});
    expect(suggested({netPrice:100,vat:19,tax:5,margin:30})).toBe(161.2);
  });
});
