import jwt from 'jsonwebtoken';
import { User } from './models.js';
import { ApiError } from './domain.js';
import { config } from './config.js';
export const cookieOptions = {httpOnly: true, secure: config.production, sameSite: 'strict', path: '/api', maxAge: 8 * 60 * 60 * 1000};
export function issueToken(user, res) {
  const token = jwt.sign({ver: user.tokenVersion}, config.secret, {subject: String(user._id), expiresIn: '8h', issuer: 'nexusstock', audience: 'nexusstock-web', algorithm: 'HS256'});
  res.cookie('session', token, cookieOptions);
  return user.toJSON();
}
export async function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : req.cookies.session;
    if (!token) throw new Error();
    const payload = jwt.verify(token, config.secret, {algorithms: ['HS256'], issuer: 'nexusstock', audience: 'nexusstock-web'});
    const user = await User.findById(payload.sub);
    if (!user?.active || user.tokenVersion !== payload.ver) throw new Error();
    req.user = user;
    next();
  } catch { next(new ApiError(401, 'La sesión venció o no es válida. Inicia sesión.')); }
}
export const allow = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : next(new ApiError(403, 'Tu rol no tiene permiso para esta operación.'));
