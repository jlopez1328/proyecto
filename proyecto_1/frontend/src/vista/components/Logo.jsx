import React from 'react';
import {Link} from 'react-router-dom';
import {ShoppingCart} from 'lucide-react';
export function Logo() {return <Link to="/" className="logo"><ShoppingCart className="logo-carrito"/><span className="texto-logo"><strong className="nombre-logo">NexusStock</strong><span className="frase-logo">Gestiona. Vende. Crece.</span></span></Link>;}
