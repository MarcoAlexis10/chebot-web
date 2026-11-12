# Duplicado de dirección/unidad: propuesta retenida específica

Fuente inmóvil: `property_capture_v1.source.txt`, extraída de private-mutations-UNAPPLIED.sql del QA-lab ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a; hashes en SOURCE-PINS.json. Contiene principal_id + intent_id, address y floor_or_unit, PK de intención y FK diferida al resultado. El writer compara el original exacto antes de aceptar una repetición, mientras concierge_properties conserva otra copia de dirección/unidad. Es dato potencialmente personal y privado, aunque no haya huésped.

| Elemento | Propuesta mínima, no autorización |
|---|---|
| Finalidad | Detectar divergencia exacta del intento original y conciliar un resultado incierto; no catálogo público, analytics o logs |
| Minimización | Preferir referencia opaca al original confiable existente, sólo si una futura custodia puede comparar los mismos bytes/campos; no duplicar otro snapshot, frame o digest de dirección |
| Riesgo de cambio | El key histórico es por intención y NO incluye dirección. Sustituir el duplicado por ese key permite omitir conflictos. Borrar el original no autoriza reconstrucción ni reintento: UNKNOWN/HELD |
| Acceso | Sólo comparador protegido del writer/custodio; reader devuelve estado/IDs mínimos bajo autoridad actual, nunca dirección/unidad ni un oráculo de coincidencia de texto |
| Custodia | Cifrado y custodia de claves, separación de writer/reader/journal, acceso y auditoría sin payloads, backups y restauración en cuarentena deben acreditarse antes de persistir |
| Retención | Decisión específica de categorías/finalidad/base aplicable, vencimiento y excepciones/evidencias pendientes; no se fija cantidad de días ni se presupone una aprobación nueva |
| Supresión | No ejecutada. Debe coordinar original, resultado, propiedad, journal y backups según D02-A, conservando UNKNOWN si ya no puede conciliarse |
| A2 | Restaurar tablas no restaura Auth, claves, floors o custodia. Prohibido recuperar autoridad anterior desde backup; revocaciones posteriores independientes |

Se conserva la decisión general D02-A previamente registrada; este lote no la revoca ni inventa aprobación para esta copia concreta. No se implementó persistencia, cifrado, claves, retención o borrado. Los ejemplos son ficticios. Los revisores no devuelven argumentos privados y no añaden logs de tokens, direcciones o comprobantes. Falta evidencia técnica y decisión aplicable antes de usar el original con datos reales.
