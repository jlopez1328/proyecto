# NexusStock · proyecto_1

Sistema local de ventas, compras e inventario con React/Vite, Express, MongoDB/Mongoose y estructura modelo, vista y controlador (MVC).

## Abrir y ejecutar en Visual Studio Code

Abre esta carpeta **proyecto_1** con Archivo → Abrir carpeta. En Terminal → Nueva terminal:

```powershell
npm ci
npm run local
```

Si las dependencias ya están instaladas, basta con npm run local. Abre http://127.0.0.1:5173. Solo es accesible desde este computador. Detén con Ctrl+C; la base se conserva en .mongo/db. La configuración privada está en backend/.env, excluida de Git. No ejecutes dos copias de la aplicación al mismo tiempo.

## Estructura

- frontend/src/models: acceso a datos y sesión.
- frontend/src/controllers: lógica de las pantallas.
- frontend/src/views: pantallas, componentes y navegación.
- backend/src/models: entidades Mongoose.
- backend/src/controllers: operaciones de la API.
- backend/src/routes y middleware: rutas, permisos y seguridad.
- backend/src/services: transacciones y recuperación.
- database: configuración MongoDB y modelo de datos.
- docs: instalación, operación, arquitectura, Scrum y API.
- scripts: inicio local, configuración y automatización.

GitHub utiliza .github en la raíz del repositorio, un nivel por encima de esta carpeta. Sus flujos ejecutan las comprobaciones dentro de proyecto_1.

| Rol | Acceso |
| --- | --- |
| Vendedor | Ventas y su historial |
| Comprador | Compras, inventario y estadísticas |
| Administrador | Todos los módulos, usuarios, autorización de recuperación y cambio directo de claves |

El botón **Cerrar sesión** está en la barra superior. El administrador tiene una campana con las solicitudes pendientes de cambio de contraseña, actualizada cada 15 segundos mientras la aplicación está visible. Las contraseñas nuevas tienen de 4 a 12 caracteres sin requisitos de complejidad. Las contraseñas anteriores siguen funcionando. La recuperación requiere solicitar el cambio y que un administrador lo autorice en Usuarios; no pide sus credenciales ni códigos y no tiene vencimiento. [Manual de recuperación](docs/RECUPERACION.md).

## Comprobaciones

```powershell
npm test
npm run build
```

Las pruebas utilizan una base temporal independiente. [Instalación y conexión de MongoDB](docs/INSTALACION.md), [uso](docs/OPERACION.md), [arquitectura MVC](docs/ARQUITECTURA.md), [API](docs/API.md), [Scrum](docs/SCRUM.md) y [GitHub](docs/GITHUB.md). Swagger: http://127.0.0.1:4000/api/docs.
