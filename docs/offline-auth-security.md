# Sesión y datos offline

TORO usa una cookie de sesión `httpOnly`, `SameSite=Strict` y segura en producción. No usa Supabase Auth ni guarda tokens, PINs, credenciales SMTP, service-role keys o cadenas de conexión en IndexedDB.

## Cierre de sesión

1. TORO intenta sincronizar las operaciones de la cuenta activa.
2. Si todavía hay cambios pendientes, solicita confirmación. Al confirmar, los datos se conservan localmente e **aislados por `userId`** para que la misma cuenta pueda recuperarlos al volver a iniciar sesión.
3. Si no hay cambios pendientes, el ámbito local de ese usuario se elimina de IndexedDB.
4. En ambos casos se elimina el puntero `active-user-id`; el siguiente usuario no puede leer ni sincronizar operaciones de la cuenta anterior.

## Sesión expirada o revocada

El servidor valida la cookie y su expiración en cada ruta protegida. Si deja de ser válida, el dashboard redirige a login. Los datos locales permanecen aislados, pero nunca se envían con otra sesión porque la cola filtra estrictamente por el usuario activo.
