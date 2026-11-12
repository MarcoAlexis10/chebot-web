# Checkpoint: composición de autoridad retenida

Base web 427ec580c8562a4bd1591f392b2ec17e001f1c1f; backend 9beb837a621f9a8f06601043afa64b3bba317cb5; QA-lab ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a. HEADs remotos consultados antes de escribir, sin avances posteriores.

Se recuperaron CLOSURE/NEXT/PROPERTY-CAPTURE/READER-ABI/PRIVACY/TEST-EVIDENCE/GO-NO-GO. No se repitieron sus diez casos. Se inspeccionaron las fuentes protegidas originales por blob.

La composición de fuente demuestra un ciclo inválido: scope_v2 exige propiedad activa y manage_stays; manager_scope pasa por launch, que requiere propiedad activa y trial iniciado. No es authority para crear el primer borrador NULL. auth_live/fence sólo admiten pares service_* distintos de los de la captura y read/2. El productor property_create sigue WHERE false. No se amplían pares o grants.

authority-source.mjs reutiliza la frontera protegida anterior y fija estas incompatibilidades. Los extractos .source.txt son texto para revisión, no SQL ejecutable. Próximo: reader post-captura con permiso de lectura independiente del requisito cupo libre de creación; original/custodia; preflight ASUS manual.

## Reader y minimización

Primer checkpoint publicado: 94903faa2c2c95e8853d1147e3d0a8a643944998. Cinco casos únicos nuevos aprobados hasta este checkpoint (1 fuente, 2 reader, 1 custodia, 1 composición). Sólo se reejecutaron los dos reader propios afectados por añadir floors; no los diez anteriores. Se conserva un fallo inicial de fixture incompleto y luego el FAIL específico que mostró consistencia sin floor; corrección reutilizando reviewRevisionCut y dos PASS. Ningún fallo produjo permiso o efecto; toda salida operacional siguió UNKNOWN/HELD.

read/2 ahora distingue permiso de consulta post-captura, slot ocupado, identidad de la lectura actual y sesión/revisión histórica. Referencia opaca y key no reemplazan el original. Matriz D02-A concreta sin plazo nuevo, almacenamiento o clave. Próximo: procedimiento ASUS manual y verificación estática del paquete.

## Preflight ASUS preparado

Segundo checkpoint: 6d74363081df8d71c2e3b823157bb8b273edcee5. ASUS-MANUAL-PLAN.json y ASUS-PREFLIGHT.md preparan 25 consultas manuales condicionales, ninguna ejecutada. Un sexto caso único valida estáticamente catálogo/gates/ausencia de instalación o arranque. No valida Windows, WSL, Docker, PostgreSQL o aislamiento de ASUS. Consulta documental oficial de Microsoft/Docker; no se accedió al equipo ni se sondeó el runtime Work como reemplazo. Próximo: hashes del paquete, evidencia y cierre final.
