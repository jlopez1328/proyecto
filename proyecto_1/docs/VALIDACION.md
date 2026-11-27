# Validación de proyecto_1

La suite utiliza un MongoDB temporal independiente de los datos locales. Ejecuta npm test y npm run build desde proyecto_1.

Se comprueban permisos, registro, acceso, compras/ventas transaccionales, descuentos, existencias, daños, idempotencia, estadísticas, MVC y cierre de sesión. La recuperación prueba aprobación sin vencimiento, aislamiento por navegador, revocación, contraseñas sencillas de 4 a 12 caracteres, confirmación, uso único concurrente y cierre de sesiones. Las contraseñas antiguas siguen permitiendo el acceso.

## Resultado comprobado

26 de noviembre de 2026: **40 pruebas aprobadas** desde proyecto_1 (22 del servidor con MongoDB temporal y 18 de interfaz) y compilación Vite correcta. La instalación local se reconstruyó y la aplicación se inició desde su nueva carpeta.

En el navegador se verificó el ingreso de admin con la contraseña solicitada, el formulario de recuperación sin credenciales administrativas, la solicitud de vendedor.prueba, su notificación en la campana y el enlace a Usuarios. La solicitud de prueba se revocó al terminar, sin cambiar la contraseña del vendedor. Se conservan las cuatro cuentas, el producto, la compra y la venta; el panel muestra ocho unidades disponibles.

Se eliminaron los HTML/CSS duplicados, las carpetas original y su copia pública, los archivos de compatibilidad ya innecesarios, el ZIP anterior y los scripts temporales. Los estilos e imágenes usados quedaron integrados en frontend. Los datos persistentes, la configuración privada y los accesos de las cuentas de prueba permanecen excluidos de Git. .github se conserva en la raíz del repositorio porque GitHub requiere esa ubicación; sus flujos están adaptados a proyecto_1.

## Ampliación administrativa y nombres de carpetas

La última comprobación aprueba **46 pruebas**: 25 del servidor y 21 de interfaz, más compilación Vite. Se verifican cambios directos de claves reservados al administrador, validación de confirmación y longitud, revocación de sesiones, anulación de recuperación pendiente y cierre de sesión al cambiar la clave propia.

Las carpetas del código se denominan modelo, vista y controlador. El backend contiene src/modelo y src/controlador; el frontend contiene src/modelo, src/vista y src/controlador. Las pantallas corresponden al frontend; no se duplican en el backend.

## Edición de productos por comprador y administrador

Se aprobaron 49 pruebas (26 del servidor y 23 de interfaz) y la compilación Vite. Se verificó la edición persistente de fichas por ambos roles, el rechazo del vendedor, la conservación de existencias/código y la edición desde Compras conservando la cantidad del carrito.

## Papelera y cantidad al crear productos

La validación actual comprende 54 pruebas aprobadas: 28 del servidor y 26 de interfaz, con compilación Vite correcta. Se comprueba la eliminación recuperable de usuarios, la confirmación/cancelación, la protección de la cuenta actual y la conservación de operaciones. También se prueba que un producto nuevo se añade a la compra con la cantidad elegida y solo ingresa al inventario al confirmar esa compra.

Los accesos vendedor y comprador fueron sincronizados con sus cuentas existentes y verificados a través de http://127.0.0.1:5173. Sus claves se mantienen únicamente en la configuración de accesos local ignorada por Git.

## Cantidad disponible en Modificar

Se aprobaron 57 pruebas (30 del servidor y 27 de interfaz) y la compilación de producción. Comprador y administrador pueden ajustar cantidades con movimientos auditables, incluidos aumentos, disminuciones y cero. Se comprueba la validación de enteros, permisos y conflictos con compras posteriores a la apertura del formulario. La interfaz conserva los datos escritos cuando existe un conflicto y mantiene separada la cantidad pendiente del carrito.

## Cantidad en los dos formularios de Inventario

Última validación: 59 pruebas aprobadas (31 del servidor y 28 de interfaz) y compilación Vite correcta. Se prueba Crear producto con cantidad inicial persistida y ajuste inicial, y Modificar con cantidad disponible actualizada. Las pruebas de permisos incluyen comprador y administrador, rechazo del vendedor y validación de cantidades negativas o fraccionarias. La versión local quedó iniciada con estos cambios.

## Sesión ligada a la página abierta

Última comprobación: 64 pruebas aprobadas (33 del servidor y 31 de interfaz) y compilación Vite correcta. Se prueba la clave efímera de la pestaña, su descarte al salir, el regreso desde caché, el rechazo de cookies sin la clave original y la imposibilidad de reutilizar una sesión antigua desde el nuevo frontend. Las peticiones normales de la misma página conservan el acceso; cerrar, reabrir o recargar exige autenticación nueva.
