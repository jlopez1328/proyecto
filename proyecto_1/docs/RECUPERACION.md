# Usuarios y recuperación de contraseña

El acceso usa nombre de usuario y contraseña. El correo es solo contacto. Los nombres de usuario admiten de 3 a 32 caracteres: letras, números, punto, guion y guion bajo, sin espacios ni @.

Las contraseñas nuevas tienen entre **4 y 12 caracteres**. Pueden ser solo números o letras; no se exigen mayúsculas ni símbolos. Las contraseñas anteriores de mayor longitud siguen funcionando hasta que sus propietarios decidan cambiarlas. El sistema guarda un hash bcrypt, nunca la contraseña en texto plano en MongoDB.

## Solicitar y autorizar un cambio

1. En el acceso, pulsa **¿Olvidaste tu contraseña?**, escribe tu nombre de usuario y pulsa **Solicitar autorización**.
2. El administrador recibe una notificación en la campana de la barra superior. Se actualiza cada 15 segundos mientras la aplicación está visible y al volver a ella. Abre la notificación, entra en **Usuarios**, comprueba la persona y pulsa **Habilitar cambio** en la solicitud pendiente. También puede pulsar **Actualizar solicitudes**. Para recuperar una cuenta administradora debe autorizar otra cuenta administradora.
3. Vuelve al mismo navegador donde hiciste la solicitud. Selecciona **El administrador ya habilitó el cambio**, completa tu nueva contraseña y confírmala.
4. Pulsa **Guardar nueva contraseña**. La autorización se consume y se cierran las sesiones anteriores. Inicia sesión con tu nueva contraseña.

No se piden códigos ni nombre de usuario o contraseña del administrador en el formulario de recuperación. La solicitud se muestra dentro del sistema: no se envía correo. La autorización **no tiene límite de tiempo**; se mantiene hasta usarla, revocarla o modificar los datos/permisos/estado de la cuenta. El administrador puede pulsar **Revocar cambio**.

La solicitud queda vinculada al navegador mediante una cookie HttpOnly. Si borras sus cookies o cambias de navegador, el administrador debe revocar la solicitud anterior y debes solicitar una nueva. Otra persona que solo conozca tu nombre de usuario no puede utilizar tu autorización desde otro navegador.

## Cambio directo por un administrador

En **Usuarios**, pulsa **Cambiar clave** en la fila de la cuenta. Introduce y confirma una contraseña de 4 a 12 caracteres y pulsa **Guardar nueva clave**. Esta función solo está disponible para administradores, no necesita una solicitud previa y cierra las sesiones anteriores de la cuenta modificada. También permite cambiar la clave propia del administrador; en ese caso debe iniciar sesión nuevamente. No modifica el nombre de usuario, el rol ni el estado de la cuenta.

La solicitud desde **¿Olvidaste tu contraseña?** sigue disponible para quienes necesitan que se autorice su propio cambio. Ambas opciones anulan cualquier autorización anterior cuando guardan la nueva clave.

## API

| Método | Ruta | Datos |
| --- | --- | --- |
| POST | /auth/password-reset/request | username; establece la cookie del navegador solicitante |
| POST | /auth/password-reset/confirm | username, password y confirmPassword; cookie solicitante y autorización previa |
| POST | /users/:id/password-reset | Administrador: aprueba una solicitud pendiente, sin vencimiento |
| DELETE | /users/:id/password-reset | Administrador: revoca la solicitud y la autorización |
| PUT | /users/:id/password | Administrador: cambia una clave directamente con password y confirmPassword |
