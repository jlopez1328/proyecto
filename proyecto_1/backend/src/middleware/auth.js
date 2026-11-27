import jwt from 'jsonwebtoken';
import { User } from '../modelo/index.js';
import { ApiError } from '../domain.js';
import { config } from '../config.js';
import {createHash} from 'node:crypto';
export const cookieOptions = {httpOnly: true, secure: config.production, sameSite: 'strict', path: '/api'};
function fingerprint(value) {
  return typeof value==='string'&&/^[A-Za-z0-9_-]{32,128}$/.test(value)?createHash('sha256').update(value).digest('hex'):null;
}
export function issueToken(user, res, req) {
  const key=req?.get('X-Tab-Session'),tab=fingerprint(key);
  if(key&&!tab)throw new ApiError(400,'Identificador de pestaña inválido.');
  const token = jwt.sign({ver: user.tokenVersion,...(tab?{tab}:{})}, config.secret, {subject: String(user._id), expiresIn: '8h', issuer: 'nexusstock', audience: 'nexusstock-web', algorithm: 'HS256'});
  res.cookie('session', token, cookieOptions);
  return user.toJSON();
}
export async function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : req.cookies.session;
    if (!token) throw new Error();
    const payload = jwt.verify(token, config.secret, {algorithms: ['HS256'], issuer: 'nexusstock', audience: 'nexusstock-web'});
    const key=req.get('X-Tab-Session');
    if(payload.tab){if(fingerprint(key)!==payload.tab)throw new Error();}
    // API clients without a tab header retain their existing cookie/Bearer flow.
    // A browser document must always start a session bound to its own key.
    else if(key){res.clearCookie('session',cookieOptions);throw new Error();}
    const user = await User.findById(payload.sub);
    if (!user?.active || user.deletedAt || user.tokenVersion !== payload.ver) throw new Error();
    req.user = user;
    next();
  } catch { next(new ApiError(401, 'La sesión venció o no es válida. Inicia sesión.')); }
}
export const allow = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : next(new ApiError(403, 'Tu rol no tiene permiso para esta operación.'));
