# Checkpoint: composición de autoridad retenida

Base web 427ec580c8562a4bd1591f392b2ec17e001f1c1f; backend 9beb837a621f9a8f06601043afa64b3bba317cb5; QA-lab ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a. HEADs remotos consultados antes de escribir, sin avances posteriores.

Se recuperaron CLOSURE/NEXT/PROPERTY-CAPTURE/READER-ABI/PRIVACY/TEST-EVIDENCE/GO-NO-GO. No se repitieron sus diez casos. Se inspeccionaron las fuentes protegidas originales por blob.

La composición de fuente demuestra un ciclo inválido: scope_v2 exige propiedad activa y manage_stays; manager_scope pasa por launch, que requiere propiedad activa y trial iniciado. No es authority para crear el primer borrador NULL. auth_live/fence sólo admiten pares service_* distintos de los de la captura y read/2. El productor property_create sigue WHERE false. No se amplían pares o grants.

authority-source.mjs reutiliza la frontera protegida anterior y fija estas incompatibilidades. Los extractos .source.txt son texto para revisión, no SQL ejecutable. Próximo: reader post-captura con permiso de lectura independiente del requisito cupo libre de creación; original/custodia; preflight ASUS manual.
