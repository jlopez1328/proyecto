import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
for (const folder of ['frontend', 'backend']) {
  const dest = `${folder}/.env`;
  if (!existsSync(dest)) {
    copyFileSync(`${folder}/.env.example`, dest);
    if (folder === 'backend') writeFileSync(dest, readFileSync(dest, 'utf8').replace('REEMPLAZAR_CON_UN_SECRETO_ALEATORIO_DE_32_CARACTERES_MINIMO', randomBytes(48).toString('hex')));
    console.log(`Creado ${dest}. Revisa sus valores antes de iniciar.`);
  } else console.log(`Se conserva ${dest}.`);
}
