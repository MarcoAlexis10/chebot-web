# Original exacto: delta técnico, sin persistencia nueva

El codec CBF1 fijado sólo admite concierge_manager_create_stay y su intent contiene propiedad no NULL y campos de huésped/estadía. No admite propiedad bootstrap ni privateAddress. No se rellena con huésped ficticio ni se reinterpreta una captura como create_stay. El verificador verify_invite_custody_v1 además devuelve select false y es de invitaciones, no de esta captura. No es un custodio reutilizable de original de propiedad.

Se conserva el parser privado CHEVENI_PROPERTY_CAPTURE_1 y la comparación exacta ya existente. Una futura referencia opaca puede minimizar copias sólo si un custodio protegido puede resolver el original exacto con su versión/alcance e informar SAME/CONFLICT/UNAVAILABLE sin exponer dirección. El puerto actual compare sigue UNKNOWN: no se agrega otro protocolo firmado o callback positivo.

| Dato/contrato | Minimización candidata | Dependencia estricta |
|---|---|---|
| address/floor_or_unit históricos | No añadir otra copia; conservar la existente sin ejecutarla/borrarla | Decisión específica D02-A de finalidad/acceso/custodia/retención |
| Estructura street/number/floor/unit | Parser original NFC/gramática, compilación exacta de address/floor; sin trim/casefold o pérdida de defaults | Comparador protegido que use la misma versión y argumentos exactos |
| originalRef | Metadata opaca ligada a usuario, sesión histórica, cuenta/miembro, intento/attempt, versión y key | Procedencia protegida; UUID del cliente no acredita custodia |
| key por intención | Mantener sólo su finalidad de identificar intención | No demuestra igualdad de dirección/unidad ni permite reconstruirla |
| Comparación | Respuesta interna mínima, sin oráculo público de texto, snapshot o logs privados | Acceso actual protegido, control de alcance y comparación independiente |
| Recuperación | Restaurado en cuarentena, con floors actuales y autoridad presente | No aceptar un floor del backup como vigente; no NEW por memoria vacía |
| Retención/supresión | Sin número de días ni borrado nuevo | Coordinación aprobada entre original, resultado, propiedad, journal y backups; UNKNOWN si ya no puede conciliarse |

Admisión durable debe preservar request/intent/attempt/originalRef y procedencia sin perder información al llamar al writer histórico de once argumentos. Ese sidecar NO existe ni se persistió en este lote. La alternativa de custodia está cerrada hasta acreditar finalidad, minimización, acceso, cifrado/custodia de claves y retención aplicables. La decisión general D02-A anterior permanece vigente; esto no inventa aprobación específica.

Read/2 no recibe dirección/snapshot ni una cuenta elegida por cliente. Su ABI de 26 parámetros carece de p_account: la futura implementación debe derivar la cuenta a través de original/result/member/slot y comparar el scope actual. El adaptador de revisión comprueba esa condición en metadata sintética; sin resolver protegido no emite un statement. Journal/witness y COMMIT externos no se sustituyen por los datos de esa metadata.

No hubo datos reales, almacenamiento, claves, firmas, fingerprints personales o restore. Los fallos de ACK/red siguen UNKNOWN, sin reenvío automático. Ver NATIVE-DELTA para evidencia futura específica; nada autoriza un ensayo.
