import {useAppController} from './controlador/sessionController';
import React from 'react';
import {BrowserRouter,Routes,Route,Link} from 'react-router-dom';
import {ShoppingCart} from 'lucide-react';
import {Session} from './modelo/session';
import {Dashboard,Inventory,Sales,Purchases,UsersPage,History} from './vista/pages';
import {RecoveryPage} from './vista/pages/PasswordRecovery';
import {Landing} from './vista/pages/Landing';
import {Auth} from './vista/pages/Auth';
import {Guard} from './vista/components/Guard';
import {Shell} from './vista/layouts/Shell';
export function App() {
  const {user,setUser,loading,error,load}=useAppController();
  if (loading) return <div className="loading-screen"><ShoppingCart/><p>Cargando NexusStock…</p></div>;
  if (error) return <div className="loading-screen"><p role="alert">{error}</p><button className="button" onClick={load}>Reintentar</button></div>;
  return <Session.Provider value={{user,setUser}}><BrowserRouter><Routes><Route path="/" element={<Landing/>}/><Route path="/login" element={<Auth/>}/><Route path="/registro" element={<Auth register/>}/><Route path="/recuperar-contrasena" element={<RecoveryPage/>}/><Route element={<Guard/>}><Route path="/app" element={<Shell/>}><Route index element={<Dashboard/>}/><Route element={<Guard roles={['vendedor','administrador']}/>}><Route path="ventas" element={<Sales/>}/><Route path="ventas/historial" element={<History type="sales"/>}/></Route><Route element={<Guard roles={['comprador','administrador']}/>}><Route path="compras" element={<Purchases/>}/><Route path="compras/historial" element={<History type="purchases"/>}/><Route path="inventario" element={<Inventory/>}/></Route><Route element={<Guard roles={['administrador']}/>}><Route path="usuarios" element={<UsersPage/>}/></Route></Route></Route><Route path="*" element={<div className="loading-screen"><h1>Página no encontrada</h1><Link className="button" to="/">Volver al inicio</Link></div>}/></Routes></BrowserRouter></Session.Provider>;
}
