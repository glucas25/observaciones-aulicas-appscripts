# Arquitectura técnica

## 1. Vista de contexto

```text
Navegador
  -> Apps Script Web App (HTML/CSS/JS)
      -> Controllers / DTO validation
          -> Application services / domain rules
              -> Repository interfaces
                  -> Google Sheets
              -> Document gateway -> Google Docs / Drive / PDF
              -> AI gateway -> proveedor configurable
              -> Audit gateway -> hoja de auditoría
```

La arquitectura es un monolito modular. La separación es lógica dentro de Apps Script y evita que UI, reglas, filas de Sheets y APIs externas se mezclen.

## 2. Capas y responsabilidades

- **UI:** render, estado del formulario, validación inmediata y accesibilidad. No contiene reglas finales ni IDs de hojas.
- **Controllers:** autentican, autorizan, validan DTO y convierten errores a respuestas estables.
- **Application services:** casos de uso (`CreateVisit`, `SaveSection`, `FinalizeVisit`, `GenerateDocument`).
- **Domain:** estados, reglas, enums, cálculos y validaciones independientes de Google.
- **Repositories:** contratos CRUD y consultas; una implementación Sheets en V1.
- **Gateways:** documentos, Drive, IA, correo si se incorpora y reloj/UUID.
- **Infrastructure:** configuración, locks, caché, logging y adaptadores Google.

## 3. Estructura propuesta

```text
visitas-aulicas/
├─ appsscript.json
├─ .clasp.json.example
├─ README.md
├─ docs/
│  ├─ adr/
│  └─ runbooks/
├─ src/
│  ├─ bootstrap/
│  │  ├─ Config.gs
│  │  ├─ Container.gs
│  │  └─ WebApp.gs
│  ├─ controllers/
│  │  ├─ VisitController.gs
│  │  ├─ CatalogController.gs
│  │  ├─ DocumentController.gs
│  │  └─ AdminController.gs
│  ├─ application/
│  │  ├─ VisitService.gs
│  │  ├─ FinalizationService.gs
│  │  ├─ DocumentService.gs
│  │  └─ AiDraftService.gs
│  ├─ domain/
│  │  ├─ Visit.gs
│  │  ├─ VisitState.gs
│  │  ├─ Rubric.gs
│  │  ├─ Validation.gs
│  │  └─ Errors.gs
│  ├─ repositories/
│  │  ├─ interfaces/
│  │  └─ sheets/
│  ├─ gateways/
│  │  ├─ DocsGateway.gs
│  │  ├─ DriveGateway.gs
│  │  └─ AiGateway.gs
│  ├─ infrastructure/
│  │  ├─ Auth.gs
│  │  ├─ Audit.gs
│  │  ├─ Locking.gs
│  │  ├─ Cache.gs
│  │  └─ Json.gs
│  └─ ui/
│     ├─ Index.html
│     ├─ Styles.html
│     ├─ App.html
│     ├─ ApiClient.html
│     └─ components/
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  └─ fixtures/
└─ scripts/
   ├─ seed-dev.js
   └─ validate-config.js
```

Apps Script aplana archivos al desplegar; las carpetas representan la estructura del repositorio local administrado con `clasp`.

## 4. Contrato de llamadas

Las funciones públicas devuelven un sobre estable:

```json
{
  "ok": true,
  "data": {},
  "error": null,
  "requestId": "uuid",
  "serverTime": "2026-09-28T16:00:00.000Z"
}
```

En error: `code`, `message` seguro para usuario y `details` solo cuando no expone información sensible. Códigos: `AUTH_REQUIRED`, `FORBIDDEN`, `VALIDATION_ERROR`, `VERSION_CONFLICT`, `NOT_FOUND`, `QUOTA_ERROR`, `AI_UNAVAILABLE`, `DOCUMENT_ERROR`, `INTERNAL_ERROR`.

DTOs usan `camelCase`; columnas de Sheets y futuro SQL usan `snake_case`. El mapper es explícito.

## 5. Concurrencia e idempotencia

- `LockService.getScriptLock()` protege secuencias de asignación y escrituras relacionadas.
- Cada evaluación tiene `row_version` entero. `saveVisit(dto, expectedVersion)` falla si no coincide.
- Operaciones multihoja se preparan/validan antes de escribir y se agrupan cuando sea posible.
- `idempotency_key` evita duplicar finalización y documentos tras reintento.
- La generación documental se registra primero como `PENDIENTE`; el mismo job puede reanudarse.

Sheets no ofrece transacciones ACID. Si una escritura parcial falla, se registra evento y se ejecuta compensación/reconciliación.

## 6. Generación documental

### Plantillas

Cuatro Google Docs maestros, solo editables por administradores técnicos. IDs en configuración por ambiente. Marcadores estables, por ejemplo:

```text
{{VISIT_ID}} {{INSTITUTION_NAME}} {{VISIT_DATE}}
{{TEACHER_NAME}} {{COURSE}} {{SUBJECT}}
{{OBSERVATION_RECORD}}
{{GENERAL_CRITERIA_TABLE}}
{{RUBRIC_SELECTIONS_TABLE}}
{{STRENGTHS}} {{IMPROVEMENTS}}
{{DIRECTIVE_COMMITMENTS}} {{TEACHER_COMMITMENTS}}
{{FINAL_OBSERVATIONS}}
```

Para tablas complejas se recomienda identificar tablas/filas por marcador y poblar celdas, no sustituir una tabla por texto plano.

### Algoritmo

1. Autorizar y obtener snapshot finalizado.
2. Resolver versión de plantilla y rúbrica.
3. Crear registro `DOCUMENT_JOBS` idempotente.
4. Copiar plantilla a carpeta temporal restringida.
5. Sustituir texto y marcar casillas/tablas.
6. Guardar/cerrar documento y exportar PDF.
7. Validar tipo/tamaño y, en pruebas, texto esperado/páginas.
8. Mover a carpeta final, registrar metadatos y eliminar/interdictar temporal.
9. Para expediente, combinar PDFs individuales en orden 1-2-3-5 mediante servicio/librería aprobada. Si la combinación fiable no cabe en Apps Script, usar una API interna mínima como excepción documentada; el MVP no debe degradar a un enlace múltiple sin decisión de producto.

El objetivo visual es conservar estructura, orden, rótulos, colores, encabezados, pies y espacios de firma del documento oficial. “Pixel perfect” se define mediante muestras aprobadas, no por comparación subjetiva.

## 7. Integración de IA

### Diseño

- Interfaz `AiProvider.generatePedagogicalDraft(input)`.
- Proveedor, modelo, endpoint y prompt versionados por ambiente.
- API key en Script Properties o Secret Manager mediante gateway; nunca en Sheet, HTML o repositorio.
- `UrlFetchApp` únicamente desde servidor.
- Temperatura baja y salida JSON estructurada.

Esquema de salida:

```json
{
  "strengths": "string",
  "improvements": "string",
  "directiveCommitments": "string",
  "teacherCommitments": "string",
  "observations": "string",
  "warnings": ["string"]
}
```

### Guardrails

- No pedir puntajes ni nivel recomendado.
- Instruir: usar solo hechos proporcionados, tono profesional, no diagnosticar ni inferir atributos personales.
- Eliminar nombres/identificadores del prompt cuando no sean necesarios.
- Validar JSON, campos, longitud y contenido vacío; rechazar texto fuera de esquema.
- Registrar hash de entrada, no necesariamente el prompt con PII.
- Timeout, un reintento con backoff y circuit breaker simple.
- Mostrar aviso de asistencia, permitir descartar y mantener flujo manual.
- Conservar `ai_generated`, `ai_accepted`, `human_edited` y versión del prompt.

## 8. Seguridad y privacidad

- Web App ejecutada bajo una identidad institucional definida; acceso limitado al dominio/lista autorizada según el modelo de despliegue.
- Verificar `Session.getActiveUser().getEmail()` y usuario activo en cada endpoint sensible; validar el comportamiento real del dominio en piloto.
- Carpetas Drive sin acceso público; separar plantillas, temporales, PDFs y respaldos.
- Principio de mínimo privilegio para scopes del manifiesto.
- Escapar todo contenido mostrado; nunca evaluar HTML del usuario.
- No incluir secretos, stack traces ni IDs internos sensibles en respuestas UI.
- Auditoría append-only lógica; solo administrador técnico puede editar la hoja.
- Política de retención acordada y proceso de baja/exportación.
- Evaluación de impacto y autorización institucional antes de activar IA externa.

## 9. Auditoría y observabilidad

Eventos mínimos: acceso denegado, creación, cambio de estado, guardado, conflicto, uso/aceptación de IA, finalización, reapertura, anulación, generación/descarga y cambios de configuración.

Cada evento: `event_id`, UTC, actor, rol, acción, entidad/ID, `data_version`, request ID, resultado, mensaje seguro y metadatos JSON sin secretos. Los errores también van a Cloud Logging/Execution logs con correlación.

Métricas: latencia, fallos por operación, reintentos, generación de documentos, uso IA, evaluaciones por estado y antigüedad de borradores.

## 10. Ambientes y configuración

Ambientes separados DEV, UAT y PROD, cada uno con proyecto Apps Script, spreadsheet, carpetas y plantillas propios. Propiedades:

```text
APP_ENV, APP_VERSION, SPREADSHEET_ID
TEMPLATES_FOLDER_ID, OUTPUT_FOLDER_ID, TEMP_FOLDER_ID
ANNEX1_TEMPLATE_ID, ANNEX2_TEMPLATE_ID, ANNEX3_TEMPLATE_ID, ANNEX5_TEMPLATE_ID
AI_ENABLED, AI_PROVIDER, AI_MODEL, AI_PROMPT_VERSION, AI_API_KEY
TIMEZONE=America/Guayaquil, RETENTION_DAYS, SUPPORT_EMAIL
```

No se copian datos reales a DEV. `.clasp.json` real y secretos quedan fuera de Git.

## 11. Migración futura

| V1 Apps Script | Destino |
|---|---|
| HTMLService | React + TypeScript |
| Controllers GS | FastAPI routers |
| Services/domain GS | Python services/domain |
| Repository interface | SQLAlchemy repository |
| Sheets rows | PostgreSQL tables |
| Session/allowlist | OIDC/OAuth + RBAC |
| DocsGateway | servicio de plantillas/PDF |
| AiGateway | proveedor server-side |

Reglas para facilitarla: UUID como PK; no usar número de fila como ID; UTC ISO; soft delete; enums estables; snapshots JSON; contratos DTO documentados; catálogos versionados; repositorios como única entrada a Sheets; exportación completa a JSON/CSV y pruebas del dominio desacopladas.

La migración se ejecutaría por fases: congelar esquema; crear API/BD; importar catálogos y maestros; importar visitas/snapshots/documentos; ejecutar doble lectura/verificación; cambiar frontend; retirar V1 conservando archivo de auditoría.

