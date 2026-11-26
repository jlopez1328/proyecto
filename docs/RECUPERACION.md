# Usuarios y recuperación de contraseña

## Nombre de usuario y correo

El acceso utiliza un nombre de usuario único y una contraseña. El correo electrónico es un dato de contacto que se completa al registrar o crear la cuenta; no se usa para iniciar sesión ni para recuperar acceso. El nombre completo y el nombre de usuario son campos separados.

El nombre de usuario admite 3–32 caracteres: letras, números, punto, guion o guion bajo, sin espacios ni @. Se normaliza a minúsculas. En Usuarios, el administrador puede consultar y modificar el nombre de usuario de otras cuentas; cambiarlo invalida sus sesiones anteriores.

Las cuentas anteriores reciben un nombre automáticamente al arrancar, sin modificar contraseñas ni roles. El administrador inicial usa ADMIN_USERNAME de backend/.env, por defecto admin. Para otras cuentas se deriva del nombre completo; si se repite, se añade _2, _3, etc. Las cuentas que ya tienen un nombre de usuario lo conservan.

## Recuperar contraseña sin códigos

1. En el login, selecciona **¿Olvidaste tu contraseña?**, escribe tu **nombre de usuario** y pulsa **Solicitar autorización**.
2. El administrador entra en **Usuarios**, pulsa **Actualizar solicitudes**, localiza tu cuenta y selecciona **Habilitar cambio**. La autorización dura quince minutos.
3. Abre la recuperación y elige **El administrador ya habilitó el cambio**. Introduce tu nombre de usuario.
4. El administrador completa personalmente **Usuario administrador** y **Contraseña del administrador**, utilizando su nombre de usuario y contraseña actuales.
5. Escribe tu contraseña nueva y su confirmación y pulsa **Guardar nueva contraseña**.
6. Vuelve al login e inicia sesión con tu nombre de usuario y la nueva contraseña. Las sesiones anteriores se cierran.

No se pide un token, código ni correo para autorizar la recuperación. El administrador puede **Revocar cambio** o **Renovar autorización** desde Usuarios. La habilitación permite un único cambio y vence a los quince minutos. Una habilitación no sustituye la comprobación de las credenciales administrativas.

La contraseña nueva debe tener al menos diez caracteres y ocupar como máximo 72 bytes. La contraseña del administrador se verifica con bcrypt y no se guarda en el formulario, el navegador, los registros ni la cuenta recuperada. El administrador introduce sus propios datos; no se requiere entregar su contraseña a otra persona. No se inicia sesión automáticamente después del cambio.

Para recuperar una cuenta administradora debe intervenir otro administrador. Las cuentas inactivas no pueden habilitarse. Cambiar el rol, el estado o el nombre de usuario invalida la autorización pendiente.

backend/.env conserva únicamente las credenciales iniciales de instalación: ADMIN_USERNAME y ADMIN_PASSWORD. Cambiar una contraseña desde la aplicación no escribe la nueva contraseña en ese archivo ni restablece la inicial al reiniciar.

## API

| Método | Ruta con prefijo /api | Resultado |
| --- | --- | --- |
| POST | /auth/login | username y password; el correo no es un identificador de acceso |
| POST | /auth/password-reset/request | username; responde 202 con mensaje genérico sin revelar cuentas |
| POST | /auth/password-reset/confirm | username, adminUsername, adminPassword, password y confirmPassword; exige habilitación vigente y administrador activo |
| POST | /users/:id/password-reset | Solo administrador; habilita por quince minutos y devuelve expiresAt, sin códigos |
| DELETE | /users/:id/password-reset | Solo administrador; revoca la solicitud y la habilitación |

Los esquemas están en Swagger. La autorización se consume mediante una actualización atómica: dos intentos concurrentes no pueden cambiar la contraseña dos veces. El servidor vuelve a comprobar el rol, el estado y las credenciales del administrador antes de aplicar el cambio. Los endpoints públicos tienen límites de intentos; una solicitud nueva no invalida una habilitación vigente. Un código de la versión anterior no puede usarse como alternativa.

Referencia de controles de recuperación: [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).
