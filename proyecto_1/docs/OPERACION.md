# Manual de uso y operación

## Primera operación

1. Entra con la cuenta administradora creada con `npm run seed`.
2. En Usuarios crea cuentas de vendedor y comprador con nombre de usuario único, nombre completo, correo de contacto y contraseña. El acceso usa nombre de usuario y contraseña; el correo solo se completa como contacto. El registro público también permite crear vendedores.
3. En Compras selecciona Crear producto: nombre, categoría, neto, IVA, otros impuestos, ganancia y mínimo de stock. El sistema asigna PRD-000001 y siguientes. Crear la ficha no incrementa existencias.
4. Busca el producto, agrégalo a la compra, ajusta cantidad y valores e introduce el proveedor. Puedes agregar varios productos. Confirma y consulta el comprobante interno. El stock aumenta y el precio de venta se actualiza al sugerido.
5. En Ventas busca por nombre o código y agrega productos. Ajusta cantidades, descuento de cada línea y descuento general. Puedes registrar un cliente y una nota. Confirma; el servidor toma el precio vigente y valida existencias.
6. En Inventario consulta las existencias, el stock mínimo y daños. Puedes editar la ficha y el precio de venta. Para productos rotos utiliza Registrar daño e indica unidades y motivo. El daño descuenta stock disponible; no representa una venta.
7. Revisa el panel y el historial de cada módulo. Los reportes se agrupan por mes de America/Bogota y año elegido. El vendedor solo ve sus ventas; comprador y administrador ven estadísticas agregadas del negocio y existencias actuales.

## Cerrar sesión

En cualquier módulo, pulsa **Cerrar sesión** en la barra superior, junto al nombre de la cuenta. Está disponible para vendedor, comprador y administrador, también en pantallas pequeñas sin abrir el menú lateral. El sistema revoca las sesiones anteriores de esa cuenta, elimina la cookie y vuelve a la pantalla de acceso. Si falla la conexión, muestra un aviso y permite reintentar.

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

## Modificar productos existentes

Comprador y administrador pueden editar productos desde **Compras → catálogo → Modificar producto** o **Inventario → Modificar**. Se pueden cambiar nombre, categoría, precio neto, IVA, otros impuestos, ganancia, stock mínimo y precio de venta. Al guardar se actualiza el catálogo; si el producto ya está en el carrito de compra, se actualiza su ficha y se conserva la cantidad elegida.

El código consecutivo se conserva al editar la ficha. La opción Cantidad disponible permite corregir existencias con un movimiento de ajuste; también cambian mediante compras, ventas y daños registrados. El vendedor no dispone de edición de productos y la API rechaza esa operación para su rol.

## Eliminar usuarios con la papelera roja

Solo el administrador dispone de la papelera roja en Usuarios. Al pulsarla se muestra el nombre y el usuario de la cuenta, con botones Cancelar y Eliminar usuario. La cuenta desaparece del listado habitual, sus sesiones se cierran y deja de poder iniciar sesión. Sus compras, ventas e historial permanecen registrados.

En Usuarios eliminados puedes recuperar una cuenta. Se recupera como inactiva; vuelve a Usuarios y activa la casilla Activo si quieres permitirle entrar. El nombre de usuario permanece reservado mientras está eliminada. La papelera de tu propia cuenta está deshabilitada.

## Cantidad al crear un producto en Compras

En Compras → Crear producto, completa Cantidad a comprar. Al guardar la ficha, el producto se agrega automáticamente a la orden con esa cantidad. Indica el proveedor y pulsa Confirmar compra para ingresar las existencias. Así queda registrada la compra con sus impuestos y no se duplica el ingreso al inventario. La cantidad también puede ajustarse después en el carrito. Editar una ficha existente conserva sus existencias salvo que modifiques expresamente Cantidad disponible.

## Cantidad al modificar un producto

En Compras o Inventario, pulsa Modificar y cambia Cantidad disponible. Se puede indicar cero o cualquier cantidad entera no negativa dentro del límite del sistema. Puedes añadir un motivo del ajuste. Al guardar, cambia el total disponible y se registra en Movimientos una entrada o salida de tipo ajuste, con referencia AJU, fecha y usuario. Esta corrección no crea una compra ni una venta.

Si otra operación cambió las existencias después de abrir el formulario, no se sobrescriben: aparece un aviso y debes cerrar y volver a abrir Modificar para ver el valor actual. Cambiar otros campos sin tocar Cantidad disponible conserva las existencias actuales. La cantidad pendiente del carrito de compra se conserva por separado.

## Cantidades desde Inventario

- Crear producto: Cantidad inicial se guarda directamente como existencias al pulsar Guardar producto. Si es mayor que cero, se registra un ajuste inicial con fecha, usuario y referencia AJU. No se crea una compra.
- Modificar: Cantidad disponible permite corregir las existencias actuales y genera el ajuste correspondiente.

Ambas opciones están disponibles para comprador y administrador. Crear desde Compras conserva su flujo: Cantidad a comprar pasa a la orden y se ingresa al confirmar la compra.

## Cierre al cerrar la pestaña

El acceso de la aplicación queda vinculado a una clave aleatoria que solo vive en la memoria de la página. Al cerrar la pestaña o Chrome, abrir otra pestaña, reabrir la página o recargar con F5, es necesario iniciar sesión nuevamente. La navegación interna entre módulos conserva el acceso.

No se guarda esta clave en localStorage ni sessionStorage. La cookie JWT permanece HttpOnly y ahora es una cookie de sesión sin vencimiento persistente en disco. El servidor exige la clave de la página que inició el acceso; conservar o restaurar únicamente la cookie no permite entrar desde una página nueva. Al volver desde la caché del navegador se descarta el acceso anterior. El botón Cerrar sesión sigue revocando las sesiones de la cuenta.

Los clientes de API que no utilizan X-Tab-Session conservan su flujo anterior. La aplicación React siempre lo utiliza y exige un ingreso nuevo para sesiones anteriores que no estaban vinculadas a una página.

Referencias de implementación: [ciclo de vida de páginas en Chrome](https://developer.chrome.com/docs/web-platform/page-lifecycle-api) y [restauración desde caché](https://web.dev/articles/bfcache).
