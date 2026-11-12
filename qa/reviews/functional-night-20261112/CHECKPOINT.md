# Checkpoint nocturno 1

Fuentes iniciales: web dd1b41fe8cbea9dda6da24d50b95c23916cb6475; backend 9beb837a621f9a8f06601043afa64b3bba317cb5; Native17 ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a, refs verificadas antes de escribir. Sin cambios operativos ni en backend/qa-lab.

Código: comandos/versiones de propiedad y estadía distintos, estado draft sin huésped como propuesta compatible con tabla, configuración/revisión/decisión/pausa/archivo, binding por referencia, cambios de fecha/cancelación/checkout/history; validadores de contexto/relación/cardinalidad/revisión/tiempo e inventario. Todos HELD; no recibo positivo. Inventario reconoce seis estados SQL y excluye sólo edición de snapshot/revisión exactos. Faltan productores protegidos y ABI instalado.

logs/inventory-before.tap demuestra rechazo anterior de revoked; logs/lifecycle-first.tap contiene 6 PASS nuevos, no SQL ni Auth administrado. Próximo: catálogo de pre-arrival mínimo y permisos/rol operativo, luego UX 403 y respuestas tardías del script original, composición inerte y cierre integral. No repetir seis casos salvo cambios afectados. No repetir las ocho anteriores, Native17 o Chromium. Publicaciones con CAS y [skip ci], sólo dos prefijos nuevos.

## Checkpoint 2

Añadidos public-projection.mjs y permissions.mjs: proyección sin content/raw URL/campos privados y sin productor positivo, revisión independiente de versiones/retirada, roles de manager por acción y operativo por tarea, huésped por reserva; todos accessAllowed=false. Cuatro casos nuevos PASS.

compose.cjs reutiliza el generador anterior y corrige sólo el Auth generado QA: 403 informa rechazo de permiso sin afirmar expiración/revocación; clearPanelData limpia también los rótulos de cuenta/sesión. auth-before.tap conserva dos FAIL reales frente al candidato anterior; auth-first.tap contiene tres PASS nuevos. Tres regresiones existentes network/503/401 ejecutadas únicamente porque cambió ese mismo script, mediante copia idéntica de sus aserciones con el import del nuevo compositor. Ningún JWT real ni recibo positivo de backend utilizado.

Total a este punto: 13 casos únicos nuevos PASS + 3 regresiones previas PASS. Próximo: composición visible, control de respuestas por ámbito/revisión/checkout y conexión retenida a incidencias/solicitudes sin reimplementar sus gateways. No repetir las suites completadas salvo cambios afectados.

## Checkpoint 3

Secuenciador de vistas efímero derivado del patrón authGeneration: descarta respuestas por sesión/propiedad/estadía/revisión, solicitud reemplazada, logout, expiración/checkout y reloj regresivo; nunca autoriza vista privada. Conserva marcador UNKNOWN local y no reconstruye original al reinicio. No es admisión durable ni unicidad SQL. Cuatro casos (tres iniciales y uno nuevo de reloj) PASS, con fallo intermedio de reloj y fuente pre-corrección conservados.

Work-items proyecta sólo estados mínimos de solicitudes/incidencias con vínculos exactos; no summary/PII. Aprendizaje queda como propuesta, sin activación. La composición invoca el candidato HELD de incidencias existente; no copia su gateway. Se añadió sesión/revisión explícita al comando de propiedad/estadía y las siete acciones reales de manager a la matriz de flags. 14 casos propios directamente afectados por esas formas compartidas pasaron en regresión focal; no son casos únicos adicionales.

materialize.mjs genera 18 outputs nuevos sólo bajo este paquete; agrega recorrido y tablas de contratos a las páginas anteriores, elimina favicon ausente y reemplaza enlaces a documentos legales no generados por estado de publicación retenida. composition-first.tap: un caso nuevo PASS (Node HTML/JS, sin navegador), con todos los enlaces locales y anchors resueltos. Source pins actualizados a 105 blobs remotos coincidentes.

Total único: 18 PASS nuevos + tres regresiones históricas afectadas. Próximo: evidencia consolidada, contratos/matriz y manifiesto final; confirmar sintaxis/bytes sin volver a ejecutar suites aprobadas.

Corrección adicional antes de consolidar: el validador de propiedad anterior admite un surrogate Unicode aislado en nombre/dirección/unidad; esa cadena no representa texto UTF8 conservable por PostgreSQL. Baseline FAIL conservado; el sucesor rechaza Unicode mal formado sin normalización con pérdida, conserva emoji válido y tiene cuatro casos de propiedad PASS tras el cambio (tres repetidos y uno nuevo). Total único actualizado: 19 PASS nuevos; las tres regresiones históricas no cambian.
