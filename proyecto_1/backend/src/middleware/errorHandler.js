import {ZodError} from 'zod';
export const errorHandler = (error, req, res, next) => {
  if (error instanceof ZodError) return res.status(400).json({error: 'Revisa los datos enviados.', details: error.issues.map(i => ({field: i.path.join('.'), message: i.message}))});
  if (error.code === 11000) return res.status(409).json({error: 'El nombre de usuario, correo o identificador de solicitud ya existe.'});
  if (error.type === 'entity.parse.failed') return res.status(400).json({error: 'JSON inválido.'});
  if (error.type === 'entity.too.large') return res.status(413).json({error: 'Solicitud demasiado grande.'});
  if (error.status) return res.status(error.status).json({error: error.message});
  if (process.env.NODE_ENV !== 'test') console.error(error);
  res.status(500).json({error: 'No fue posible completar la operación. Intenta de nuevo.'});
};
