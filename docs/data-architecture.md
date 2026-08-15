# Arquitectura de datos social y de ejercicios

TORO no tiene una tabla `Exercise` separada: el catálogo versionado en `lib/exercise-catalog.ts` es la fuente de ejercicios administrados. Para evitar duplicar esa entidad, `RoutineExercise` y `WorkoutSessionExercise` guardan opcionalmente `catalogExerciseId`; las rutinas antiguas y ejercicios manuales siguen usando el nombre como fallback.

Las relaciones sociales existentes cubren el dominio sin modelos duplicados:

- `CommunityStatus`: mensajes breves, con índice `userId + createdAt`.
- `SocialRepost`: apunta siempre al contenido original; su clave única evita un repost duplicado por usuario.
- `SocialNotification`: notificaciones extensibles, única por receptor/actor/tipo/objetivo e indexada para la bandeja.
- `RoutinePlan`: publicación (`isPublished`), importación (`importedFromRoutineId`) y clave única por usuario/origen para evitar dos copias de la misma rutina.
- `RoutineMember`: acceso explícito a rutinas compartidas, con clave primaria compuesta y cascada al eliminar rutina o usuario.

Las rutinas, sus ejercicios y las sesiones usan cascada desde su propietario o rutina. Las referencias históricas de importación no usan una clave foránea deliberadamente: preservan la procedencia aunque la rutina pública original ya no exista.
