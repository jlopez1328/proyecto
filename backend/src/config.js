import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
dotenv.config({path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true});
export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI,
  secret: process.env.JWT_SECRET,
  production: process.env.NODE_ENV === 'production',
  origins: (process.env.FRONTEND_URL || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4000,http://127.0.0.1:4000').split(',').map(s => s.trim())
};
export function validateConfig() {
  if (!config.mongoUri) throw new Error('Configura MONGODB_URI en backend/.env.');
  if (!config.secret || config.secret.length < 32 || config.secret.startsWith('REEMPLAZAR')) throw new Error('JWT_SECRET debe tener al menos 32 caracteres aleatorios. Ejecuta npm run setup.');
}
