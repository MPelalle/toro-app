# Auditoría offline-first de TORO

Fecha de auditoría: 2026-08-06.

## Alcance y conclusión ejecutiva

TORO ya cuenta con una primera implementación de PWA y de persistencia local para rutinas y sesiones de entrenamiento. No obstante, su estado actual es **offline-tolerant parcial**, no una solución offline-first completa para toda la aplicación:

- Las rutinas consultadas se guardan en IndexedDB y pueden abrirse sin conexión después de haber sido consultadas con red.
- Las sesiones de entrenamiento y sus series se escriben primero en IndexedDB y se encolan para sincronizar.
- Hábitos, dieta, perfil, autenticación y actividad no tienen repositorios locales ni cola de operaciones.
- La sincronización de sesiones se dispara al cargar el dashboard y al evento `online`; no se usa Background Sync del Service Worker.

La recomendación es consolidar una capa de repositorios offline tipada y ampliar gradualmente la estrategia a las entidades que requieren operación sin red, empezando por el entrenamiento.

## Arquitectura actual

### Framework y router

- Framework: **Next.js 16.2.12**, React 19.2.4 y TypeScript estricto.
- Router: **App Router**. Todo el enrutamiento vive bajo `app/`; no existe directorio `pages/`.
- Renderizado: combinación de Server Components para dashboard/hábitos y Client Components para dieta, rutinas y formularios interactivos.
- Estilos: Tailwind CSS 4 y CSS global en `app/globals.css`.
- Animaciones: Framer Motion para transiciones y componentes de navegación.

### Rutas de interfaz

| Área | Rutas |
| --- | --- |
| Entrada pública | `/`, `/front`, `/login`, `/sign-in` |
| Dashboard | `/dashboard`, `/dashboard/user` |
| Rutinas | `/dashboard/routine`, `/dashboard/routine/new`, `/dashboard/routine/[id]`, `/dashboard/routine/[id]/edit` |
| Hábitos | `/dashboard/habits`, `/dashboard/habits/new`, `/dashboard/habits/[id]`, `/dashboard/habits/[id]/edit` |
| Dieta | `/dashboard/diet`, `/dashboard/diet/new`, `/dashboard/diet/[id]`, `/dashboard/diet/[id]/edit` |

### Backend y Supabase

La aplicación **no usa `@supabase/supabase-js`, Supabase Auth ni consultas directas desde el cliente**. Supabase se utiliza como proveedor de PostgreSQL remoto:

- `lib/prisma.ts` crea `PrismaClient` con `@prisma/adapter-pg` y `pg`.
- `DATABASE_URL` se usa en ejecución; `DIRECT_URL` se usa para migraciones desde `prisma.config.ts`.
- La base de datos configurada se aloja en Supabase, pero Prisma es la única capa de acceso de datos del código.
- Las claves SMTP y URLs de conexión se consumen exclusivamente en servidor mediante variables de entorno. No se exponen secretos al cliente.

## Autenticación

La autenticación es propia y no depende de Supabase Auth.

1. `POST /api/auth/register` crea o actualiza `User`, guarda un hash `scrypt` de PIN de seis dígitos y crea un `AuthToken` de verificación.
2. `lib/mail.ts` envía el enlace de verificación por SMTP.
3. `GET /api/auth/verify` marca el correo como verificado, consume el token y crea sesión.
4. `POST /api/auth/login` verifica email/PIN, incrementa `loginCount` y crea una sesión.
5. La cookie `toro_session` es `httpOnly`, `SameSite=Strict`, segura en producción y dura siete días.
6. `getCurrentUser()` busca el hash de la cookie en la tabla `sessions`; el layout de dashboard redirige a `/login` si no existe una sesión válida.

Los endpoints de login/registro aplican un límite de intentos en memoria por instancia y los endpoints mutables validan el origen. La sesión depende de una petición al servidor para validarse, por lo que el inicio de sesión y la verificación de correo no pueden completarse offline.

## Modelo de datos y flujo actual

### Usuarios

Entidad `User` en `prisma/schema.prisma`:

- Identidad, email, username, PIN hasheado, avatar y métricas de uso.
- Relaciones con hábitos, planes de dieta, rutinas, sesiones de entrenamiento, tokens y sesiones.
- Perfil: Server Actions en `app/dashboard/user/actions.ts` actualizan perfil, cierran sesión o eliminan la cuenta.
- Actividad: `ActivityTracker` llama cada minuto a `POST /api/user/activity` mientras la pestaña está visible.

No existe copia local del perfil ni cola de cambios de perfil.

### Rutinas, días y ejercicios

Entidades remotas:

- `RoutinePlan`: nombre, tipo, días como JSON, estado activo y timestamps.
- `RoutineExercise`: ejercicio de plantilla, día de entrenamiento, series objetivo, repeticiones, peso, técnica y campos de resultado heredados.

Flujo online:

1. `POST /api/routines` crea una rutina y sus ejercicios; desactiva la rutina activa anterior.
2. `GET /api/routines` y `GET /api/routines/[id]` devuelven el plan del usuario autenticado.
3. `PATCH /api/routines/[id]` activa una rutina, edita sus metadatos o actualiza el resultado heredado de un ejercicio.
4. `DELETE /api/routines/[id]` elimina el plan del usuario.

Flujo local actual:

- `lib/offline.ts` guarda respuestas de rutinas en el object store `routines` de IndexedDB.
- `getRoutinesOfflineFirst()` y `getRoutineOfflineFirst()` en `lib/routines.ts` intentan red y, si falla, devuelven la caché local.
- La lista y el detalle de rutinas consumen esos helpers.
- La creación, edición, activación y eliminación de rutinas siguen requiriendo red; no se encolan.

### Sesiones, series, pesos y repeticiones

Entidades remotas:

- `WorkoutSession`: UUID generado en cliente, usuario, rutina, estado `IN_PROGRESS`/`FINISHED`, fechas y `clientUpdatedAt`.
- `WorkoutSessionExercise`: instantánea del ejercicio de rutina dentro de una sesión.
- `WorkoutSet`: serie objetivo y ejecutada: repeticiones, peso y estado completado.

Flujo actual de entrenamiento:

1. En el detalle de rutina, `createWorkoutSession()` construye la sesión y todas las series objetivo con UUIDs del cliente.
2. La sesión se guarda inmediatamente en IndexedDB (`workout-sessions`).
3. Cada cambio de repeticiones, peso o finalización actualiza la instantánea local y añade/retiene una sola operación de sincronización para la sesión.
4. `syncPendingSessions()` envía la sesión completa a `POST /api/workout-sessions/sync` cuando hay red.
5. El servidor valida pertenencia de rutina, aplica la versión más reciente por `clientUpdatedAt`, y crea o reemplaza los hijos de la sesión en una transacción.

La cola se guarda en IndexedDB en `sync-queue`. El identificador estable de sesión evita que un reintento cree otra sesión. El `operationId` se valida, pero no se persiste en servidor; la idempotencia efectiva se apoya en el ID de sesión y su fecha de actualización.

### Descansos, tiempos, emociones y valoración

- El encabezado posee un cronómetro visual local en `app/front/components/Header.tsx`.
- No hay modelos, campos, endpoints ni persistencia para descansos por serie, duración de sesión, emociones, RPE/RIR, valoración final o notas de sesión.
- Los campos `note` de `RoutineExercise` y el comentario de hábito no son una valoración estructurada de sesión.

Por lo tanto, estos datos no se pueden consultar, registrar ni sincronizar actualmente, ni online ni offline.

### Hábitos

Entidades:

- `Habit`: configuración, duración, importancia, estado y notas.
- `HabitCheckIn`: un check-in por hábito y fecha, comentario y estado completado.

Flujo:

- `lib/habits.ts` consulta Prisma en servidor usando el usuario de la cookie.
- Las páginas de hábitos son Server Components dinámicos.
- `app/dashboard/habits/actions.ts` contiene Server Actions para crear, editar, borrar, completar y comentar.

No hay caché IndexedDB, cola offline ni endpoints REST de hábitos. En ausencia de red, las rutas dinámicas y las Server Actions no funcionan.

### Dieta

Entidades:

- `DietPlan`, `DietMeal`, `DietWeightEntry` y `DietDailyLog`.

Flujo:

- Client Components consumen `/api/diets`, `/api/diets/[id]`, `/api/diets/[id]/log` y `/api/diets/[id]/weight` mediante `dietRequest`.
- Los planes, comidas, logs diarios y pesos se persisten en PostgreSQL por Route Handlers.
- `lib/diet.ts` conserva helpers heredados `getDiets`/`saveDiets` basados en `localStorage`; las pantallas actuales usan la API, pero esos helpers siguen presentes y no deben ser reutilizados.

No hay disponibilidad offline intencional para dieta. Crear planes, marcar comidas, anotar pesos o editar planes sin red no está soportado.

## Componentes que dependen directamente de consultas remotas

| Archivo | Dependencia remota | Estado offline actual |
| --- | --- | --- |
| `app/dashboard/layout.tsx` | `getCurrentUser()` | No puede validar sesión nueva sin red. |
| `app/dashboard/page.tsx` | `getCurrentUser()`, `getHabits()` | No tiene fallback de hábitos. |
| `app/dashboard/dashboard-overview.tsx` | `/api/diets`, rutinas | Rutinas con fallback; dieta sin fallback. |
| `app/dashboard/routine/page.tsx` | `/api/routines` | Fallback de lectura de rutinas. |
| `app/dashboard/routine/[id]/page.tsx` | rutina y sync de sesión | Lectura/sesión offline parcial. |
| `app/dashboard/routine/new/page.tsx` | `POST /api/routines` | Solo online. |
| `app/dashboard/routine/[id]/edit/page.tsx` | `GET/PATCH/DELETE /api/routines/[id]` | Solo online. |
| `app/dashboard/habits/**` | Prisma y Server Actions | Solo online. |
| `app/dashboard/diet/**` | Route Handlers de dieta | Solo online. |
| `app/dashboard/user/**` | Server Actions y API de actividad | Solo online. |

## Server Actions, Route Handlers y APIs

### Server Actions

- `app/dashboard/habits/actions.ts`: CRUD de hábitos, check-ins y comentarios.
- `app/dashboard/user/actions.ts`: editar perfil, logout y eliminación de cuenta.

### Route Handlers

- Autenticación: `/api/auth/register`, `/api/auth/login`, `/api/auth/verify`, `/api/auth/logout`.
- Rutinas: `/api/routines`, `/api/routines/[id]`.
- Sesiones offline: `/api/workout-sessions/sync`.
- Dieta: `/api/diets`, `/api/diets/[id]`, `/api/diets/[id]/log`, `/api/diets/[id]/weight`.
- Actividad: `/api/user/activity`.

No existe una función de Supabase invocada desde cliente ni Route Handler que consuma Supabase REST/Auth.

## PWA y persistencia local actuales

### PWA

- `app/pwa-register.tsx` registra `public/sw.js`.
- `public/manifest.webmanifest` configura instalación standalone, idioma, colores e icono.
- `public/sw.js` usa cache de shell y estrategia cache-first para recursos GET; excluye `/api/*` para evitar cachear respuestas mutables/autenticadas.
- Las navegaciones vistas online se guardan en Cache Storage y se sirven desde caché ante fallo de red.

### IndexedDB

`lib/offline.ts` usa la base `toro-offline` con tres object stores:

| Store | Contenido | Finalidad |
| --- | --- | --- |
| `routines` | Rutinas serializadas | Lectura offline de planes. |
| `workout-sessions` | Sesiones y series completas | Fuente local de verdad durante entrenamiento. |
| `sync-queue` | Operaciones pendientes por sesión | Reintentos de sincronización. |

No se usa `localStorage` para rutinas, entrenamientos, series u operaciones pendientes. El único uso remanente de `localStorage` está en helpers heredados de dieta y no participa en el flujo actual de entrenamiento.

## Entidades que requieren disponibilidad offline

### Obligatorio para el objetivo de gimnasio

1. Rutina activa y ejercicios programados.
2. Sesión en curso y finalizada pendiente de sincronización.
3. Series, pesos, repeticiones, completitud y notas de la sesión.
4. Operaciones pendientes, errores de sincronización y metadatos de reintento.
5. Estado de conectividad y estado de sincronización visible.

### Recomendado en fases posteriores

1. Hábitos y check-ins del día.
2. Plan de dieta activo, comidas del día, peso y registro diario.
3. Perfil mínimo de solo lectura para encabezados y personalización.

### No recomendado para disponibilidad offline completa

1. Alta de cuenta, login, verificación de email y recuperación de acceso: requieren red, cookie segura, servidor y SMTP.
2. Eliminación de cuenta y cambios sensibles de perfil: requieren confirmación/validación remota.
3. Datos nunca descargados: no pueden mostrarse offline sin una sincronización previa.

## Riesgos al introducir persistencia local y sincronización

### Riesgos existentes

1. **Aislamiento de cuentas en un mismo dispositivo.** Los stores actuales no se particionan por `userId`; si se alternan usuarios en el mismo navegador, una operación pendiente antigua puede intentar sincronizarse bajo otra sesión.
2. **Conflictos por reloj de cliente.** La resolución actual usa `clientUpdatedAt`; un reloj incorrecto puede ganar o perder frente a otra edición válida.
3. **Reintentos sin Background Sync.** Si la app se cierra antes de recuperar red, la cola se reintenta al reabrir dashboard, no necesariamente en segundo plano.
4. **Fallos permanentes.** Si una rutina se elimina remotamente, una sesión pendiente recibirá 404 y la operación queda en cola sin estado de error accionable para la persona usuaria.
5. **Cache de navegación autenticada.** El Service Worker puede conservar HTML de rutas autenticadas. En dispositivos compartidos debe invalidarse al logout/cambio de usuario.
6. **Caché obsoleta de rutinas.** No hay marca de versión/ETag ni tombstones para detectar eliminaciones remotas mientras el dispositivo estuvo offline.
7. **Transacciones de sesión completas.** El servidor reemplaza hijos de una sesión al aceptar una versión más nueva. Es idempotente, pero una edición simultánea en dos dispositivos se resuelve como última versión ganadora, no como fusión por serie.
8. **Cuota y disponibilidad de IndexedDB.** No se informa al usuario ni se gestiona explícitamente `QuotaExceededError`, modo privado o navegadores sin IndexedDB.
9. **Modelo de datos incompleto.** No hay persistencia de descanso, duración de serie, emoción, RPE/RIR ni valoración final.

### Riesgos de seguridad

- IndexedDB y Cache Storage son legibles por scripts del mismo origen; se deben almacenar únicamente datos necesarios y limpiar al cerrar sesión.
- Nunca se deben almacenar cookies de sesión, PINs, tokens de verificación, `DATABASE_URL`, `DIRECT_URL` ni credenciales SMTP.
- Las operaciones en cola deben llevar un `ownerId` no secreto y validarse contra el usuario autenticado antes de enviarse.
- Los datos remotos deben seguir validando propiedad por `userId`; la persistencia local no es una fuente de autorización.

## Estrategia offline recomendada

1. Mantener IndexedDB como fuente local de verdad para entidades offline-first.
2. Usar repositorios por entidad, no llamadas `fetch` directas desde componentes:
   - `RoutineRepository`: lectura cache-first con actualización en segundo plano.
   - `WorkoutSessionRepository`: escritura local atómica y cola transaccional.
   - En fases posteriores, `HabitRepository` y `DietRepository`.
3. Particionar cada registro y operación por `ownerId` y borrar el ámbito del usuario al cerrar sesión.
4. Añadir metadatos uniformes: `id`, `ownerId`, `createdAt`, `updatedAt`, `version`/`serverUpdatedAt`, `syncState` y `lastSyncError`.
5. Usar Service Worker para shell y recursos estáticos; mantener los datos de API en IndexedDB, no en Cache Storage.
6. Registrar eventos `online`, `visibilitychange`, apertura de app y, cuando esté disponible, Background Sync para disparar sincronización.

## Estrategia de sincronización recomendada

### Operaciones

- Encolar operaciones inmutables con `operationId` UUID, `entityId`, `ownerId`, tipo, payload, contador de reintentos y fecha.
- Persistir un ledger de operaciones procesadas en servidor o usar claves de idempotencia únicas, no solo el UUID de entidad.
- Enviar operaciones en orden por entidad; permitir paralelismo únicamente entre entidades independientes.
- Borrar una operación local solo después de una respuesta remota confirmada.
- Diferenciar error transitorio (red/5xx), error de autenticación, error de validación y conflicto.

### Sesiones de entrenamiento

- Mantener UUID estables para sesión, ejercicio de sesión y serie.
- Aplicar cambios por serie cuando sea posible, en lugar de reemplazar toda la sesión, para reducir conflictos.
- Conservar una instantánea completa para recuperación local, pero sincronizar deltas con una versión esperada.
- Al finalizar, marcar localmente `FINISHED` y permitir edición posterior según política explícita.

## Resolución de conflictos recomendada

| Entidad | Política propuesta |
| --- | --- |
| Rutina/ejercicios de plantilla | Versionado de rutina; si hay edición concurrente, pedir decisión o duplicar borrador local. |
| Sesión activa | Fusión por serie usando ID estable y `updatedAt` por serie. |
| Peso/repeticiones de una serie | Última escritura por serie, con marca de conflicto si proviene de otro dispositivo. |
| Finalización de sesión | Estado final gana salvo reapertura explícita y auditada. |
| Hábitos diarios | Upsert por `(habitId, fecha)`; comentario con versión por registro. |
| Dieta diaria | Upsert por `(dietId, fecha)` con versión; combinar comidas por ID cuando sea posible. |
| Perfil | Última escritura con `serverUpdatedAt`; para avatar, conservar remoto ante conflicto. |

La política actual de última escritura por `clientUpdatedAt` es aceptable como transición inicial, pero no debe ser la resolución final para datos editados desde varios dispositivos.

## Archivos que deben modificarse en una implementación completa

### Existentes

- `prisma/schema.prisma`: añadir versión/owner/ledger de sincronización y campos faltantes de sesión.
- `app/api/workout-sessions/sync/route.ts`: separar operaciones, persistir idempotencia y manejar conflictos tipados.
- `lib/offline.ts`: dividir en repositorios, particionar por usuario, añadir migraciones IndexedDB, cuota y errores persistentes.
- `lib/routines.ts`: eliminar fallback silencioso y delegar en repositorio tipado.
- `app/dashboard/routine/[id]/page.tsx`: estados de cola, error recuperable, descanso, valoración y reintento manual.
- `app/dashboard/offline-sync-indicator.tsx`: mostrar fallos persistentes y acciones de reintento/descartar.
- `app/dashboard/habits/**` y `app/dashboard/diet/**`: reemplazar dependencia directa de red por repositorios cuando entren en alcance offline.
- `app/pwa-register.tsx` y `public/sw.js`: añadir actualización controlada, limpieza por logout y Background Sync progresivo.
- `app/dashboard/user/actions.ts` y `app/api/auth/logout/route.ts`: notificar al cliente para limpiar ámbitos IndexedDB/Cache Storage del usuario.

### Nuevos propuestos

- `lib/offline/db.ts`: apertura, migraciones y transacciones IndexedDB.
- `lib/offline/types.ts`: contratos de entidades, operaciones y errores de sync.
- `lib/offline/repositories/routines.ts`.
- `lib/offline/repositories/workout-sessions.ts`.
- `lib/offline/repositories/habits.ts`.
- `lib/offline/repositories/diets.ts`.
- `lib/offline/sync-engine.ts`: planificador, reintentos exponenciales y clasificación de errores.
- `lib/offline/conflicts.ts`: detectores y resolutores por entidad.
- `app/api/sync/operations/route.ts`: endpoint idempotente unificado o endpoints por agregado con ledger.
- `app/api/offline/bootstrap/route.ts`: bootstrap autenticado, versionado y ámbito de usuario.
- `app/dashboard/offline-sync-panel.tsx`: detalle de operaciones pendientes y fallidas.

## Plan de implementación por fases

### Fase 1 — Auditoría

- Inventariar rutas, modelos, mutaciones, dependencias remotas y datos offline. **Completada mediante este documento.**

### Fase 2 — Fundaciones de datos

- Definir contratos compartidos y esquema IndexedDB versionado.
- Añadir `ownerId`, versionado y ledger de idempotencia remota.
- Establecer limpieza local por logout/cambio de cuenta.

### Fase 3 — Entrenamiento offline-first

- Consolidar rutina, sesión y series en repositorios locales.
- Sincronizar operaciones por serie con reintentos y conflictos tipados.
- Añadir descanso, duración, RPE/RIR, emoción, valoración y notas de sesión.
- Pruebas de corte de red, reintentos, cierre/reapertura y doble dispositivo.

### Fase 4 — PWA robusta

- Endurecer Service Worker: versionado, actualización, limpieza de caché autenticada y Background Sync cuando el navegador lo soporte.
- Validar instalación, arranque offline y actualización de app en Android/iOS/desktop.

### Fase 5 — Hábitos y dieta

- Agregar repositorios y colas para check-ins, comentarios, comidas, registros diarios y pesos.
- Resolver conflictos por fecha e ID de elemento.

### Fase 6 — Observabilidad y calidad

- Panel de sincronización, telemetría sin datos sensibles, pruebas unitarias de IndexedDB y tests de integración de reintentos.
- Matriz manual de pruebas offline/online, logout/login, cuota, reloj desfasado y conflictos multi-dispositivo.

## Criterios de aceptación para la siguiente fase

1. Abrir una rutina previamente sincronizada sin red.
2. Iniciar entrenamiento, editar varias series y finalizarlo sin red.
3. Cerrar y reabrir la PWA sin perder la sesión local.
4. Recuperar red y sincronizar una única vez sin duplicar sesión, ejercicios ni series.
5. Informar claramente si una operación no puede sincronizarse.
6. No mezclar datos ni operaciones entre cuentas distintas en el mismo dispositivo.
7. No almacenar secretos, tokens de sesión ni PINs en IndexedDB o Cache Storage.
