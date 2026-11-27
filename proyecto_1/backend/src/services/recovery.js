import {createHash, randomBytes} from 'node:crypto';
import {config} from '../config.js';

// Bind approval to the browser that requested it, without a code or extra fields.
export const recoveryCookie = {httpOnly:true, secure:config.production, sameSite:'strict', path:'/api/auth/password-reset'};
export function requester(req, res) {
  const existing = req.cookies.recovery;
  const secret = typeof existing === 'string' && /^[a-f\d]{64}$/.test(existing) ? existing : randomBytes(32).toString('hex');
  res.cookie('recovery', secret, {...recoveryCookie, maxAge:400 * 86400000});
  return secret;
}
export function requestHash(secret, username) {
  if (typeof secret !== 'string' || !/^[a-f\d]{64}$/.test(secret)) return null;
  return createHash('sha256').update(`${username}:${secret}`).digest('hex');
}
export const clearRecovery = {passwordResetHash:'', passwordResetRequestHash:'', passwordResetApprovedBy:''};
