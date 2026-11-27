import React from 'react';
import {Link} from 'react-router-dom';
import {ShoppingCart, ShoppingBag, Package, LayoutDashboard, ShieldCheck, BarChart3} from 'lucide-react';

import {Logo} from '../components/Logo';
export function Landing() {
  return <><header className="encabezado"><Logo/><nav className="menu"><a href="#inicio">Inicio</a><a href="#servicios">Características</a><a href="#beneficios">Beneficios</a></nav><div className="landing-auth"><Link to="/registro" className="button secondary">Registrarse</Link><Link to="/login" className="button dark">Iniciar sesión</Link></div></header><main>
    <section id="inicio" className="presentacion"><article className="contenido-presentacion"><p className="etiqueta">Solución para supermercados y tiendas</p><h1>Todo tu negocio<br/>en un solo lugar</h1><p className="descripcion">Administra tus ventas, compras e inventario de manera fácil, rápida y segura. Una herramienta pensada para supermercados, tiendas y negocios que quieran tener un mejor control de sus operaciones.</p><div className="landing-hero-actions"><Link to="/login" className="button dark large">Iniciar sesión</Link><Link to="/registro" className="button secondary large">Registrarse</Link></div></article><figure className="imagen-presentacion"><img src="/img/Inicio.png" alt="Sistema de gestión para ventas, compras e inventario"/></figure></section>
    <section id="servicios" className="servicios">{[[ShoppingCart,'Ventas','Registra y controla las ventas realizadas en tu negocio de manera rápida y sencilla.'],[ShoppingBag,'Compras','Gestiona las compras a tus proveedores y mantén un historial de tus movimientos.'],[Package,'Inventario','Consulta el stock disponible y mantén actualizado el inventario de tu negocio.']].map(([Icon,title,text]) => <article className="tarjeta" key={title}><Icon className="feature-icon"/><h2>{title}</h2><p>{text}</p></article>)}</section>
    <section id="beneficios" className="beneficios">{[[BarChart3,'Mayor control','Consulta información importante y toma mejores decisiones.'],[LayoutDashboard,'Ahorra tiempo','Organiza todos los procesos desde un mismo sistema.'],[ShieldCheck,'Seguro y confiable','Mantén organizada la información de tu negocio.']].map(([Icon,title,text])=><article key={title}><Icon/><h2>{title}</h2><p>{text}</p></article>)}</section>
  </main><footer>NexusStock · Gestiona. Vende. Crece.</footer></>;
}
