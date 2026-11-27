import React, {useEffect, useRef} from 'react';
import { Search, X, PackageOpen, RefreshCw } from 'lucide-react';

export function PageHeader({eyebrow,title,description,children}) {return <div className="page-heading"><div><p className="eyebrow">{eyebrow || 'TU NEGOCIO, CONECTADO'}</p><h1>{title}</h1><p className="muted">{description}</p></div><div className="heading-actions">{children}</div></div>;}
export function Notice({message}) {if(!message)return null;return <p className={`alert ${message.type || 'success'}`} role={message.type==='error'?'alert':'status'}>{message.text || message}</p>;}
export function ResourceState({resource}) {return resource.loading ? <p className="empty-state" role="status">Cargando información…</p> : resource.error ? <div className="empty-state"><p className="error-text" role="alert">{resource.error}</p><button className="button secondary" onClick={resource.refresh}><RefreshCw size={16}/>Reintentar</button></div> : null;}
export function Empty({text='No hay registros todavía.',children}) {return <div className="empty-state"><PackageOpen/><p>{text}</p>{children}</div>;}
export function SearchBox({value,onChange,placeholder='Buscar por nombre o código…'}) {return <div className="search-box"><Search size={18}/><input aria-label={placeholder} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} maxLength={160}/></div>;}
export function Pager({page,setPage,total=0,limit=20}) {const pages=Math.max(1,Math.ceil(total/limit));return <div className="pager"><span>{total} registros · Página {page} de {pages}</span><div><button className="button secondary small" disabled={page<=1} onClick={()=>setPage(page-1)}>Anterior</button><button className="button secondary small" disabled={page>=pages} onClick={()=>setPage(page+1)}>Siguiente</button></div></div>;}
export function Modal({title,onClose,children,wide=false}) {
  const dialog=useRef(null);
  useEffect(()=>{const d=dialog.current;d.showModal();return ()=>d.close();},[]);
  return <dialog ref={dialog} className={`modal ${wide?'wide':''}`} onCancel={onClose}><div className="modal-header"><h2>{title}</h2><button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar"><X/></button></div>{children}</dialog>;
}
export function NumberField({label,value,onChange,min=0,max=1000000000,step='0.01',...rest}) {return <label>{label}<input type="number" min={min} max={max} step={step} value={value} onChange={e=>onChange(e.target.value===''?'':Number(e.target.value))} required {...rest}/></label>;}
