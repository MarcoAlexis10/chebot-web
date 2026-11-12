# Bootstrap de primera propiedad — checkpoint recuperable

Base web f1a073a9ca951025c951139d61d695b841cdc98e; backend 9beb837a621f9a8f06601043afa64b3bba317cb5; QA-lab ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a. HEADs verificados antes de escribir. Sin cambios concurrentes observados. Recuperación obligatoria completada; ASUS-PREFLIGHT sin cambios/no ejecutado.

Nuevo bootstrap-facts-DO-NOT-APPLY.sql implementa una proyección de hechos sobre identity→member→account, cardinalidad única y contadores de propiedades/slot/owner. No depende de propiedad activa, manage_stays, launch o trial iniciado. Aborto exterior y guard incondicional interior; sin grants, roles o ejecución SQL. No es autoridad: los productores Auth/fundador/jurisdicción/revisiones/floors/RLS siguen ausentes.

bootstrap.mjs reutiliza parser y binding del candidato anterior, valida facts previos a propiedad y liga request/intent/attempt/originalRef/key con admisión sintética separada. Ningún dato extra se descarta para entrar en los once argumentos del writer; se exige sidecar de admisión aún inexistente. Puertos operativos HELD.

Dos casos nuevos PASS. Se conserva el primer FAIL: un matcher estático incluyó un comentario y la revisión de referencia no comprobaba una admisión independiente. Se corrigieron comentario/metadata, se reejecutaron esos dos casos afectados y aprobaron. No se repitieron las seis/diez/veinte suites previas. Próximo: adaptador exacto del ABI read/2 existente, custodia y tratamiento de respuestas tardías.

## Binding read/2 y vista

Primer checkpoint f6a8ae209b6eee5461ebb1972ce14d4a60663423. Se concretó el adaptador de revisión de los 26 parámetros existentes, sin un ABI alternativo: cuatro bytea de 32 bytes, revisiones suplementarias obligatorias y cuenta derivada por original (no hay p_account). No se emiten valores privados/statement. Nuevo scope de custodia reconoce que CBF1 sólo admite create_stay y el verificador de invitación es select false; no son un original de propiedad.

Se agregó una barrera de generación/secuencia local para la nueva revisión QA y dos overlays inertes sobre los generadores previos. Se detectó y corrigió un defecto propio: una respuesta anterior dentro del mismo scope podía pisar un estado más nuevo; FAIL/PASS conservados, sólo dos casos afectados repetidos. Composición nueva PASS. Total único acumulado: ocho casos nuevos PASS (no ocho integraciones reales). Ninguna suite previa reejecutada. Próximo: delta Native17 autorizable, inventario, hashes y cierre.

## Tipos SQL y preparación nativa

Segundo checkpoint 03f5b43f1fafe38e058f150428be26ed028706b3. Noveno caso nuevo detectó la incompatibilidad bigint textual en los contadores de la proyección candidata. Se corrigió con conversión decimal canónica acotada/segura y se conservaron FAIL/PASS; pg no está materializado y no se ejecutó un driver o SQL. NATIVE-DELTA prepara cuatro aserciones propias de primera propiedad, todas NOT_AUTHORIZED/NOT_RUN, sin reemplazar N01–N12 o crear runner/instalador. Matriz de original/custodia explica por qué los contratos inspeccionados no permiten eliminar aún la copia privada.

Verificación de bytes/sintaxis PASS; hashes de sources/ASUS heredados preservados. Total único 9 nuevos PASS. Próximo: cierre final con fuentes, límites, próximo productor protegido y preparación de laboratorio, sin comandos ASUS nuevos.
