import {rateLimit} from 'express-rate-limit';
export const authLimit = rateLimit({windowMs: 15 * 60000, limit: process.env.NODE_ENV === 'test' ? 200 : 30, standardHeaders: 'draft-8', legacyHeaders: false, message: {error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.'}});
export const resetLimit = rateLimit({windowMs: 15 * 60000, limit: process.env.NODE_ENV === 'test' ? 200 : 15, standardHeaders: 'draft-8', legacyHeaders: false, message: {error: 'Demasiados intentos de recuperación. Intenta de nuevo en 15 minutos.'}});
