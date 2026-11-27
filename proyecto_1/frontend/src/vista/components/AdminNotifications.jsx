import React from 'react';
import {Link} from 'react-router-dom';
import {Bell, X} from 'lucide-react';
import {useNotificationsController} from '../../controlador/notificationsController';

export function AdminNotifications() {
  const {open,setOpen,items,total,error}=useNotificationsController();
  return <div className="notifications">
    <button className="icon-button notification-bell" aria-label={`Solicitudes de cambio de contraseña: ${total}`} aria-expanded={open} aria-controls="admin-notifications" title="Solicitudes de cambio de contraseña" onClick={()=>setOpen(!open)}><Bell size={20}/>{total>0&&<span className="notification-count">{total>99?'99+':total}</span>}</button>
    <span className="sr-only" role="status" aria-live="polite">{total>0?`Tienes ${total} solicitudes pendientes de cambio de contraseña.`:''}</span>
    {open&&<section className="notification-panel" id="admin-notifications" aria-label="Notificaciones del administrador">
      <div className="notification-heading"><strong>Solicitudes pendientes ({total})</strong><button className="icon-button" aria-label="Cerrar notificaciones" onClick={()=>setOpen(false)}><X size={18}/></button></div>
      {error?<p role="alert">{error}</p>:items.length?items.map(item=><Link key={item._id} to="/app/usuarios" onClick={()=>setOpen(false)} aria-label={`Revisar solicitud de ${item.username}`}><strong>{item.name}</strong><span>{item.username} solicita cambiar su contraseña.</span></Link>):<p>No hay solicitudes pendientes.</p>}
      <Link className="notification-all" to="/app/usuarios" onClick={()=>setOpen(false)}>Abrir Usuarios para autorizar</Link>
    </section>}
  </div>;
}
