# Fotos de perfil en Supabase Storage

La aplicación conserva los valores históricos de `avatarUrl`. Las fotos nuevas se suben desde el navegador ya recortadas a 512 × 512 y comprimidas como JPEG, normalmente dentro del objetivo de 100–500 KB.

## Configuración requerida

Crear un bucket público llamado `profile-photos` en Supabase Storage (o definir otro nombre mediante `SUPABASE_STORAGE_BUCKET`). Luego configurar solamente en el entorno del servidor:

```env
SUPABASE_URL=https://<proyecto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<clave-solo-servidor>
SUPABASE_STORAGE_BUCKET=profile-photos
```

La clave de servicio no se envía al navegador. El endpoint autenticado de TORO la usa para subir el JPEG procesado. El bucket debe ser público porque las fotos se muestran en Comunidad; no se guardan correos ni información privada en su ruta.

Las fotos usan una ruta nueva por carga (`<user-id>/<uuid>.jpg`) para evitar que una CDN muestre una versión vieja. No eliminar los archivos anteriores del bucket mientras existan URLs históricas en la base de datos.
