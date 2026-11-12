# Checkpoint nocturno 1

Fuentes iniciales: web dd1b41fe8cbea9dda6da24d50b95c23916cb6475; backend 9beb837a621f9a8f06601043afa64b3bba317cb5; Native17 ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a, refs verificadas antes de escribir. Sin cambios operativos ni en backend/qa-lab.

Código: comandos/versiones de propiedad y estadía distintos, estado draft sin huésped como propuesta compatible con tabla, configuración/revisión/decisión/pausa/archivo, binding por referencia, cambios de fecha/cancelación/checkout/history; validadores de contexto/relación/cardinalidad/revisión/tiempo e inventario. Todos HELD; no recibo positivo. Inventario reconoce seis estados SQL y excluye sólo edición de snapshot/revisión exactos. Faltan productores protegidos y ABI instalado.

logs/inventory-before.tap demuestra rechazo anterior de revoked; logs/lifecycle-first.tap contiene 6 PASS nuevos, no SQL ni Auth administrado. Próximo: catálogo de pre-arrival mínimo y permisos/rol operativo, luego UX 403 y respuestas tardías del script original, composición inerte y cierre integral. No repetir seis casos salvo cambios afectados. No repetir las ocho anteriores, Native17 o Chromium. Publicaciones con CAS y [skip ci], sólo dos prefijos nuevos.

## Checkpoint 2

Añadidos public-projection.mjs y permissions.mjs: proyección sin content/raw URL/campos privados y sin productor positivo, revisión independiente de versiones/retirada, roles de manager por acción y operativo por tarea, huésped por reserva; todos accessAllowed=false. Cuatro casos nuevos PASS.

compose.cjs reutiliza el generador anterior y corrige sólo el Auth generado QA: 403 informa rechazo de permiso sin afirmar expiración/revocación; clearPanelData limpia también los rótulos de cuenta/sesión. auth-before.tap conserva dos FAIL reales frente al candidato anterior; auth-first.tap contiene tres PASS nuevos. Tres regresiones existentes network/503/401 ejecutadas únicamente porque cambió ese mismo script, mediante copia idéntica de sus aserciones con el import del nuevo compositor. Ningún JWT real ni recibo positivo de backend utilizado.

Total a este punto: 13 casos únicos nuevos PASS + 3 regresiones previas PASS. Próximo: composición visible, control de respuestas por ámbito/revisión/checkout y conexión retenida a incidencias/solicitudes sin reimplementar sus gateways. No repetir las suites completadas salvo cambios afectados.
