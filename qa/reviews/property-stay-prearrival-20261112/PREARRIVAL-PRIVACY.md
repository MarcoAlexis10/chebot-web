# Pre-arrival, privacidad y límite de acceso

El loader existente `backend/index.js:loadConciergeGuestContext` exige la ventana privada. **No se cambia ni se usa como loader pre-arrival.** Los guards de `concierge-beta-clock-runtime-guard.js` conservan max(check-in,access_from) <= now < min(access_until,checkout), relaciones actuales y restricciones independientes. Estas son fuentes fijadas, no pruebas de Auth/SQL reales.

El contrato de presentación vendorizado ya separa texto de guía pública y secretos. El nuevo `prearrival.mjs` admite sólo `public_guide`, texto global fijo: “Prepará tu llegada con la guía pública de CABA.” No admite texto libre, HTML, dirección, unidad, teléfono, nombre, enlaces, instrucciones de acceso, Wi-Fi, códigos, frames o payloads extra. No publica endpoint ni conecta ningún loader. Es un preview QA, no un servicio al huésped.

| Momento | Revisión offline | Acceso operativo |
|---|---|---|
| Antes de check-in | Vector estricto: user/session/account/property/stay/stayMember/invitation exactos; generación de identidad y revisión de reserva coincidentes; no revocado, vigencia y tiempos coherentes | HELD: falta Auth y productor protegido de binding/fuente aprobada; el vector no acredita autoridad |
| Durante la estadía | Devuelve PRIVATE_WINDOW_PORT_HELD; nunca materializa secretos | Exige puerto privado, autoridad/restricciones vigentes y ventana privada. No habilitado aquí |
| Checkout o revocación | Preview de reserva permanece cerrado y no devuelve identificadores | Revocación real/journal/secrets/SQL pendientes; no prometer que estos tests ejecutaron revocación |
| Che Vení Free | Función explícita e independiente, sólo título público global, sin recibir contexto de reserva | No recupera permisos, no reusa datos de la reserva ni funciona como fallback privado |

Los vectores negativos cambian cada uno de siete identificadores, revisiones, expiración, revocación, fuente y campos privados. Getters inesperados se rechazan sin leerlos. Una respuesta de review conserva fixtureOnly=true, held=true, guestAccessEnabled=false, codesAllowed=false, sourceApprovalAccredited=false, actualAuthVerified=false y operationalApproval=false. No constituye recibo positivo de autorización.

Falta para bienvenida específica: productor de catálogo que separe físicamente proyección pública y privada, aprobación/versión confiables con revisión y revocación, vínculo protegido y vigente con reserva/propiedad/cuenta/huésped, read-only de mínimo privilegio y política temporal. No basta etiquetar approved=true en el cliente. No se propone persistir esa bienvenida ni inventar consentimiento o plazo legal.

Los formularios materializados están en blanco, inert y disabled, sin lectura de inputs por el nuevo script; connect-src/form-action none. No hay storage, analytics, logs de tokens/payloads privados o persistencia durable nueva. Las fixtures son explícitamente ficticias. Datos privados originales en CBF1 nunca se copian a la plantilla pública.

D02-A operativa y custodia del original siguen pendientes; no se añaden nombres, teléfonos, hashes personales o frames a almacenamiento para facilitar conciliación. A2 conserva inventario PostgreSQL/Auth-GoTrue/Vault/Storage/claves/configuración/revocaciones/journal/witness/floors vigentes posteriores al backup; no restore ni salida de cuarentena acreditados. No se inventan plazos de retención.
