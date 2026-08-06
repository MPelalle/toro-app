# Resolución de conflictos offline

## Sesiones y series de entrenamiento

TORO trata una sesión como un agregado: sesión, ejercicios y series comparten un UUID estable generado en el cliente. Las series también tienen UUIDs propios. Una edición local nunca reemplaza directamente una versión remota más nueva.

1. Al guardar offline, IndexedDB incrementa la `version` local y actualiza `updatedAt`/`clientUpdatedAt`.
2. El servidor acepta una sincronización sólo si su `clientUpdatedAt` y `version` no son más nuevos que los recibidos.
3. Si el servidor ya tiene una versión más nueva, responde `409 Conflict` con su versión y fecha. La cola se detiene para esa operación, la sesión pasa a `conflict` y se guarda una instantánea local completa en el store `conflicts`.
4. La instantánea conserva series, pesos, repeticiones, RIR/RPE, notas, duración y valoración; no se descarta información local de forma silenciosa.

## Reglas automáticas

- Reintentos idénticos con mismo UUID, versión y fecha son idempotentes.
- Para datos sin cambios pendientes, la descarga inicial usa la versión remota más reciente.
- Las entradas locales `pending`, `syncing`, `failed` o `conflict` nunca son sobrescritas durante bootstrap.
- Last-write-wins sólo se usa para registros ya sincronizados y sin edición local pendiente.

## Resolución explícita

Una sesión en `conflict` no se reintenta automáticamente. La operación queda conservada junto con su copia de seguridad local hasta que una interfaz de resolución permita elegir mantener la copia local, conservar la remota o duplicar el entrenamiento. Así se prioriza no perder series registradas durante el entrenamiento.
