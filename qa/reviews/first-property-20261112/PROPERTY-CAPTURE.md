# Contrato reutilizado y límites del adaptador

Fuentes fijadas en SOURCE-PINS.json. Se reutiliza `parsePrivatePropertyCapture` original del QA-lab y el comparador del dominio existente; no se instancia su adapter COMMITTED-on-ACK salvo en una prueba con doble para demostrar el riesgo. No se llama al RPC REST histórico, writer o SQL.

| Aspecto | Compatibilidad implementada QA | Pendiente protegido |
|---|---|---|
| Operación | property.draft.create corresponde sólo al subset de property_create; once argumentos nativos exactos | No hay dispatch descriptor o endpoint |
| Identidad | user/session QA, revisión, iat y exp sintéticos separados de la frescura de observación; p_expiry igual a exp en segundos | Proveedor Auth realmente verificado; sin tokens reales |
| Autoridad | property target NULL, operation property_create, una sola fila owner/account/member/revision exacta | private_mutation_authority_v1 devuelve cero filas WHERE false |
| Fundador/cupo | Fuente separada con identidad/scopeRevision/cuota/jurisdicción/dataset/epoch y vencimiento; 0 propiedades en el modelo | Productor protegido y slot transaccional; no seleccionar primera fila |
| Dirección | street + number; floor/unit opcionales según parser original; no se divide un texto libre | Custodia y política específica de la copia de captura |
| Defaults | Primera propiedad, apartment, es, 15:00, 10:00; etiquetas CABA/Buenos Aires preservadas como campos distintos | Catálogo real/defaults instalados y jurisdicción acreditada |
| Building | Únicamente NULL; UUID proporcionado se rechaza | Primitiva compatible para building/revisión de relación |
| Configuración | Cada diferencia no representable se rechaza; ninguna información se pierde para forzar el mapeo | ABI separado configure/submit/decision/pause/archive |
| Intención | Comparación estructural reutiliza el binding del dominio más autoridad/fundador/token/key/captura; cambio de intento/sesión/argumentos detectado | SQL histórico no representa attempt/revisiones del nuevo binding; no hay original confiable ni unicidad multiworker acreditada |
| Resultado | Función/ACK se conservan UNKNOWN; readback no escribe, no reconstruye desde digest/cliente | COMMIT externo, journal/witness, effect y reader independientes |

Los revisores devuelven metadatos de compatibilidad, nunca dirección/argumentos privados. Los defaults no autorizan el trial, el alta ni la decisión de revisión. Los puertos por defecto ignoran argumentos y callbacks y no emiten recibos positivos. `compareIntentReview` diferencia argumentos sólo en memoria; no emite CONFLICT SQL ni autoriza reenvíos.

La declaración .d.mts tipa el candidato, pero no se ejecutó TypeScript. `reader-profile.mjs` valida una propuesta exacta y cerrada, no instala ACL. Se eligió no generar otro SQL que dependiera de productores inexistentes o sustituyera sus respuestas por constantes.
