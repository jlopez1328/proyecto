import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const args=process.argv.slice(2), owner=args[0], repo=args[1];
if(!owner||!repo||!/^[-\w]+$/.test(owner)||!/^[-\w.]+\/[-\w.]+$/.test(repo)) {
  console.error('Uso: node scripts/github-project.mjs PROPIETARIO PROPIETARIO/REPOSITORIO');process.exit(1);
}
const gh=(...parts)=>execFileSync(process.env.GH_CLI_PATH || 'gh',parts,{encoding:'utf8',stdio:['ignore','pipe','inherit']}).trim();
try {
  gh('auth','status');
  const title='NexusStock · Scrum';
  const projects=JSON.parse(gh('project','list','--owner',owner,'--format','json','--limit','100')).projects;
  const project=projects.find(p=>p.title===title)||JSON.parse(gh('project','create','--owner',owner,'--title',title,'--format','json'));
  gh('project','link',String(project.number),'--owner',owner,'--repo',repo);
  const fields=JSON.parse(gh('project','field-list',String(project.number),'--owner',owner,'--format','json')).fields;
  if(!fields.some(f=>f.name==='Sprint'))gh('project','field-create',String(project.number),'--owner',owner,'--name','Sprint','--data-type','SINGLE_SELECT','--single-select-options','Sprint 1,Sprint 2,Sprint 3,Sprint 4');
  if(!fields.some(f=>f.name==='Puntos'))gh('project','field-create',String(project.number),'--owner',owner,'--name','Puntos','--data-type','NUMBER');
  const allFields=JSON.parse(gh('project','field-list',String(project.number),'--owner',owner,'--format','json')).fields;
  const sprint=allFields.find(f=>f.name==='Sprint'), points=allFields.find(f=>f.name==='Puntos');
  const backlog=JSON.parse(readFileSync(new URL('../docs/backlog.json',import.meta.url),'utf8'));
  const existing=JSON.parse(gh('issue','list','--repo',repo,'--state','all','--limit','1000','--json','title,url'));
  for(const story of backlog) {
    const name=`[${story.id}] ${story.title}`;
    let url=existing.find(i=>i.title===name)?.url;
    if(!url)url=gh('issue','create','--repo',repo,'--title',name,'--body',`Historia planificada para Sprint ${story.sprint}. Estimación: ${story.points} puntos.\n\nCriterios de aceptación:\n${story.criteria.map(c=>`- [ ] ${c}`).join('\n')}\n\nRevisar el código y las pruebas antes de marcar Done. Estos issues se importan abiertos para su aceptación por el equipo.`);
    const item=JSON.parse(gh('project','item-add',String(project.number),'--owner',owner,'--url',url,'--format','json'));
    gh('project','item-edit','--id',item.id,'--project-id',project.id,'--field-id',points.id,'--number',String(story.points));
    const option=sprint.options.find(o=>o.name===`Sprint ${story.sprint}`);
    gh('project','item-edit','--id',item.id,'--project-id',project.id,'--field-id',sprint.id,'--single-select-option-id',option.id);
    console.log(`Preparado ${story.id}`);
  }
  console.log(`Tablero preparado: ${project.url || `https://github.com/users/${owner}/projects/${project.number}`}`);
  console.log('Configura PROJECT_URL y ADD_TO_PROJECT_PAT para automatizar nuevas historias.');
}catch(error){console.error('No se completó la configuración. Verifica GitHub CLI, cuenta, permisos de proyecto y repositorio. Puedes repetir para continuar.',error.message);process.exit(1);}
