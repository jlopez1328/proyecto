import './setup.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { createConnection } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
const envPath=join(root,'backend','.env');
let env=dotenv.parse(readFileSync(envPath));
const apiPort=Number(env.PORT || 4000), webPort=5173;
let mongo, stopping=false;
const children=[];
function setConfig(key,value) {
  let text=readFileSync(envPath,'utf8');
  const pattern=new RegExp(`^${key}=.*$`,'m');
  text=pattern.test(text)?text.replace(pattern,`${key}=${value}`):`${text}\n${key}=${value}\n`;
  writeFileSync(envPath,text);
  env=dotenv.parse(text);
}
const occupied=port=>new Promise(resolve=>{
  const socket=createConnection({host:'127.0.0.1',port});
  socket.setTimeout(1000);
  socket.once('connect',()=>{socket.destroy();resolve(true);});
  const free=()=>{socket.destroy();resolve(false);};
  socket.once('error',free);socket.once('timeout',free);
});
async function stop(code=0) {
  if(stopping)return;
  stopping=true;
  for(const child of children)if(child.exitCode===null)child.kill('SIGTERM');
  await mongoose.disconnect();
  if(mongo)await mongo.stop({doCleanup:false,force:false});
  console.log('Servicios locales detenidos. Se conservan los datos de .mongo/db.');
  process.exit(code);
}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
process.stdin.on('data',data=>{if(data.toString().trim()==='stop')stop();});
function launch(args,cwd,extraEnv={}) {
  const child=spawn(process.execPath,args,{cwd,stdio:['ignore','inherit','inherit'],windowsHide:true,env:{...process.env,...extraEnv}});
  children.push(child);
  child.once('error',error=>{console.error(error.message);stop(1);});
  child.once('exit',code=>{if(!stopping){console.error(`Un servicio local terminó (${code}).`);stop(code || 1);}});
}
async function ready(url,json=false) {
  for(let attempt=0;attempt<100&&!stopping;attempt++) {
    try {const response=await fetch(url,{signal:AbortSignal.timeout(1500)});if(response.ok&&(!json||(await response.json()).status==='ok'))return;} catch {}
    await delay(300);
  }
  throw new Error(`No se pudo iniciar ${url}. Revisa los mensajes anteriores.`);
}
try {
  if(await occupied(apiPort)||await occupied(webPort))throw new Error(`El puerto ${apiPort} o ${webPort} ya está ocupado. Si NexusStock ya está iniciado, abre http://127.0.0.1:${webPort}.`);
  if(!env.JWT_SECRET||env.JWT_SECRET.length<32||env.JWT_SECRET.startsWith('REEMPLAZAR'))setConfig('JWT_SECRET',randomBytes(48).toString('hex'));
  const localUri='mongodb://127.0.0.1:27017/nexusstock?replicaSet=rs0&directConnection=true';
  if(env.MONGODB_URI===localUri&&!(await occupied(27017))) {
    const dbPath=join(root,'.mongo','db');mkdirSync(dbPath,{recursive:true});
    console.log('Iniciando MongoDB local con datos persistentes en .mongo/db…');
    mongo=await MongoMemoryReplSet.create({binary:{version:'7.0.24'},instanceOpts:[{port:27017,dbPath}],replSet:{name:'rs0',count:1,storageEngine:'wiredTiger',ip:'127.0.0.1',spawn:{windowsHide:true}}});
    if(mongo.servers[0].instanceInfo.port!==27017)throw new Error('MongoDB no pudo utilizar el puerto 27017. No se modificó la configuración de conexión.');
  }
  await mongoose.connect(env.MONGODB_URI,{serverSelectionTimeoutMS:10000});
  const hello=await mongoose.connection.db.admin().command({hello:1});
  if(!hello.setName&&hello.msg!=='isdbgrid')throw new Error('La base configurada no admite transacciones. Consulta docs/INSTALACION.md.');
  const admin=await mongoose.connection.db.collection('users').findOne({role:'administrador',active:true});
  await mongoose.disconnect();
  if(!admin) {
    if(!env.ADMIN_PASSWORD||env.ADMIN_PASSWORD.startsWith('REEMPLAZAR'))setConfig('ADMIN_PASSWORD',randomBytes(18).toString('base64url'));
    execFileSync(process.execPath,['backend/src/seed.js'],{cwd:root,stdio:'inherit',windowsHide:true});
    console.log('Cuenta inicial preparada. Correo y contraseña: ADMIN_EMAIL y ADMIN_PASSWORD en backend/.env.');
  } else console.log('Se conserva la cuenta administradora existente y todos sus datos.');
  launch(['backend/src/server.js'],root,{HOST:'127.0.0.1',NODE_ENV:'development'});
  const require=createRequire(import.meta.url);
  const vite=join(dirname(require.resolve('vite/package.json')),'bin','vite.js');
  launch([vite,'--host','127.0.0.1','--port',String(webPort),'--strictPort'],join(root,'frontend'),{API_PROXY_TARGET:`http://127.0.0.1:${apiPort}`});
  await Promise.all([ready(`http://127.0.0.1:${apiPort}/api/health`,true),ready(`http://127.0.0.1:${webPort}`)]);
  console.log(`\nNexusStock listo: http://127.0.0.1:${webPort}\nSolo en este computador. Ctrl+C detiene los servicios sin borrar la base de datos.`);
} catch(error) {console.error(error.message);await stop(1);}
