# Instalación y ejecución en Visual Studio Code

## Prueba local rápida sin Docker

En la terminal de esta carpeta ejecuta `npm ci` y `npm run local`. No necesitas instalar MongoDB como servicio: se usa el binario oficial MongoDB 7.0.24, descargado por la herramienta incluida si todavía no está en caché.

Abre http://127.0.0.1:5173. Si no existía un administrador, el inicio local crea una cuenta y genera una contraseña aleatoria en backend/.env. Usa ADMIN_USERNAME (por defecto admin) y ADMIN_PASSWORD para entrar. ADMIN_EMAIL es solo contacto. Las cuentas antiguas reciben un nombre de usuario sin cambiar sus contraseñas. Las credenciales, la base de datos y las dependencias quedan excluidas de Git.

Los datos persisten en .mongo/db incluso al detener y volver a iniciar. Ctrl+C detiene frontend, API y el MongoDB iniciado por este comando; no elimina datos. Para volver a usarlo, ejecuta `npm run local`. Los puertos 5173, 4000 y 27017 deben estar disponibles. Si ya usas un MongoDB en 27017, se conserva y se verifica que admita transacciones. Si cambias MONGODB_URI, esa base debe estar iniciada previamente; el comando solo administra automáticamente la URI local de ejemplo.

La aplicación, la API y MongoDB se enlazan a 127.0.0.1 para la prueba. No se crea un sitio público ni se cambia la privacidad del repositorio.

## 1. Requisitos

- Windows, macOS o Linux, Visual Studio Code y Node.js **22.12+** (también funciona Node 24).
- NPM, incluido con Node. Confirma `node --version` y `npm --version` en una terminal nueva.
- MongoDB **7.0+** con replica set (Docker, instalación nativa o Atlas).
- Git para las ramas y GitHub CLI opcional para publicar y configurar Projects.

## 2. Abrir y preparar

En VS Code, selecciona **Archivo → Abrir carpeta**, elige el proyecto y abre **Terminal → Nueva terminal**. Todos los comandos siguientes se ejecutan desde la raíz.

```powershell
npm ci
npm run setup
```

Si PowerShell bloquea `npm.ps1`, usa `npm.cmd` en lugar de `npm`; no es necesario cambiar políticas globales. El archivo package-lock.json fija versiones reproducibles. `npm run setup` crea `backend/.env` y `frontend/.env`, genera un JWT_SECRET y conserva archivos de configuración que ya existan.

## 3. MongoDB: elige una alternativa

### A. Docker Desktop (configuración incluida)

Instala e inicia Docker Desktop con contenedores Linux. Desde VS Code:

```powershell
docker compose -f database/docker-compose.yml up -d
docker compose -f database/docker-compose.yml logs mongo-init
```

El servicio mongo-init prepara el replica set rs0 y espera su elección como primario. Cuando indique `MongoDB listo para NexusStock.`, usa:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/nexusstock?replicaSet=rs0&directConnection=true
```

El acceso desde el host requiere directConnection porque el miembro se anuncia internamente como mongo:27017. Los datos persisten en un volumen Docker. Para detener sin borrar: `docker compose -f database/docker-compose.yml stop`. Para reanudar: `docker compose -f database/docker-compose.yml up -d`. No elimines el volumen si quieres conservar información.

### B. MongoDB instalado en Windows

Instala MongoDB Community Server y MongoDB Shell (mongosh). Si hay un servicio MongoDB ocupando 27017, detenlo desde Servicios de Windows o usa otro puerto y ajusta la URI. Crea un directorio local de datos fuera del repositorio o usa `.mongo` (ignorado por Git).

```powershell
New-Item -ItemType Directory -Force .mongo
mongod --dbpath .mongo --replSet rs0 --bind_ip 127.0.0.1 --port 27017
```

Deja esa terminal abierta. En otra terminal:

```powershell
mongosh "mongodb://127.0.0.1:27017" --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})'
mongosh "mongodb://127.0.0.1:27017" --eval 'db.hello().isWritablePrimary'
```

Espera `true`. Configura la misma URI de la alternativa A. Un servidor standalone no soporta las transacciones de esta aplicación; el inicio de la API comprueba este requisito.

### C. MongoDB Atlas

Crea un clúster, un usuario de base de datos con permisos readWrite sobre nexusstock y permite únicamente tu IP en Network Access. Copia la URI del controlador Node.js y configura el nombre de base:

```dotenv
MONGODB_URI=mongodb+srv://USUARIO:CLAVE_CODIFICADA@TU_CLUSTER/nexusstock?retryWrites=true&w=majority
```

Sustituye los valores reales; codifica caracteres especiales de usuario/contraseña como URI. No compartas esa cadena ni la subas a Git. Atlas ya proporciona la topología necesaria para transacciones; no ejecutes rs.initiate allí.

## 4. Configurar el administrador

Abre `backend/.env`. Mantén JWT_SECRET generado por setup y define:

```dotenv
PORT=4000
NODE_ENV=development
ADMIN_NAME=Tu nombre
ADMIN_USERNAME=admin
ADMIN_EMAIL=tu-correo@ejemplo.com
ADMIN_PASSWORD=MiClave123
FRONTEND_URL=http://localhost:5173,http://127.0.0.1:5173,http://localhost:4000,http://127.0.0.1:4000
```

Usa una contraseña propia de 4 a 12 caracteres; el ejemplo es solo orientativo. No hay cuentas ni contraseñas predeterminadas. Ejecuta:

```powershell
npm run seed
```

El proceso crea únicamente el primer administrador. Si la cuenta ya existe no cambia su contraseña ni su rol. Después, las cuentas se administran desde Usuarios. Puedes quitar ADMIN_PASSWORD del archivo una vez creado el administrador.

## 5. Ejecutar

```powershell
npm run dev
```

- Interfaz: [http://localhost:5173](http://localhost:5173).
- API: [http://localhost:4000/api/health](http://localhost:4000/api/health).
- Swagger: [http://localhost:4000/api/docs](http://localhost:4000/api/docs).
- La portada utiliza los estilos integrados en frontend/src/base.css.

La terminal mantiene ambos procesos activos. Detén con Ctrl+C. Para ejecutarlos por separado: `npm run dev -w backend` y `npm run dev -w frontend` en dos terminales. Si cambias PORT, cambia API_PROXY_TARGET en frontend/.env. Si cambias el origen de la interfaz, actualiza FRONTEND_URL y reinicia ambos procesos. Vite redirige /api al backend para que la sesión use el mismo origen de la página.

## 6. Pruebas y compilación

```powershell
npm test
npm run build
npm start
```

Con una compilación existente, Express sirve la interfaz en [http://localhost:4000](http://localhost:4000). El primer test descarga MongoDB a la caché del sistema; no usa ni modifica MONGODB_URI. Si una red corporativa bloquea la descarga, configura MONGOMS_SYSTEM_BINARY con la ruta a un mongod 7 compatible y repite las pruebas. No desactives la verificación de certificados.

## Solución de problemas

| Síntoma | Solución |
| --- | --- |
| No conecta con el servidor | Comprueba que npm run dev siga activo y API_PROXY_TARGET coincida con PORT |
| ECONNREFUSED / selección de servidor | Verifica MongoDB, URI, puerto y lista de IP permitidas de Atlas |
| Requiere replica set | Completa rs.initiate o usa el Docker incluido; espera el primario |
| Origen no permitido | Añade el origen exacto (protocolo, host y puerto) a FRONTEND_URL y reinicia |
| Sesión no persiste en producción | Usa HTTPS; NODE_ENV=production activa cookies Secure |
| Puerto en uso | Cierra el proceso anterior o cambia puerto y configuración del proxy |
| Correo ya existe al crear cuenta | Inicia sesión con esa cuenta o usa otro correo |
| Un producto no se elimina | Debe tener cero existencias disponibles; registra salidas reales antes de eliminar |
| 401 después de cambiar un rol | Es intencional: inicia sesión nuevamente con los permisos actualizados |
| No hay datos en informes | Selecciona el año correcto y registra compras/ventas; no se carga información ficticia |

Referencias oficiales: [transacciones MongoDB](https://www.mongodb.com/docs/manual/core/transactions/), [consideraciones para replica sets](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/), [variables de Vite](https://vite.dev/guide/env-and-mode).
