import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { config, validateConfig } from './config.js';
import { initializeDatabase, User } from './modelo/index.js';
import { registration } from './validation.js';
try {
  validateConfig();
  const raw = {name: process.env.ADMIN_NAME || 'Administrador', username: process.env.ADMIN_USERNAME || 'admin', email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD};
  if (!raw.password || raw.password.startsWith('REEMPLAZAR')) throw new Error('Define ADMIN_USERNAME, ADMIN_EMAIL y ADMIN_PASSWORD propios en backend/.env.');
  const data = registration.parse(raw);
  await mongoose.connect(config.mongoUri, {serverSelectionTimeoutMS: 10000});
  await initializeDatabase();
  if (await User.exists({$or: [{email: data.email}, {username: data.username}]})) console.log('La cuenta ya existe; se conservan su contraseña y permisos.');
  else if (await User.exists({role: 'administrador', active: true})) throw new Error('Ya existe un administrador. Crea nuevas cuentas desde Usuarios.');
  else {await User.create({...data, password: await bcrypt.hash(data.password, 12), role: 'administrador'}); console.log('Administrador inicial creado.');}
} catch (error) {console.error(error.message); process.exitCode = 1;}
finally {await mongoose.disconnect();}
