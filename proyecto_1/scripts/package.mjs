import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const dest=fileURLToPath(new URL('../NexusStock-entrega.zip',import.meta.url));
try {
  const changes=execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim();
  if(changes)throw new Error('Guarda primero los cambios en un commit para empaquetar la versión completa.');
  const prefix=execFileSync('git',['rev-parse','--show-prefix'],{cwd:root,encoding:'utf8'}).trim().replace(/\/$/,'');
  execFileSync('git',['archive','--format=zip',`--output=${dest}`,prefix ? `HEAD:${prefix}` : 'HEAD'],{cwd:root,stdio:'inherit'});
  console.log(`Entrega creada: ${dest}. Excluye credenciales, dependencias, datos locales y metadatos .git.`);
}catch(error){console.error(error.message);process.exit(1);}
