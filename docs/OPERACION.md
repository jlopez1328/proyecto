# Manual de uso y operación

## Primera operación

1. Entra con la cuenta administradora creada con `npm run seed`.
2. En Usuarios crea cuentas de vendedor y comprador con correos únicos y claves propias. El registro público también permite crear vendedores.
3. En Compras selecciona Crear producto: nombre, categoría, neto, IVA, otros impuestos, ganancia y mínimo de stock. El sistema asigna PRD-000001 y siguientes. Crear la ficha no incrementa existencias.
4. Busca el producto, agrégalo a la compra, ajusta cantidad y valores e introduce el proveedor. Puedes agregar varios productos. Confirma y consulta el comprobante interno. El stock aumenta y el precio de venta se actualiza al sugerido.
5. En Ventas busca por nombre o código y agrega productos. Ajusta cantidades, descuento de cada línea y descuento general. Puedes registrar un cliente y una nota. Confirma; el servidor toma el precio vigente y valida existencias.
6. En Inventario consulta las existencias, el stock mínimo y daños. Puedes editar la ficha y el precio de venta. Para productos rotos utiliza Registrar daño e indica unidades y motivo. El daño descuenta stock disponible; no representa una venta.
7. Revisa el panel y el historial de cada módulo. Los reportes se agrupan por mes de America/Bogota y año elegido. El vendedor solo ve sus ventas; comprador y administrador ven estadísticas agregadas del negocio y existencias actuales.

## Ejemplo de cálculo

Producto de $100 netos, IVA 19%, otros impuestos 5%, recargo de ganancia 30%:

- Costo unitario con impuestos: 100 × 1,24 = $124.
- Venta sugerida: 124 × 1,30 = $161,20.
- Dos unidades: subtotal $322,40.
- Descuento individual 10%: $290,16.
- Descuento general 20%: total final $232,13, redondeado a dos decimales.

La ganancia es un recargo sobre el costo con impuestos. El precio sugerido y el de venta pueden coincidir o modificarse desde Inventario. Una compra posterior reemplaza el precio de venta por el sugerido actualizado. IVA, impuestos y reglas se configuran por producto; la aplicación no determina automáticamente las obligaciones tributarias.

## Manejo de errores

Ante existencias insuficientes, no se confirma ninguna línea. El carrito permanece para corregir la operación. El catálogo se vuelve a consultar tras el conflicto. Ante interrupción de red, reintentar el mismo contenido conserva el identificador para evitar duplicados. Si recargas la página, el carrito se descarta: revisa el historial antes de repetir una operación cuya respuesta no recibiste.

No se editan operaciones confirmadas ni se eliminan comprobantes. La eliminación de productos los archiva y conserva su historial, y solo está disponible con stock cero. Para desactivar una cuenta usa Usuarios; se revocan sus sesiones. Una cuenta no puede modificar sus propios permisos o estado. El cierre de sesión invalida todos los JWT vigentes de esa cuenta.

La interfaz permite imprimir el comprobante desde su detalle. Es un comprobante interno; no implementa facturación electrónica, notas crédito, devoluciones, cuentas por cobrar ni integraciones de pago.

## Producción

1. Configura MongoDB Atlas o un replica set administrado con autenticación, TLS y copias de seguridad.
2. Establece JWT_SECRET aleatorio, MONGODB_URI, NODE_ENV=production y FRONTEND_URL con el origen HTTPS real. El secreto no se incluye en la compilación de React.
3. Ejecuta `npm ci`, `npm run build` y `npm start`. Express sirve frontend/dist y /api desde el mismo origen. Ejecuta la compilación antes de iniciar Express.
4. Sitúa Express detrás de un proxy con HTTPS. Mantén la API enlazada a una red privada o protegida por el proxy. Este proyecto no configura un proveedor de alojamiento ni certificados.
5. Si utilizas proxy inverso, configura trust proxy en Express con el número o red exactos de proxies de confianza antes de los limitadores; no aceptes encabezados de clientes sin verificar su origen.
6. Rota JWT_SECRET para invalidar todas las sesiones. No registres contraseñas, cookies ni cadenas de conexión. Usa el sistema de secretos del servidor.

Los límites de solicitudes incluidos se almacenan en memoria y son adecuados para un proceso. Un despliegue con varias instancias necesita un almacén compartido para límites y la política de proxy adecuada.

## Copias de seguridad

Instala MongoDB Database Tools. Estos comandos usan una variable de entorno de tu terminal, evitando escribir la contraseña en archivos versionados:

```powershell
# Define MONGODB_URI en esta terminal con el valor de tu instalación.
mongodump --uri "$env:MONGODB_URI" --out ./respaldo-nexusstock
```

Guarda los respaldos fuera del repositorio, cifrados y con acceso restringido. Para restaurar en una base de pruebas vacía:

```powershell
mongorestore --uri "$env:MONGODB_URI" ./respaldo-nexusstock
```

No se utiliza --drop para evitar borrados involuntarios. Verifica regularmente una restauración en un entorno separado. Atlas permite configurar backups administrados según el plan contratado.
