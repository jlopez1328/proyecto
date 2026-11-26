// Idempotente: no reinicia ni borra una base de datos existente.
try {rs.status(); print('Replica set ya configurado.');}
catch(error) {
  if (error.code !== 94 && error.codeName !== 'NotYetInitialized') throw error;
  rs.initiate({_id:'rs0',members:[{_id:0,host:'mongo:27017'}]});
}
let ready=false;
for(let attempt=0;attempt<60;attempt++) {
  if(db.hello().isWritablePrimary) {ready=true;break;}
  sleep(1000);
}
if(!ready)throw new Error('No se eligió un primario en 60 segundos.');
print('MongoDB listo para NexusStock.');
