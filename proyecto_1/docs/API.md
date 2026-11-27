# API REST

Contrato ejecutable: `backend/src/openapi.js`. Con la API iniciada, abre [Swagger](http://localhost:4000/api/docs) o descarga [OpenAPI JSON](http://localhost:4000/api/openapi.json). Todas las respuestas de negocio son JSON. Autenticación de navegador mediante cookie session HttpOnly; los clientes deben conservar cookies. JWT Bearer también es admitido si el cliente ya tiene un token válido. El inicio de sesión no expone el token en el cuerpo de respuesta.

## Rutas

| Método | Ruta (prefijo /api) | Acceso / efecto |
| --- | --- | --- |
| GET | /health | Público, 200 si MongoDB está disponible; 503 en caso contrario |
| GET | /openapi.json, /docs | Contrato y documentación interactiva |
| POST | /auth/register | Público; name, username, email de contacto y password; crea vendedor |
| POST | /auth/login | Público; username y password; establece cookie JWT; no admite email como identificador |
| POST | /auth/password-reset/request | Público; username; registra solicitud y responde 202 sin revelar cuentas |
| POST | /auth/password-reset/confirm | Público; username, password y confirmPassword; cookie del navegador solicitante y autorización administrativa sin vencimiento |
| GET | /auth/me | Sesión actual |
| POST | /auth/logout | Revoca sesiones y elimina cookie |
| GET, POST | /users | Administrador; lista o crea cuentas con rol |
| PATCH | /users/:id | Administrador; cambia username opcional, role y active; no cuenta propia |
| POST, DELETE | /users/:id/password-reset | Administrador; autoriza una solicitud sin vencimiento o la revoca; otro administrador para cuenta propia |
| GET | /catalog | Vendedor/administrador; catálogo sin costos |
| GET, POST | /products | Comprador/administrador; lista o crea producto |
| PATCH | /products/:id | Comprador/administrador; ficha completa sin cambiar código/stock |
| DELETE | /products/:id | Comprador/administrador; archiva si stock es cero |
| POST | /products/:id/damage | Comprador/administrador; cantidad, motivo y requestId |
| GET, POST | /sales | Vendedor/administrador; historial o venta; vendedor solo su historial |
| GET, POST | /purchases | Comprador/administrador; historial o compra |
| GET | /movements | Comprador/administrador; movimientos de inventario |
| GET | /reports?year=2026 | Según rol; vendedor solo ventas propias; comprador/admin con agregados e inventario |

Las listas admiten page (desde 1), limit (1–100, predeterminado 20) y search. Productos y catálogo buscan por código/nombre; usuarios por nombre/correo; operaciones por número. Movimientos usa paginación. La respuesta es `{items,total,page,limit}`. Cada registro usa _id MongoDB y los productos tienen además code PRD-000001.

Las solicitudes de escritura son JSON con Content-Type application/json. El servidor devuelve 400 para entradas inválidas, 401 sin sesión, 403 sin permiso/origen permitido, 404 para recurso/ruta inexistente, 409 ante conflicto de stock o duplicados, 413 por tamaño excesivo, 429 por límite de solicitudes y 500 para fallos internos.

## Ejercicio completo en Swagger

1. Usa POST /auth/login con username y password del administrador creado. El navegador conserva la cookie automáticamente. El correo es solo un dato de contacto.
2. Crea un producto con POST /products y toma su _id.
3. Registra una compra usando ese _id y un requestId UUID nuevo.
4. Registra una venta. Para demostrar descuentos sucesivos usa una línea con 10% y descuento general 20%.
5. Consulta /products, /movements, /sales y /reports para comprobar los resultados.

Ejemplo de cuerpo para compra (sustituye el identificador del producto y genera un UUID propio para cada operación):

```json
{
  "requestId": "9f532e52-3121-4b22-9913-d7e409ab13ae",
  "supplier": "Distribuidor Norte",
  "lines": [{"product": "507f1f77bcf86cd799439011", "quantity": 10, "netPrice": 100, "vat": 19, "tax": 5, "margin": 30}]
}
```

Ejemplo de venta:

```json
{
  "requestId": "4c446c03-d1e3-44eb-a2bb-8aa676cbdb15",
  "customer": "Consumidor final",
  "discount": 20,
  "lines": [{"product": "507f1f77bcf86cd799439011", "quantity": 2, "discount": 10}]
}
```

Reutiliza el mismo requestId solo para recuperar el resultado del mismo intento con contenido idéntico. Los valores unitarios de una venta se leen de la base y el total de su respuesta es el definitivo. Los importes de compras y descuentos se redondean a dos decimales. Véase el contrato Swagger para campos obligatorios, máximos y respuestas.
