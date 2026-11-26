import mongoose from 'mongoose';
import { app } from './app.js';
import { config, validateConfig } from './config.js';
import { initializeDatabase } from './models.js';
try {
  validateConfig();
  await mongoose.connect(config.mongoUri, {serverSelectionTimeoutMS: 10000});
  const hello = await mongoose.connection.db.admin().command({hello: 1});
  if (!hello.setName && hello.msg !== 'isdbgrid') throw new Error('MongoDB debe usar replica set para garantizar transacciones. Consulta docs/INSTALACION.md.');
  await initializeDatabase();
  const server = app.listen(config.port, config.host, () => console.log(`NexusStock: http://localhost:${config.port} · Swagger: http://localhost:${config.port}/api/docs`));
  const stop = () => server.close(async () => { await mongoose.disconnect(); process.exit(0); });
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
} catch (error) { console.error('No se pudo iniciar NexusStock:', error.message); await mongoose.disconnect(); process.exit(1); }
