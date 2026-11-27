import React from 'react';
import {NavLink, Outlet} from 'react-router-dom';
import {ShoppingCart, ShoppingBag, Package, LayoutDashboard, Users, LogOut, ShieldCheck, Menu, X} from 'lucide-react';
import {Logo} from '../components/Logo';
import {useShellController} from '../../controlador/sessionController';
import {AdminNotifications} from '../components/AdminNotifications';

export function Shell() {
  const {user, open, setOpen, error, busy, seller, buyer, logout} = useShellController();
  return <div className="app-shell">
    <aside className={`sidebar ${open ? 'opened' : ''}`}>
      <Logo/><p className="nav-label">ESPACIO DE TRABAJO</p>
      <nav onClick={() => setOpen(false)}>
        <NavLink end to="/app"><LayoutDashboard/>Resumen</NavLink>
        {seller && <NavLink to="/app/ventas"><ShoppingCart/>Ventas</NavLink>}
        {buyer && <><NavLink to="/app/compras"><ShoppingBag/>Compras</NavLink><NavLink to="/app/inventario"><Package/>Inventario</NavLink></>}
        {user.role === 'administrador' && <NavLink to="/app/usuarios"><Users/>Usuarios</NavLink>}
      </nav>
      <div className="sidebar-bottom"><div className="workspace-note"><ShieldCheck/><strong>Todo bajo control</strong><p>Información actualizada en cada operación.</p></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <button className="icon-button mobile-menu" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
        <span className="muted">Gestión comercial <span className="top-divider">/</span> Tu negocio, en orden</span>
        <div className="account"><span className="avatar">{user.name.slice(0,2).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.role}</small></div></div>
        {user.role === 'administrador' && <AdminNotifications/>}
        <button className="button secondary session-logout" onClick={logout} disabled={busy} aria-label="Cerrar sesión"><LogOut size={18}/><span>{busy ? 'Cerrando…' : 'Cerrar sesión'}</span></button>
      </header>
      <main className="app-content">{error && <p className="alert error" role="alert">No se pudo cerrar la sesión: {error}. Intenta nuevamente.</p>}<Outlet/></main>
      <div className="app-footer">NexusStock <span>Gestiona. Vende. Crece.</span></div>
    </div>
  </div>;
}
