# GitHub, Actions y tablero Scrum

Repositorio: [jlopez1328/proyecto](https://github.com/jlopez1328/proyecto), conservado como privado.

## Publicación preparada para revisión

- Rama publicada: `feature/publicacion-nexusstock`, basada en el historial remoto existente.
- Solicitud de revisión: [PR #1](https://github.com/jlopez1328/proyecto/pull/1), abierta hacia main y sin fusionar.
- Los seis archivos originales del repositorio se conservan sin cambios. La versión local recibida sigue en original/ y en la rama local anterior feature/gestion-comercial.
- No se publican .env, node_modules, bases locales, credenciales ni archivos de pruebas temporales.
- GitHub CLI quedó autenticado como jlopez1328 en el almacén seguro del sistema, con acceso al repositorio y a Projects. Ninguna credencial se incluye en el código.

La rama main remota permanece en su commit original af3210e64fe3692e6c9cd5730bdc2f26a7f3d9cc. La revisión debe completarse antes de fusionar. No uses --force sobre ramas compartidas.

## GitHub Actions

NexusStock CI ejecuta instalación reproducible, 11 pruebas de integración sobre MongoDB temporal, 5 pruebas React, compilación, auditoría de dependencias y adjunta el frontend compilado. Las primeras ejecuciones de la rama y PR #1 finalizaron correctamente:

- [CI de la solicitud de revisión](https://github.com/jlopez1328/proyecto/actions/runs/45867492385).
- [CI de la publicación inicial](https://github.com/jlopez1328/proyecto/actions/runs/45867427413).

Consulta la ejecución más reciente en la pestaña Actions o en los checks de la PR. El flujo no despliega en producción y no requiere credenciales de tu MongoDB.

## Tablero Scrum

[NexusStock · Scrum](https://github.com/users/jlopez1328/projects/1) es privado y está enlazado al repositorio. Contiene las 15 historias HU-01 a HU-15, abiertas para revisión y aceptación, con Sprint 1–4, Puntos y estado Todo. No se cierran automáticamente por haber entregado el código.

Vistas: Backlog Scrum (tabla) y Tablero Scrum (columnas). Estados: Todo, In Progress y Done. Mantén los criterios de aceptación de cada historia y registra evidencia antes de moverla a Done. La planificación propuesta está en SCRUM.md; no se presentan reuniones como realizadas.

El importador `scripts/github-project.mjs` permite reutilizar el tablero y las historias sin duplicarlos por título. Define GH_CLI_PATH si gh no aparece en PATH, por ejemplo C:/Program Files/GitHub CLI/gh.exe. Después ejecuta:

```powershell
node scripts/github-project.mjs jlopez1328 jlopez1328/proyecto
```

El script conserva estados existentes y asigna Todo únicamente a elementos sin estado.

## Credencial de automatización pendiente de entrada manual

La variable de repositorio PROJECT_URL está configurada con https://github.com/users/jlopez1328/projects/1. Falta que el propietario introduzca una credencial dedicada en el secreto ADD_TO_PROJECT_PAT. La sesión de GitHub CLI es para trabajo interactivo y no se copia como secreto de Actions.

1. En tu cuenta GitHub, crea un Personal access token (classic) dedicado a NexusStock, con permisos repo (repositorio privado) y project (escritura del tablero) y una expiración elegida por ti; 30 días es el valor recomendado para esta preparación.
2. Abre [crear secreto de repositorio](https://github.com/jlopez1328/proyecto/settings/secrets/actions/new).
3. Nombre: ADD_TO_PROJECT_PAT. Pega el token directamente en Secret y guarda. No lo compartas por chat ni lo incluyas en archivos.
4. Rota la credencial antes de su vencimiento y revócala cuando deje de ser necesaria.

El workflow agrega issues abiertos/reabiertos y PRs abiertas/reabiertas/actualizadas al tablero. Mientras falte el secreto, informa la configuración pendiente sin fallar las comprobaciones del sistema. La automatización de nuevos issues requiere integrar el workflow en main; esta entrega mantiene la PR abierta. La inclusión de la PR existente se puede comprobar con una actualización de su rama cuando esté guardado el secreto.

GITHUB_TOKEN por sí solo no alcanza Projects. Referencias oficiales: [Actions con Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/automating-projects-using-actions), [acción add-to-project](https://github.com/actions/add-to-project), [GitHub CLI Projects](https://cli.github.com/manual/gh_project).

## Trabajo posterior

Usa ramas feature/HU-descripcion y fix/descripcion para nuevos cambios. Cuando se acepte esta entrega y se fusione la PR, crea o actualiza develop desde main integrado. Las plantillas de historias, errores y PR ya están incluidas. Puedes habilitar reglas de revisión y checks requeridos según el proceso del equipo; esta publicación no cambia esas políticas ni la visibilidad del repositorio.
