# Informe de validación de la entrega

Fecha: 26 de noviembre de 2026. Entorno: Windows, Node.js 24.21.0, npm 11.19.0. Pruebas ejecutadas sobre un MongoDB 7.0.24 temporal con replica set; no se usaron datos comerciales reales.

## Resultados

| Verificación | Resultado |
| --- | --- |
| Integración HTTP + Mongoose + MongoDB real temporal | 11 pruebas aprobadas |
| Interfaz React y reglas de cálculo | 5 pruebas aprobadas |
| Compilación de producción Vite | Aprobada |
| Auditoría npm de dependencias instaladas | 0 vulnerabilidades reportadas al verificar |
| Preservación de originales | Los seis archivos raíz de la rama de publicación se conservan idénticos a origin/main; original/ conserva la versión local recibida |
| Navegador: acceso, producto, compra, venta y daño | Comprobado contra API y base temporal |
| Navegador: Swagger | Carga correcta de contrato, rutas y esquemas |
| Git | Historial remoto preservado y publicación preparada en feature/publicacion-nexusstock; la rama local anterior se conserva |

## Pruebas de integración

1. Registro público con rol vendedor; rechazo de escalamiento de rol; hash bcrypt y cookie HttpOnly/SameSite; clave incorrecta y acceso anónimo.
2. Permisos por ruta; comprador sin ventas; vendedor sin inventario, compras o movimientos; catálogo sin costo ni ganancia; informes de vendedor sin inventario/compras.
3. Consecutivos de producto; búsqueda por nombre y literal; precio sugerido con ambos impuestos; edición y eliminación lógica.
4. Compra y venta con descuentos sucesivos; reintentos idempotentes sin duplicar stock; rechazo de requestId con contenido/usuario diferentes; separación de historiales.
5. Reversión total de compra o venta si una línea es inválida, incluidos stock y movimientos.
6. Dos ventas simultáneas de una única unidad: una aceptada y otra rechazada; stock final cero.
7. Daños con reintentos, límite de existencias, acumulado dañado, archivo del producto e historial conservado.
8. Rechazo de cantidades inválidas, descuentos mayores a 100%, líneas repetidas, precio con precisión inválida, IDs inválidos, JSON incorrecto y totales manipulados.
9. Revocación de sesión al cambiar rol y cerrar sesión; protección de cuenta propia; creación administrativa sin devolver contraseña.
10. Informes con límites de año y mes en zona horaria America/Bogota.
11. Rechazo de origen ajeno; contrato Swagger; disponibilidad de la API y ruta inexistente.

## Pruebas de interfaz

1. Agregar al carrito, cambiar cantidad y descuentos, enviar únicamente datos autorizados y presentar comprobante.
2. Compra con proveedor, neto, IVA, impuestos y ganancia.
3. Conflicto de stock visible conservando el carrito.
4. Inventario con acciones de edición y eliminación bloqueada cuando hay existencias.
5. Cálculo de descuento general posterior al individual y precio sugerido con impuestos.

## Verificación en navegador

Se usó una instancia temporal independiente con cuenta y producto de prueba. Se inició sesión, se creó PRD-000001 con neto 100, IVA 19%, impuesto adicional 5% y ganancia 30%. El precio sugerido fue 161,20. Una compra de diez unidades generó COM-000001 por 1.240. Una venta de dos unidades con 10% por línea y 20% general generó VEN-000001 por 232,13. Un daño de una unidad dejó siete disponibles y una dañada. Se verificaron comprobantes, actualización de inventario, navegación y carga de Swagger. La vista se comprobó en el tamaño disponible del navegador; no se afirma una matriz exhaustiva de dispositivos.

## Límites de verificación y activación pendiente

No se ejecutó Docker Compose ni se conectó un clúster Atlas en este equipo; se entregan sus configuraciones e instrucciones. El funcionamiento de transacciones sí se verificó con un replica set MongoDB real temporal. GitHub CLI ya quedó autenticado como jlopez1328. El sistema se publicó y su PR #1 fue fusionada desde la web por jlopez1328 a las 12:27 del 26 de noviembre de 2026; esta ejecución no ordenó esa fusión ni revirtió el cambio externo. Los ajustes restantes están en feature/publicacion-nexusstock y PR #27 abierta. Las ejecuciones de GitHub Actions por push y pull_request finalizaron correctamente, incluidos los ajustes de automatización. Se creó el tablero privado NexusStock · Scrum y se verificaron sus 15 historias abiertas con Sprint, Puntos y Todo, así como la vista de columnas agrupada verticalmente por Status. PROJECT_URL está configurada y el propietario guardó ADD_TO_PROJECT_PAT; la ejecución 45870188116 agregó automáticamente la PR #27 al tablero. Los enlaces y el procedimiento están en GITHUB.md.

## Ejecución privada en el computador

Se agregó `npm run local` para iniciar MongoDB, API y Vite sin Docker. MongoDB usa el binario oficial 7.0.24 con datos persistentes en .mongo/db; el administrador se crea solo si no existe y su contraseña inicial queda en backend/.env, ignorado por Git. Se comprobó un reinicio real conservando la cuenta, el inicio de sesión de administrador, la carga de la interfaz y la consulta del panel. Se verificó que los puertos 27017, 4000 y 5173 escuchan exclusivamente en 127.0.0.1. No se publicaron datos ni credenciales y el repositorio y tablero siguen privados.

La instalación operativa necesita tu MongoDB y las credenciales iniciales de administrador. No se incluye una contraseña predeterminada ni se conserva la base temporal de pruebas como base del negocio. La auditoría refleja el momento de ejecución y debe repetirse al actualizar dependencias.

Para reproducir: `npm ci`, `npm test`, `npm run build` y `npm audit`. Para verificar los originales en PowerShell, compara Get-FileHash de cada archivo de original/ con su equivalente en la raíz.
