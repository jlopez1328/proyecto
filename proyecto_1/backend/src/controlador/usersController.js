import bcrypt from 'bcrypt';
import {User} from '../modelo/index.js';

import {ApiError} from '../domain.js';
import * as v from '../validation.js';
import {escaped, resetFields, clearSession} from '../services/operations.js';
import {clearRecovery} from '../services/recovery.js';

export const listUsers = async (req, res) => {
  const {page, limit, search, archived} = v.userListQuery.parse(req.query);
  const query = search ? {$or: [{name: new RegExp(escaped(search), 'i')}, {username: new RegExp(escaped(search), 'i')}, {email: new RegExp(escaped(search), 'i')}]} : {};
  query.deletedAt=archived==='true'?{$ne:null}:null;
  const [items, total] = await Promise.all([User.find(query).sort({createdAt: -1}).skip((page - 1) * limit).limit(limit), User.countDocuments(query)]);
  res.json({items, total, page, limit});
};

export const listResetRequests = async (req, res) => {
  const filter = {active:true, deletedAt:null, passwordResetRequestedAt:{$ne:null}, passwordResetApprovedAt:null};
  const [items,total] = await Promise.all([
    User.find(filter).select('name username passwordResetRequestedAt').sort({passwordResetRequestedAt:-1}).limit(50),
    User.countDocuments(filter)
  ]);
  res.json({items,total});
};

export const createUser = async (req, res) => {
  const data = v.userCreation.parse(req.body);
  const user = await User.create({...data, password: await bcrypt.hash(data.password, 12)});
  res.status(201).json({user});
};

export const updateUser = async (req, res) => {
  const id = v.parseId(req.params.id), data = v.userUpdate.parse(req.body);
  if (id === String(req.user._id)) throw new ApiError(409, 'No puedes modificar tu propia cuenta. Otro administrador debe hacerlo.');
  const user = await User.findOneAndUpdate({_id:id,deletedAt:null}, {$set: {...data, ...resetFields}, $unset: clearRecovery, $inc: {tokenVersion: 1}}, {new: true, runValidators: true});
  if (!user) throw new ApiError(404, 'Usuario no encontrado.');
  res.json({user});
};

export const deleteUser = async (req,res) => {
  const id=v.parseId(req.params.id);
  if(id===String(req.user._id))throw new ApiError(409,'No puedes eliminar la cuenta con la que estás conectado.');
  const user=await User.findOneAndUpdate({_id:id,deletedAt:null},{$set:{deletedAt:new Date(),active:false,...resetFields},$unset:clearRecovery,$inc:{tokenVersion:1}},{new:true});
  if(!user)throw new ApiError(404,'Usuario no encontrado o ya eliminado.');
  res.json({message:'Usuario eliminado. Sus operaciones se conservan y puedes recuperarlo en Usuarios eliminados.'});
};

export const restoreUser = async (req,res) => {
  const id=v.parseId(req.params.id);
  const user=await User.findOneAndUpdate({_id:id,deletedAt:{$ne:null}},{$set:{deletedAt:null,active:false,...resetFields},$unset:clearRecovery,$inc:{tokenVersion:1}},{new:true});
  if(!user)throw new ApiError(404,'Usuario eliminado no encontrado.');
  res.json({message:'Usuario recuperado como inactivo. Puedes activarlo desde Usuarios.',user});
};

export const changePassword = async (req, res) => {
  const id=v.parseId(req.params.id), data=v.passwordChange.parse(req.body);
  const password=await bcrypt.hash(data.password,12);
  const user=await User.findOneAndUpdate({_id:id,active:true},{$set:{password,...resetFields},$unset:clearRecovery,$inc:{tokenVersion:1}},{new:true});
  if(!user)throw new ApiError(404,'Usuario activo no encontrado.');
  const currentSessionEnded=id===String(req.user._id);
  if(currentSessionEnded)clearSession(res);
  res.json({message:'Contraseña actualizada. Se cerraron las sesiones anteriores de esta cuenta.',currentSessionEnded});
};

export const enablePasswordReset = async (req, res) => {
  const id = v.parseId(req.params.id);
  if (id === String(req.user._id)) throw new ApiError(409, 'Otro administrador debe habilitar la recuperación de tu cuenta.');
  if (!(await User.exists({_id:id, active:true}))) throw new ApiError(404, 'Usuario activo no encontrado.');
  const approvedAt = new Date();
  const user = await User.findOneAndUpdate({_id: id, active: true, passwordResetRequestedAt: {$ne:null}, passwordResetRequestHash: {$type:'string'}, passwordResetApprovedAt:null}, {$set: {passwordResetRequestedAt: null, passwordResetExpiresAt: null, passwordResetApprovedAt: approvedAt, passwordResetApprovedBy: req.user._id}, $unset: {passwordResetHash: ''}}, {new: true});
  if (!user) throw new ApiError(409, 'La persona debe solicitar primero el cambio desde ¿Olvidaste tu contraseña?, o el cambio ya está habilitado.');
  res.status(201).json({approvedAt, expiresAt:null, user: {_id: user._id, name: user.name, username: user.username, email: user.email}});
};

export const revokePasswordReset = async (req, res) => {
  const id = v.parseId(req.params.id);
  if (id === String(req.user._id)) throw new ApiError(409, 'Otro administrador debe gestionar la recuperación de tu cuenta.');
  const user = await User.findByIdAndUpdate(id, {$set: resetFields, $unset: clearRecovery});
  if (!user) throw new ApiError(404, 'Usuario no encontrado.');
  res.json({message: 'Cambio de contraseña revocado. La autorización anterior ya no es válida.'});
};
