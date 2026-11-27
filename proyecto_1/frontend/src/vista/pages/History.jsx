import React from 'react';
import { Link } from 'react-router-dom';
import {Plus} from 'lucide-react';
import {money, date} from '../../modelo/api';

import {PageHeader, ResourceState, Empty, SearchBox, Pager} from '../components/ui';

import {Receipt} from './Receipt';
import {useHistoryController} from '../../controlador/historyController';

export function History(props) {
const {type}=props;
const {purchase,page,setPage,selected,setSelected,search,setSearch,term,r}=useHistoryController(props);
return <><PageHeader eyebrow="TRAZABILIDAD" title={`Historial de ${purchase?'compras':'ventas'}`} description="Consulta el detalle de tus operaciones registradas."><Link className="button" to={purchase?'/app/compras':'/app/ventas'}><Plus size={18}/>{purchase?'Nueva compra':'Nueva venta'}</Link></PageHeader><section className="panel no-pad"><div className="table-toolbar"><SearchBox value={search} onChange={s=>{setSearch(s);setPage(1);}} placeholder="Buscar por número de operación…"/></div><ResourceState resource={r}/>{!r.loading&&!r.error&&(r.data?.items.length?<div className="table-wrap"><table><thead><tr><th>Número</th><th>Fecha</th><th>{purchase?'Proveedor':'Cliente'}</th><th>Responsable</th><th>Total</th><th>Detalle</th></tr></thead><tbody>{r.data.items.map(op=><tr key={op._id}><td><strong>{op.number}</strong></td><td>{date(op.createdAt)}</td><td>{purchase?op.supplier:op.customer}</td><td>{op.user?.name}</td><td>{money(op.total)}</td><td><button className="button secondary small" onClick={()=>setSelected(op)}>Ver detalle</button></td></tr>)}</tbody></table></div>:<Empty text="Aún no hay operaciones registradas."/>)}<Pager page={page} setPage={setPage} total={r.data?.total}/></section>{selected&&<Receipt operation={selected} purchase={purchase} onClose={()=>setSelected(null)}/>}</>;
}
