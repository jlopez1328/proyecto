import mongoose from 'mongoose';
import {openapi} from '../openapi.js';

export const health = (req, res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({status: mongoose.connection.readyState === 1 ? 'ok' : 'unavailable'});

export const schema = (req, res) => res.json(openapi);
