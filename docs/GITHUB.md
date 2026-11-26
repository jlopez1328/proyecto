# Git, ramas, GitHub Actions y Projects

El código y los archivos de automatización se entregan localmente. Crear un repositorio remoto o un tablero real requiere una cuenta de GitHub autenticada y el repositorio de destino. No se incluyen tokens ni se crean recursos en una cuenta supuesta.

Destino indicado para esta entrega: **https://github.com/jlopez1328/proyecto.git**. La consulta remota fue rechazada por credenciales inválidas. La publicación y creación del tablero quedan pendientes de conectar GitHub con acceso a ese repositorio. Antes de subir, consulta y conserva su historial remoto; no sobrescribas main ni uses --force.

## Estrategia de ramas

Si recibiste solamente el ZIP, el archivo no contiene metadatos .git ni historial. Inicializa tu repositorio antes de publicarlo:

```powershell
git init -b main
git add .
git commit -m "feat: sistema de gestion comercial NexusStock"
git switch -c feature/gestion-comercial
```

Configura tu nombre/correo con git config si Git aún no conoce tu identidad. En la carpeta de trabajo entregada, Git ya conserva el commit original y la rama de implementación.

- main: versiones aceptadas.
- develop: integración del equipo.
- feature/gestion-comercial: implementación inicial; futuras historias usan feature/HU-nombre.
- fix/descripcion: correcciones verificadas.

La copia original se guarda como commit base. El sistema se desarrolla en su rama y conserva main como referencia de los originales. Una vez aceptado, abre un PR de feature/gestion-comercial a main. Para trabajo posterior crea develop desde main actualizado. Usa commits descriptivos y PRs pequeños vinculados a historias.

## Publicación inicial

Instala GitHub CLI y autentica tu cuenta:

```powershell
gh auth login
gh auth status
```

Desde esta carpeta, con tus commits locales listos:

```powershell
gh repo create TU_USUARIO/nexusstock --private --source . --remote origin
git push -u origin main
git push -u origin feature/gestion-comercial
gh pr create --base main --head feature/gestion-comercial --title "Sistema de gestión comercial NexusStock" --body "Implementa ventas, compras, inventario y permisos. Incluye pruebas, Swagger y manuales."
```

Sustituye TU_USUARIO por la cuenta o organización correcta. Si el remoto ya existe, usa `git remote add origin URL_DEL_REPOSITORIO` en lugar de crear uno. No uses --force sobre ramas compartidas. Verifica `git status` y `git remote -v` antes de publicar. `npm run setup` crea archivos .env ignorados; nunca los agregues con -f.

## GitHub Actions

ci.yml ejecuta instalación reproducible, pruebas de integración con MongoDB temporal, pruebas React, compilación, auditoría de dependencias y adjunta el frontend compilado. Corre en main, develop, feature/**, fix/** y PRs a main/develop. No necesita acceso a tu base de datos ni secretos comerciales.

En Settings → Rules → Rulesets configura revisión requerida y el check verify antes de fusionar. Habilita Dependabot para actualizaciones propuestas. El flujo CI no despliega en producción.

## Crear el tablero e importar historias

Con el repositorio remoto creado y GitHub CLI conectado:

```powershell
gh auth refresh -s project
node scripts/github-project.mjs TU_USUARIO TU_USUARIO/nexusstock
```

El script crea o reutiliza el tablero `NexusStock · Scrum`, lo enlaza al repositorio, añade campos Sprint y Puntos, crea las 15 historias de docs/backlog.json si no existen por título y las agrega al tablero. Los argumentos se pasan directamente a GitHub CLI, sin construir instrucciones de shell. Repetir el script permite continuar tras un error; no cierres historias automáticamente sin revisión.

Las historias se publican abiertas para revisar criterios, aunque su implementación esté entregada. El equipo las mueve y cierra tras aceptación. Configura las vistas y automatizaciones de Status descritas en SCRUM.md.

## Automatizar nuevos elementos

En Settings → Secrets and variables → Actions:

- Variable PROJECT_URL: URL real del tablero creado.
- Secreto ADD_TO_PROJECT_PAT: token de la cuenta con permisos para escribir ese proyecto y leer el repositorio. Restringe permisos, propietario y expiración; usa un token de servicio administrado por el equipo si corresponde.

El workflow project.yml permanece sin ejecutarse mientras PROJECT_URL no esté configurada. Cuando lo esté, agrega issues y PRs abiertos/reabiertos al tablero. El secreto nunca se escribe en archivos. No actives este flujo para contribuciones externas sin revisar la política de permisos de Actions.

Referencias oficiales: [GitHub CLI Projects](https://cli.github.com/manual/gh_project), [agregar elementos automáticamente](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/automating-projects-using-actions).
