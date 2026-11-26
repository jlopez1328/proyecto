# NexusStock · Gestión comercial

Aplicación completa de ventas, compras e inventario basada en la portada y acceso originales de NexusStock. React + Vite, Node.js + Express, MongoDB + Mongoose, autenticación JWT en cookie HttpOnly, bcrypt y API REST documentada con Swagger.

Los archivos HTML/CSS y las imágenes de la raíz de esta rama se conservan idénticos a los de `origin/main`. `original/` contiene la copia íntegra de la versión recibida localmente; sus dos títulos HTML difieren de la versión remota, y ambas versiones se conservan. No había un ZIP adicional disponible en esta carpeta; se tomó como base el proyecto existente.

## Inicio desde Visual Studio Code

Abre esta carpeta en VS Code y abre **Terminal → Nueva terminal**. Necesitas Node.js 22.12 o posterior y MongoDB con replica set; Docker Desktop es una opción para la base local.

```powershell
npm ci
npm run setup
docker compose -f database/docker-compose.yml up -d
docker compose -f database/docker-compose.yml logs mongo-init
```

Espera el mensaje `MongoDB listo para NexusStock.`. Abre `backend/.env` y define un correo propio en `ADMIN_EMAIL` y una contraseña de al menos 10 caracteres en `ADMIN_PASSWORD`. El comando setup genera el secreto JWT sin sobrescribir configuraciones existentes.

```powershell
npm run seed
npm run dev
```

Abre [NexusStock](http://localhost:5173) y entra con el administrador que configuraste. La documentación interactiva está en [Swagger](http://localhost:4000/api/docs). Si no utilizas Docker, sigue las alternativas de [MongoDB e instalación](docs/INSTALACION.md).

## Módulos

- **Registro y acceso:** registro público de vendedores; creación administrativa de compradores y administradores; sesiones revocadas al cambiar permisos o cerrar sesión.
- **Ventas:** búsqueda por nombre/código, cantidades, carrito, descuentos por línea y generales, confirmación atómica, comprobante imprimible e historial. El vendedor consulta solo sus ventas.
- **Compras:** fichas de productos con ID consecutivo; costos netos, IVA, otros impuestos, recargo de ganancia, precio sugerido y recepción de múltiples productos por proveedor.
- **Inventario:** consulta, creación, edición, eliminación lógica sin stock, mínimo de existencias, daños con motivo, historial de movimientos y estadísticas mensuales.
- **Panel:** accesos según rol, gráficas y tabla mensual, ventas, compras, alertas de stock y valor del inventario.
- **Administración:** creación de cuentas, cambios de rol y activación/desactivación. No se permite modificar la propia cuenta para conservar un administrador.

| Rol | Ventas | Compras | Inventario | Usuarios |
| --- | --- | --- | --- | --- |
| Vendedor | Sí, historial propio | No | No; catálogo de venta sin costos | No |
| Comprador | No | Sí | Sí; informes agregados de compras/ventas | No |
| Administrador | Sí, todas | Sí | Sí | Sí |

## Estructura

```text
original/        Copia íntegra de los archivos recibidos
frontend/        React, estilos, imágenes y pruebas de interfaz
backend/         Express, modelos Mongoose, REST, Swagger y pruebas
database/        MongoDB local, inicialización y modelo de datos
docs/            Instalación, operación, API, arquitectura, Scrum y GitHub
.github/         Integración continua, plantillas y configuración
scripts/         Configuración inicial y preparación de GitHub Projects
```

## Automatización y comprobaciones

```powershell
npm test
npm run build
npm run check
npm audit
npm run package
```

Las pruebas de integración levantan un replica set MongoDB temporal y prueban rutas HTTP reales, sin reemplazar la base por simulaciones. La primera ejecución descarga un binario MongoDB 7.0.24; requiere Internet. La base temporal es independiente de tus datos. Se prueban también los flujos de carrito, compras y conflictos en React. GitHub Actions repite pruebas, compilación y auditoría cuando se sube el repositorio.

`npm run package` exporta el último commit limpio como NexusStock-entrega.zip, sin dependencias, configuraciones privadas, bases locales ni metadatos Git. La entrega ZIP requiere `npm ci` y `npm run setup` después de extraerla.

Para servir la compilación desde Express, configura los orígenes permitidos y ejecuta `npm run build` seguido de `npm start`. En producción usa HTTPS y `NODE_ENV=production`; consulta [operación](docs/OPERACION.md).

Manuales: [instalación completa](docs/INSTALACION.md), [uso y respaldo](docs/OPERACION.md), [API](docs/API.md), [arquitectura y seguridad](docs/ARQUITECTURA.md), [Scrum](docs/SCRUM.md), [Git/GitHub/Projects](docs/GITHUB.md) y [validación](docs/VALIDACION.md).

El sistema registra operaciones comerciales internas. Los comprobantes no sustituyen la facturación electrónica ni una contabilidad fiscal.
