import bcrypt from 'bcrypt';
import {User} from '../modelo/index.js';
import {issueToken} from '../middleware/auth.js';
import {ApiError} from '../domain.js';
import * as v from '../validation.js';
import {resetFields, clearSession, dummyPasswordHash} from '../services/operations.js';
import {requester, requestHash, recoveryCookie, clearRecovery} from '../services/recovery.js';

export const register = async (req, res) => {
  const data = v.registration.parse(req.body);
  const user = await User.create({...data, role: 'vendedor', password: await bcrypt.hash(data.password, 12)});
  res.status(201).json({user: issueToken(user, res, req)});
};

export const login = async (req, res) => {
  const data = v.credentials.parse(req.body);
  const user = await User.findOne({username: data.username}).select('+password');
  // A fixed valid hash keeps bcrypt work comparable for unknown users.
  const valid = await bcrypt.compare(data.password, user?.password || dummyPasswordHash);
  if (!user?.active || user.deletedAt || !valid) throw new ApiError(401, 'Usuario o contraseña incorrectos.');
  res.json({user: issueToken(user, res, req)});
};

export const me = (req, res) => res.json({user: req.user});

export const requestPasswordReset = async (req, res) => {
  const {username} = v.resetRequest.parse(req.body);
  const now = new Date();
  const hash = requestHash(requester(req, res), username);
  await User.updateOne({username, active: true, passwordResetApprovedAt: null,
    $or: [{passwordResetRequestedAt: null}, {passwordResetRequestedAt: {$lte: new Date(now.getTime() - 60000)}}]
  }, {$set: {passwordResetRequestedAt: now, passwordResetRequestHash: hash, passwordResetExpiresAt: null}, $unset: {passwordResetHash:'', passwordResetApprovedBy:''}});
  res.status(202).json({message: 'Si la cuenta está activa, la solicitud aparecerá en Usuarios para que un administrador la autorice. Después podrás elegir tu contraseña desde este mismo navegador. La autorización no tiene límite de tiempo.'});
};

export const confirmPasswordReset = async (req, res) => {
  const data = v.resetPassword.parse(req.body);
  const hash = requestHash(req.cookies.recovery, data.username);
  const filter = {username: data.username, active: true, passwordResetRequestHash: hash, passwordResetApprovedBy: {$ne: null}, passwordResetApprovedAt: {$ne: null}};
  const authorization = hash && await User.findOne(filter).select('tokenVersion passwordResetApprovedAt +passwordResetApprovedBy');
  if (!authorization) throw new ApiError(400, 'Solicita el cambio desde este navegador y espera la autorización del administrador en Usuarios.');
  const password = await bcrypt.hash(data.password, 12);
  if (!(await User.exists({_id: authorization.passwordResetApprovedBy, active: true, role:'administrador'}))) throw new ApiError(400, 'La autorización ya no es válida. Solicita una nueva autorización.');
  const user = await User.findOneAndUpdate({...filter, _id: authorization._id, tokenVersion: authorization.tokenVersion, passwordResetApprovedBy: authorization.passwordResetApprovedBy, passwordResetApprovedAt: authorization.passwordResetApprovedAt}, {$set: {password, ...resetFields}, $unset: clearRecovery, $inc: {tokenVersion: 1}}, {new: true});
  if (!user) throw new ApiError(400, 'La autorización cambió, fue revocada o ya se utilizó. Solicita una nueva autorización.');
  clearSession(res);
  res.clearCookie('recovery', recoveryCookie);
  res.json({message: 'Contraseña actualizada. Inicia sesión con tu nueva contraseña. Se cerraron las sesiones anteriores.'});
};

export const logout = async (req, res) => {
  await User.updateOne({_id: req.user._id}, {$inc: {tokenVersion: 1}});
  clearSession(res);
  res.json({message: 'Sesión cerrada en todos tus dispositivos.'});
};
