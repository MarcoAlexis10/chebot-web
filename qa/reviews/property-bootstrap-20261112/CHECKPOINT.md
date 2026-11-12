# Bootstrap de primera propiedad — checkpoint recuperable

Base web f1a073a9ca951025c951139d61d695b841cdc98e; backend 9beb837a621f9a8f06601043afa64b3bba317cb5; QA-lab ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a. HEADs verificados antes de escribir. Sin cambios concurrentes observados. Recuperación obligatoria completada; ASUS-PREFLIGHT sin cambios/no ejecutado.

Nuevo bootstrap-facts-DO-NOT-APPLY.sql implementa una proyección de hechos sobre identity→member→account, cardinalidad única y contadores de propiedades/slot/owner. No depende de propiedad activa, manage_stays, launch o trial iniciado. Aborto exterior y guard incondicional interior; sin grants, roles o ejecución SQL. No es autoridad: los productores Auth/fundador/jurisdicción/revisiones/floors/RLS siguen ausentes.

bootstrap.mjs reutiliza parser y binding del candidato anterior, valida facts previos a propiedad y liga request/intent/attempt/originalRef/key con admisión sintética separada. Ningún dato extra se descarta para entrar en los once argumentos del writer; se exige sidecar de admisión aún inexistente. Puertos operativos HELD.

Dos casos nuevos PASS. Se conserva el primer FAIL: un matcher estático incluyó un comentario y la revisión de referencia no comprobaba una admisión independiente. Se corrigieron comentario/metadata, se reejecutaron esos dos casos afectados y aprobaron. No se repitieron las seis/diez/veinte suites previas. Próximo: adaptador exacto del ABI read/2 existente, custodia y tratamiento de respuestas tardías.
