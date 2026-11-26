# Recuperación de contraseña con autorización del administrador

## Uso

1. En el login, selecciona **¿Olvidaste tu contraseña?**, introduce tu correo y pulsa **Solicitar autorización**.
2. El administrador entra en **Usuarios**, pulsa **Actualizar solicitudes** y localiza la cuenta. Su fila muestra **Recuperación solicitada**.
3. Tras verificar tu identidad, selecciona **Habilitar cambio**. El sistema muestra un código de un solo uso y su vencimiento, quince minutos después. Solo se muestra en ese momento; no se guarda el código en texto claro.
4. El administrador te entrega el código directamente. Puede generar otro, invalidando el anterior, o pulsar **Revocar cambio**.
5. Abre la recuperación desde el login, elige **Ya tengo un código** e introduce correo, código, contraseña nueva y su confirmación. Después de solicitar autorización, el formulario del código también aparece automáticamente.
6. Al guardar, se cierran todas las sesiones anteriores. Vuelve al login para entrar con tu nueva contraseña.

La contraseña debe tener al menos diez caracteres y ocupar como máximo 72 bytes. No se envían correos: esta versión funciona mediante entrega directa del código por el administrador. Los datos comerciales y los permisos de la cuenta permanecen intactos.

## Administración

La opción está disponible para administradores y cuentas destino activas. Un administrador no puede autorizar la recuperación de su propia cuenta: necesita otro administrador. Conserva acceso a una segunda cuenta administradora si quieres poder recuperar ambas mediante este flujo.

También se puede habilitar el cambio para una cuenta activa sin esperar una solicitud pública, una vez verificada la identidad de su titular. Revocar elimina la solicitud y la autorización. Cambiar rol o estado de la cuenta invalida cualquier código anterior. La fecha de solicitud y el vencimiento se muestran en Usuarios; el hash del código nunca se devuelve en sus listas.

backend/.env conserva únicamente las credenciales iniciales de instalación. Cambiar una contraseña desde la aplicación no escribe la nueva contraseña en ese archivo ni restablece la inicial al reiniciar.

## API y controles

| Método | Ruta con prefijo /api | Resultado |
| --- | --- | --- |
| POST | /auth/password-reset/request | Público: recibe email; responde 202 con mensaje genérico sin revelar si una cuenta existe |
| POST | /auth/password-reset/confirm | Público: email, code, password y confirmPassword; exige código autorizado vigente y devuelve 200 |
| POST | /users/:id/password-reset | Solo administrador: genera código, muestra code y expiresAt una vez y devuelve 201 |
| DELETE | /users/:id/password-reset | Solo administrador: revoca solicitud/autorización y devuelve 200 |

Los esquemas están incluidos en Swagger. Los códigos contienen 192 bits de aleatoriedad, se almacenan como SHA-256 y se consumen mediante una actualización atómica. Un segundo intento simultáneo no puede volver a usarlos. Una solicitud pública nueva no invalida un código habilitado y solo actualiza la solicitud una vez por minuto por cuenta. Los endpoints públicos de recuperación limitan además los intentos por IP. Las contraseñas se guardan con bcrypt y se incrementa tokenVersion para revocar JWT existentes. No se inicia sesión automáticamente tras recuperar la cuenta.

Verificación: pruebas de permisos, mensajes genéricos, códigos vencidos/revocados/reemplazados, asociación con la cuenta correcta, confirmación de contraseña, límites de bytes, consumo concurrente y cierre de sesiones; pruebas de formularios de solicitud, cambio, habilitación y revocación.

Referencia de diseño: [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).
