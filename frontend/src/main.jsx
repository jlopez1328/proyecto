import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { ShoppingCart, ShoppingBag, Package, LayoutDashboard, Users, LogOut, ArrowUpRight, ShieldCheck, BarChart3, Menu, X } from 'lucide-react';
import { api, money } from './api';
import { Dashboard, Inventory, Sales, Purchases, UsersPage, History } from './pages';
import './styles.css';
import { RecoveryPage } from './password-recovery';
import { Session, useSession } from './session';

export function Logo() {return <Link to="/" className="logo"><ShoppingCart className="logo-carrito"/><span className="texto-logo"><strong className="nombre-logo">NexusStock</strong><span className="frase-logo">Gestiona. Vende. Crece.</span></span></Link>;}
function Landing() {
  return <><header className="encabezado"><Logo/><nav className="menu"><a href="#inicio">Inicio</a><a href="#servicios">Características</a><a href="#beneficios">Beneficios</a></nav><Link to="/login" className="button dark">Iniciar sesión</Link></header><main>
    <section id="inicio" className="presentacion"><article className="contenido-presentacion"><p className="etiqueta">Solución para supermercados y tiendas</p><h1>Todo tu negocio<br/>en un solo lugar</h1><p className="descripcion">Administra tus ventas, compras e inventario de manera fácil, rápida y segura. Una herramienta pensada para supermercados, tiendas y negocios que quieran tener un mejor control de sus operaciones.</p><Link to="/login" className="button dark large">Iniciar sesión</Link></article><figure className="imagen-presentacion"><img src="/img/Inicio.png" alt="Sistema de gestión para ventas, compras e inventario"/></figure></section>
    <section id="servicios" className="servicios">{[[ShoppingCart,'Ventas','Registra y controla las ventas realizadas en tu negocio de manera rápida y sencilla.'],[ShoppingBag,'Compras','Gestiona las compras a tus proveedores y mantén un historial de tus movimientos.'],[Package,'Inventario','Consulta el stock disponible y mantén actualizado el inventario de tu negocio.']].map(([Icon,title,text]) => <article className="tarjeta" key={title}><Icon className="feature-icon"/><h2>{title}</h2><p>{text}</p></article>)}</section>
    <section id="beneficios" className="beneficios">{[[BarChart3,'Mayor control','Consulta información importante y toma mejores decisiones.'],[LayoutDashboard,'Ahorra tiempo','Organiza todos los procesos desde un mismo sistema.'],[ShieldCheck,'Seguro y confiable','Mantén organizada la información de tu negocio.']].map(([Icon,title,text])=><article key={title}><Icon/><h2>{title}</h2><p>{text}</p></article>)}</section>
  </main><footer>NexusStock · Gestiona. Vende. Crece. <a href="/original/index.html" target="_blank" rel="noreferrer">Ver diseño original</a></footer></>;
}
function Auth({register = false}) {
  const {user, setUser} = useSession();
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  if (user) return <Navigate to="/app" replace/>;
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    const body = Object.fromEntries(new FormData(e.currentTarget));
    try {const data = await api(register ? '/auth/register' : '/auth/login', {method: 'POST', body}); setUser(data.user); navigate('/app');}
    catch(err) {setError(err.message);} finally {setBusy(false);}
  }
  return <main className="login"><section className="acceso"><header><Logo/></header><article className="formulario-login"><p className="eyebrow">BIENVENIDO A NEXUSSTOCK</p><h1>{register ? 'Crear una cuenta' : 'Iniciar sesión'}</h1><p className="muted">{register ? 'Empieza a gestionar tus ventas.' : 'Ingresa tus datos para acceder al sistema.'}</p><form onSubmit={submit} key={String(register)}>{register && <label>Nombre completo<input name="name" required maxLength="100" autoComplete="name"/></label>}<label>Correo electrónico<input type="email" name="email" placeholder="ejemplo@correo.com" autoComplete="email" required maxLength="254"/></label><label>Contraseña<input type="password" name="password" placeholder="Mínimo 10 caracteres" minLength="10" maxLength="72" autoComplete={register ? 'new-password' : 'current-password'} required/></label>{register && <p className="hint">Tu cuenta tendrá el rol de vendedor. Un administrador puede asignarte otro rol.</p>}{error && <p className="alert error" role="alert">{error}</p>}<button disabled={busy} className="button large">{busy ? 'Procesando…' : register ? 'Crear cuenta' : 'Iniciar sesión'}</button></form>{!register && <p className="forgot-password"><Link to="/recuperar-contrasena">¿Olvidaste tu contraseña?</Link></p>}<p className="registro">{register ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'} <Link to={register ? '/login' : '/registro'}>{register ? 'Iniciar sesión' : 'Regístrate'}</Link></p></article><p className="hint">Tu negocio, conectado y organizado.</p></section><aside className="informacion-login"><div className="mensaje-login"><h2>Todo tu negocio<span>en un solo lugar</span></h2><p>Gestiona inventario, ventas y clientes de forma rápida, sencilla y organizada con NexusStock.</p></div><img src="/img/login.png" alt="NexusStock para control de inventario y ventas"/><div className="beneficios-login"><span><Package/>Control de inventario</span><span><BarChart3/>Reportes en tiempo real</span><span><ShieldCheck/>Acceso seguro</span></div></aside></main>;
}
function Guard({roles}) {
  const {user} = useSession();
  if (!user) return <Navigate to="/login" replace/>;
  if (roles && !roles.includes(user.role)) return <Navigate to="/app" replace/>;
  return <Outlet/>;
}
function Shell() {
  const {user, setUser} = useSession(), [open, setOpen] = useState(false), [error, setError] = useState('');
  const seller = ['vendedor', 'administrador'].includes(user.role), buyer = ['comprador', 'administrador'].includes(user.role);
  async function logout() {try {await api('/auth/logout', {method: 'POST'}); setUser(null);} catch(err) {setError(err.message);}}
  return <div className="app-shell"><aside className={`sidebar ${open ? 'opened' : ''}`}><Logo/><p className="nav-label">ESPACIO DE TRABAJO</p><nav onClick={()=>setOpen(false)}><NavLink end to="/app"><LayoutDashboard/>Resumen</NavLink>{seller && <NavLink to="/app/ventas"><ShoppingCart/>Ventas</NavLink>}{buyer && <><NavLink to="/app/compras"><ShoppingBag/>Compras</NavLink><NavLink to="/app/inventario"><Package/>Inventario</NavLink></>}{user.role === 'administrador' && <NavLink to="/app/usuarios"><Users/>Usuarios</NavLink>}</nav><div className="sidebar-bottom"><div className="workspace-note"><ShieldCheck/><strong>Todo bajo control</strong><p>Información actualizada en cada operación.</p></div><button className="logout" onClick={logout}><LogOut/>Cerrar sesión</button>{error && <p role="alert">{error}</p>}</div></aside><div className="workspace"><header className="topbar"><button className="icon-button mobile-menu" aria-label="Abrir menú" onClick={()=>setOpen(!open)}>{open ? <X/> : <Menu/>}</button><span className="muted">Gestión comercial <span className="top-divider">/</span> Tu negocio, en orden</span><div className="account"><span className="avatar">{user.name.slice(0,2).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.role}</small></div></div></header><main className="app-content"><Outlet/></main><div className="app-footer">NexusStock <span>Gestiona. Vende. Crece.</span></div></div></div>;
}
function App() {
  const [user, setUser] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  async function load() {setError(''); setLoading(true); try {const data=await api('/auth/me'); setUser(data.user);} catch(err) {if(err.status !== 401) setError('No se pudo conectar con el servidor. Verifica que esté iniciado.');} finally {setLoading(false);}}
  useEffect(()=>{load(); const expired=()=>setUser(null); window.addEventListener('session-expired',expired); return ()=>window.removeEventListener('session-expired',expired);},[]);
  if (loading) return <div className="loading-screen"><ShoppingCart/><p>Cargando NexusStock…</p></div>;
  if (error) return <div className="loading-screen"><p role="alert">{error}</p><button className="button" onClick={load}>Reintentar</button></div>;
  return <Session.Provider value={{user,setUser}}><BrowserRouter><Routes><Route path="/" element={<Landing/>}/><Route path="/login" element={<Auth/>}/><Route path="/registro" element={<Auth register/>}/><Route path="/recuperar-contrasena" element={<RecoveryPage/>}/><Route element={<Guard/>}><Route path="/app" element={<Shell/>}><Route index element={<Dashboard/>}/><Route element={<Guard roles={['vendedor','administrador']}/>}><Route path="ventas" element={<Sales/>}/><Route path="ventas/historial" element={<History type="sales"/>}/></Route><Route element={<Guard roles={['comprador','administrador']}/>}><Route path="compras" element={<Purchases/>}/><Route path="compras/historial" element={<History type="purchases"/>}/><Route path="inventario" element={<Inventory/>}/></Route><Route element={<Guard roles={['administrador']}/>}><Route path="usuarios" element={<UsersPage/>}/></Route></Route></Route><Route path="*" element={<div className="loading-screen"><h1>Página no encontrada</h1><Link className="button" to="/">Volver al inicio</Link></div>}/></Routes></BrowserRouter></Session.Provider>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
