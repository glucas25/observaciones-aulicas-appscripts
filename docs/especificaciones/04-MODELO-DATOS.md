# Modelo de datos en Google Sheets

## 1. Principios

- Una hoja por entidad o relación repetible.
- Fila 1 fija con nombres técnicos `snake_case`; no combinar celdas.
- UUID interno inmutable y código humano separado.
- Fechas/hora almacenadas en UTC ISO 8601; fecha pedagógica como `YYYY-MM-DD`.
- Booleans `TRUE/FALSE`; enums con códigos estables.
- JSON solo para snapshots/metadatos, no para datos consultados habitualmente.
- Eliminación lógica mediante `active`/`deleted_at`.
- Índices de columnas centralizados en código o resueltos por encabezado.

## 2. Convenciones de ID

- `institution_id`: UUID; código `INS-001`.
- `user_id`: UUID; identidad externa = email normalizado.
- `teacher_id`: UUID; código `DOC-000001`.
- `visit_id`: UUID; código visible `VIS-YYYY-000001`.
- `criterion_id`: UUID; código estable `CRI-01` a `CRI-15`.
- `general_criterion_id`: UUID; `GEN-01` a `GEN-06`.
- `document_id`, `event_id`, `ai_request_id`: UUID.

El correlativo visible se asigna bajo lock y no es PK. UUID se genera con `Utilities.getUuid()`.

## 3. Hojas y columnas

### `SETTINGS`

`key` PK, `value`, `value_type`, `environment`, `description`, `updated_at`, `updated_by`.

Solo configuración no secreta. Los secretos viven en propiedades protegidas.

### `INSTITUTIONS`

`institution_id`, `institution_code`, `name`, `location`, `zone`, `district`, `circuit`, `address`, `default_shift`, `active`, `created_at`, `updated_at`.

### `USERS`

`user_id`, `email`, `display_name`, `role`, `institution_id`, `active`, `created_at`, `updated_at`, `last_access_at`.

Roles: `ADMIN`, `DIRECTIVE`, `EVALUATOR`, `TEACHER`. Las cuentas `TEACHER` se vinculan opcionalmente con su ficha mediante `TEACHERS.user_id`.

### `TEACHERS`

`teacher_id`, `teacher_code`, `institution_id`, `identity_reference` opcional, `full_name`, `email` opcional, `active`, `created_at`, `updated_at`, `user_id` opcional FK a `USERS`.

`user_id` vincula la ficha docente con su cuenta de acceso cuando la misma persona actúa como evaluador o directivo. El docente sigue siendo la entidad maestra y no se vuelve a ingresar manualmente en `USERS`.

Evitar cédula si no es necesaria. Si se usa, definir protección y retención.

### `RUBRIC_VERSIONS`

`rubric_version_id`, `version_code`, `name`, `effective_from`, `effective_to`, `status`, `source_document`, `approved_by`, `approved_at`.

Estados: `DRAFT`, `ACTIVE`, `RETIRED`.

### `RUBRIC_CRITERIA`

`criterion_id`, `rubric_version_id`, `criterion_code`, `group_code`, `sort_order`, `title`, `descriptor_achieved`, `descriptor_in_progress`, `descriptor_beginning`, `allows_na`, `active`.

Grupos: `INITIAL`, `DEVELOPMENT`, `CONSOLIDATION`, `CLASSROOM_CLIMATE`.

### `GENERAL_CRITERIA`

`general_criterion_id`, `catalog_version`, `criterion_code`, `sort_order`, `text`, `active`.

### `EVIDENCE_CHECK_TYPES`

`check_type_id`, `catalog_version`, `check_code`, `label`, `sort_order`, `active`.

La lista se confirma en descubrimiento; no está fijada por el PDF oficial.

### `VISITS`

`visit_id`, `visit_code`, `institution_id`, `teacher_id`, `evaluator_user_id`, `status`, `data_version`, `rubric_version_id`, `general_catalog_version`, `evidence_catalog_version`, `form_number`, `visit_date`, `class_start_time` opcional, `shift`, `teacher_name_snapshot`, `institution_name_snapshot`, `location`, `zone`, `district`, `circuit`, `institution_address`, `grade_course`, `parallel`, `sublevel`, `area`, `subject`, `content_topic`, `student_count`, `observation_record`, `strengths`, `improvements`, `directive_commitments`, `teacher_commitments`, `final_observations`, `ai_used`, `reviewed_by_human`, `created_at`, `created_by`, `updated_at`, `updated_by`, `finalized_at`, `finalized_by`, `reopened_at`, `reopened_by`, `reopen_reason`, `annulled_at`, `annulled_by`, `annul_reason`.

### `VISIT_GENERAL_RESPONSES`

`response_id`, `visit_id`, `general_criterion_id`, `result`, `argument`, `created_at`, `updated_at`, `updated_by`.

Restricción lógica única `(visit_id, general_criterion_id)`. Resultados: `FULLY_AGREE`, `DISAGREE`.

### `VISIT_RUBRIC_RESPONSES`

`response_id`, `visit_id`, `criterion_id`, `level`, `descriptor_snapshot`, `observation`, `created_at`, `updated_at`, `updated_by`.

Restricción lógica única `(visit_id, criterion_id)`. Niveles: `ACHIEVED`, `IN_PROGRESS`, `BEGINNING`, `NOT_APPLICABLE`.

### `VISIT_EVIDENCE_CHECKS`

`visit_check_id`, `visit_id`, `check_type_id`, `is_checked`, `observation`, `created_at`, `updated_at`, `updated_by`.

### `VISIT_SNAPSHOTS`

`snapshot_id`, `visit_id`, `data_version`, `snapshot_json`, `snapshot_hash`, `schema_version`, `created_at`, `created_by`.

El JSON incluye todos los textos y versiones necesarios para reconstruir documentos sin consultar catálogos mutables.

### `AI_REQUESTS`

`ai_request_id`, `visit_id`, `data_version`, `provider`, `model`, `prompt_version`, `input_hash`, `status`, `latency_ms`, `output_json`, `accepted`, `human_edited`, `requested_at`, `requested_by`, `accepted_at`, `error_code`.

Aplicar política de retención al `output_json` y no registrar API keys.

### `DOCUMENTS`

`document_id`, `visit_id`, `data_version`, `document_type`, `template_version`, `snapshot_hash`, `status`, `drive_file_id`, `file_name`, `mime_type`, `size_bytes`, `generated_at`, `generated_by`, `superseded_at`, `error_code`.

Tipos: `ANNEX_1`, `ANNEX_2`, `ANNEX_3`, `ANNEX_5`, `FULL_PACKAGE`.

### `DOCUMENT_JOBS`

`job_id`, `idempotency_key`, `visit_id`, `data_version`, `document_type`, `status`, `attempt_count`, `started_at`, `completed_at`, `last_error_code`, `request_id`.

### `AUDIT_LOG`

`event_id`, `occurred_at`, `actor_user_id`, `actor_email`, `actor_role`, `action`, `entity_type`, `entity_id`, `data_version`, `request_id`, `result`, `message`, `metadata_json`.

### `SEQUENCES`

`sequence_name`, `year`, `last_value`, `updated_at`. Toda actualización bajo lock.

## 4. Relaciones

```text
INSTITUTIONS 1---N USERS
INSTITUTIONS 1---N TEACHERS
USERS        0---1 TEACHERS (cuenta vinculada opcional)
TEACHERS     1---N VISITS
USERS        1---N VISITS (evaluator)
RUBRIC_VERSIONS 1---N RUBRIC_CRITERIA
VISITS 1---N VISIT_GENERAL_RESPONSES
VISITS 1---N VISIT_RUBRIC_RESPONSES
VISITS 1---N VISIT_EVIDENCE_CHECKS
VISITS 1---N VISIT_SNAPSHOTS
VISITS 1---N AI_REQUESTS
VISITS 1---N DOCUMENTS
```

## 5. Integridad aplicada por servicio

- Existencia y estado activo de referencias al crear.
- Un registro por clave compuesta lógica.
- Exactamente 6 respuestas generales y 15 respuestas de rúbrica al finalizar.
- `argument` no vacío para `DISAGREE`.
- Descriptor snapshot corresponde a criterio/nivel/version.
- `reviewed_by_human=TRUE` si `ai_used=TRUE`.
- Solo un snapshot por `(visit_id, data_version)`.
- Solo un documento vigente por `(visit_id, data_version, document_type, template_version, snapshot_hash)`.

## 6. Índices en memoria y acceso

Como Sheets no tiene índices, los repositorios deben leer rangos por lote, construir mapas por ID y usar `CacheService` solo para catálogos no sensibles y versionados. No hacer `getRange()` dentro de bucles. El historial debe paginar y limitar columnas.

## 7. Exportación a PostgreSQL

Cada hoja corresponde a una tabla; UUID pasa a `uuid`, UTC a `timestamptz`, boolean a `boolean`, JSON a `jsonb` y enums a `varchar` con `CHECK` o tipos enum. Antes de migrar:

1. validar duplicados y referencias;
2. exportar UTF-8;
3. transformar nombres/fechas;
4. cargar maestros, luego visitas y detalles;
5. comparar conteos y hashes de snapshots;
6. conservar `drive_file_id` como referencia externa o migrar binarios con checksum.

