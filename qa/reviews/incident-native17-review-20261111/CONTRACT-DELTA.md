# Delta técnico, sin activación

## Revisión protegida y revocación

El SQL anterior declara current_revisions pero devuelve cero filas. El sucesor lee una tabla authority_clock con dataset/epoch/revisión/provenance y una fuente independiente de floor. No hay seed, DEFAULT 1 ni reconstrucción desde claims. El contador avanza con UPDATE atómico desde la fila existente y falla si falta o agotó el rango interoperable JS/SQL.

Se preparan 27 hooks sobre nueve fuentes de autoridad/relación y tres hooks fence-only sobre admisión/efecto/intento. BEFORE STATEMENT toma el fence global 1129728581/1 antes de los locks de datos; el contador se modifica después del cambio. Para incidentes se comparan id/account/property/stay, sin auto-invalidar el cambio normal de status. Stays incluye su relación y status; Auth/cuentas/membresías/identidades/permisos/propiedades son conservadores ante cambios. Los hooks y el orden no están acreditados con motor nativo.

La revisión local debe coincidir **exactamente** con el cut externo actual. Una revocación confirmada puede cerrar temporalmente admisión mientras falta su observación independiente; no se usa >= para aceptar historia restaurada. El witness no se actualiza automáticamente por un COMMIT SQL. La revisión de autoridad no equivale a restrictionSequence y CBF1 no firma esa equivalencia: protected_floor sigue vacío hasta tener una fuente compatible y acreditada. NULL/futuro/vencimiento de timestamps, metadata incompleta o dataset/epoch distintos deniegan.

Un revocador externo de GoTrue/journal no participa en el lock PostgreSQL por aparecer en este documento. Falta acreditar su puente de orden y su relación con la revisión actual; las revalidaciones no prueban atomicidad entre sistemas. No se afirma revocación operacional ni A2 por el contador propuesto.

## Admisión separada del efecto

Se demostró en fuentes que reservar el intent_binding anterior haría que la primera escritura se confundiera con historia existente. admission_v2 conserva una fase propia: RESERVED → DISPATCH_CLAIMED, separada de intent_binding/attempt_binding del efecto. admit devuelve KNOWN con la historia original; no sobrescribe intento/sesión/refs ni repite el negocio. No guarda argumentos, nombres, teléfono/hash, resumen o frames.

El originalRef proviene de una fuente privada por user/intent/binding, nunca de un snapshot del caller. La función original anterior sigue denegatoria. Sin esa fuente y su política de custodia/D02-A no puede admitirse una escritura ni un readback tras reinicio. CONFLICT exige original íntegro y mismos scopes; datos contradictorios siguen UNKNOWN.

El claim no demuestra COMMIT del efecto. El caller conserva UNKNOWN ante ACK perdido y no puede hacer NEW por ausencia de memoria. La unicidad/CAS y las carreras sólo podrán observarse en PostgreSQL; el Map de una prueba no las acredita. El SQL conserva constraints y el fence, pero este lote no los ejecuta.

## Binding del proveedor y ABI

El nuevo reviewer consume privadamente el proof SDK original ligado al bearer y toma de CurrentResolution la autoridad/floors. El attestor recibe una capacidad efímera de un uso, no token, hash de bearer, argumentos o metadata editables del cliente. originalRef se obtiene de un callback privado. Cambiar bearer (incluso mismos claims), sesión, intento, expiry, revisión, dataset/epoch o inventario impide reutilizar el binding. Registrar/claimar con revocación o expiración en un await queda cerrado.

Ese attestor es sólo un doble en los tests. No hay transporte/custodia reales que conviertan una capacidad WeakMap en prueba SQL. El bridge provider_binding_v2 devuelve cero filas y el native gate continúa rechazando. No se generan claves, firmas, grants o un protocolo criptográfico nuevo. GoTrue/JWT real permanecen sin verificar.

El ABI anterior no contiene providerBindingRef y no se puede empaquetar dentro de p_floor sin romper su igualdad exacta de campos. Se prepararon entries 17/10 (antes 16/9), derivados por código de la fuente anterior fijada, con binding validado y eco de la referencia. El compilador de transporte reutiliza las sentencias/argumentos anteriores y añade sólo esa referencia; rechaza receipts falsificados, arrays con getters, cambios de payload/floor y segundo write local. No ejecuta el transporte. El reader usa una sentencia distinta y no muta.

## Permisos, contexto efectivo y captura

Ocho roles propuestos: tres LOGIN (scope/writer/readback), owners Scope/Writer/Reader/Data y Revision NOLOGIN, sin herencias/SET/membresías ni atributos amplios. Los logins reciben sólo sus entries: scope; admit/claim/writer ligado; reader ligado. Nunca manager_action, checkout/suspend o writer antiguo como fallback. RLS ENABLE+FORCE sobre metadatos; policies con contexto protegido, actualmente denegatorio.

El análisis estático resolvió dos omisiones concretas: el autorizador invoker lee seis flags de property permissions y el negocio invoker necesita SELECT de miembro/permisos bajo el owner writer. Además se corrigió un fallo del generador: atravesar SECURITY INVOKER conserva el caller efectivo, no el owner de ese helper. Se reproduce FAIL y luego PASS del cálculo transitivo para el reader. Un SECURITY DEFINER sí cambia el contexto al owner y los grants se derivan siguiendo esa cadena.

Los grants por columna cubren únicamente las proyecciones y escrituras selladas. Future columns no quedan habilitadas por un SELECT/INSERT general. Las policies de origen continúan false porque falta INDEPENDENT_PROTECTED_SCOPE; las tablas de efecto sin providerRef mantienen denegación explícita por NULL. No se reemplaza por USING(true), auth.uid() o GUC del cliente. Por ello el paquete no está listo para instalación ni demuestra mínimo privilegio efectivo.

05-catalog-capture requiere autorización separada y no se ejecutó: incluye roles, SET/INHERIT/admin memberships, owners/ACL/defaults/PUBLIC, cuerpos por hash, columnas/RLS/constraints/hooks, privilegios efectivos y dependencias. No consulta filas Auth, tokens o passwords. pg_depend no descubre todas las referencias tardías de PL/pgSQL, operators, casts o policies; debe completarse con las fuentes selladas y con captura nativa, sin truncamientos o nodos desconocidos.

Las expectativas y hashes son un contrato de revisión; no una observación de un host o login real. Fuentes y roles/grants propuestos no autorizan operación comercial. La guía de ensayo define el host/artefactos/fixture/autorización adicional que todavía faltan.
