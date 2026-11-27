import routes from './routes/index.js';
import {errorHandler} from './middleware/errorHandler.js';
import {ApiError} from './domain.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { config } from './config.js';
import { openapi } from './openapi.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({origin: (origin, done) => done(null, !origin || config.origins.includes(origin)), credentials: true}));
app.use(express.json({limit: '150kb'}));
app.use(cookieParser());
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin && !config.origins.includes(req.headers.origin)) return next(new ApiError(403, 'Origen no permitido.'));
  next();
});
app.use('/api', rateLimit({windowMs: 60000, limit: process.env.NODE_ENV === 'test' ? 3000 : 300, standardHeaders: 'draft-8', legacyHeaders: false, message: {error: 'Demasiadas solicitudes. Espera un minuto.'}}));

app.use('/api/docs', (req, res, next) => {res.removeHeader('Content-Security-Policy'); next();}, swaggerUi.serve, swaggerUi.setup(openapi, {swaggerOptions: {persistAuthorization: false}}));
app.use('/api', routes);

const frontendDist = fileURLToPath(new URL('../../frontend/dist/', import.meta.url));
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('/{*path}', (req, res, next) => req.path.startsWith('/api') ? next() : res.sendFile(`${frontendDist}/index.html`));
}
app.use((req, res) => res.status(404).json({error: 'Ruta no encontrada.'}));
app.use(errorHandler);
