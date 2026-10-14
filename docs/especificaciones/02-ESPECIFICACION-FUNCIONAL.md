# Especificación funcional

## 1. Actores y permisos

| Capacidad | Administrador | Evaluador | Consulta |
|---|:---:|:---:|:---:|
| Configurar institución, usuarios y docentes | sí | no | no |
| Gestionar catálogos, rúbrica y plantillas | sí | no | no |
| Crear evaluación | sí | sí | no |
| Editar borrador propio | sí | sí | no |
| Ver evaluaciones | todas | propias o asignadas | autorizadas |
| Finalizar | sí | propia/asignada | no |
| Reabrir finalizada | sí, con motivo | no | no |
| Generar/reimprimir PDF | sí | autorizadas | autorizadas |
| Ver auditoría | sí | propia resumida | no |

La autorización se aplica en servidor; ocultar botones no es una medida de seguridad.

## 2. Flujo de estados

```text
BORRADOR -> EN_REVISION -> FINALIZADA -> DOCUMENTOS_GENERADOS
    ^           |               |
    |-----------|               v
                         REABIERTA (admin)
                               |
                               +-> EN_REVISION
```

- `BORRADOR`: edición libre por autor/autorizado.
- `EN_REVISION`: datos completos; permite volver a editar.
- `FINALIZADA`: snapshot creado, datos bloqueados.
- `DOCUMENTOS_GENERADOS`: PDFs de esa versión disponibles.
- `REABIERTA`: estado auditado y temporal; al corregir crea nueva versión.
- `ANULADA`: solo administrador, con motivo; no se borra físicamente.

## 3. Requisitos funcionales

### Acceso y catálogos

- **RF-001** Autenticar por cuenta Google y negar acceso si el correo no está activo en `USERS`.
- **RF-002** Permitir al administrador mantener usuarios, roles, docentes e institución.
- **RF-003** Desactivar registros sin borrarlos cuando ya estén referenciados.
- **RF-004** Cargar rúbrica, descriptores, checks y plantillas desde catálogos versionados.

### Evaluación

- **RF-010** Crear visita con ID legible y UUID interno.
- **RF-011** Autocompletar datos institucionales configurados y permitir completar datos variables.
- **RF-012** Guardar borrador por sección y avisar éxito/error; autosave tras inactividad es deseable, no sustitutivo del guardado explícito.
- **RF-013** Detectar edición sobre versión antigua y pedir recarga, sin sobrescribir silenciosamente.
- **RF-014** Buscar/filtrar historial por docente, fecha, evaluador, estado e ID.
- **RF-015** Duplicar datos generales de una visita anterior solo mediante acción explícita; nunca copiar respuestas o análisis.

### Anexo 1

- **RF-020** Capturar institución, fecha, docente, grado/curso y registro narrativo.
- **RF-021** Conservar saltos de párrafo y caracteres; sanear contenido antes de insertarlo en Docs.
- **RF-022** Generar el Anexo 1 con la disposición oficial y permitir descarga individual.

### Documentación física

- **RF-030** Mostrar checks configurables de disponibilidad/cumplimiento.
- **RF-031** No permitir adjuntar archivos.
- **RF-032** Guardar valor booleano, observación opcional y versión del catálogo.

### Anexo 2 - datos y criterios generales

- **RF-040** Capturar: número de ficha, institución, ubicación, zona, distrito, circuito, dirección, jornada, docente, contenido, área, asignatura, fecha, grado/curso, paralelo, subnivel y número de estudiantes.
- **RF-041** Evaluar los seis criterios generales como `TOTALMENTE_DE_ACUERDO` o `EN_DESACUERDO`.
- **RF-042** Exigir argumento cuando el resultado sea `EN_DESACUERDO`.
- **RF-043** Generar la tabla de 15 criterios del Anexo 2 desde las respuestas de la rúbrica, sin segunda captura.

Los seis criterios generales oficiales son:

1. La clase se inicia con puntualidad de acuerdo con el horario institucional.
2. El docente desarrolla su clase en un ambiente limpio y organizado.
3. Las actividades desarrolladas en clase guardan relación con la planificación microcurricular entregada.
4. El objetivo se da a conocer durante el desarrollo de la clase.
5. La relación entre los elementos del currículo se evidencia durante el desarrollo de las actividades.
6. El tiempo es distribuido de modo que se cumplan los objetivos propuestos mediante las actividades planificadas.

### Anexo 3 - rúbrica

- **RF-050** Mostrar 15 criterios agrupados por momento inicial, desarrollo, consolidación/evaluación y clima de aula.
- **RF-051** Mostrar simultáneamente los descriptores de Logrado, En proceso y En inicio; No aplica no requiere descriptor.
- **RF-052** Aceptar exactamente un nivel por criterio: `LOGRADO`, `EN_PROCESO`, `EN_INICIO`, `NO_APLICA`.
- **RF-053** Capturar observación opcional por criterio; hacerla obligatoria para `NO_APLICA` salvo decisión institucional distinta.
- **RF-054** Guardar código y versión de criterio/descriptor, no solo el texto visible.
- **RF-055** Bloquear finalización hasta responder los 15 criterios.

Catálogo de criterios:

| Código | Grupo | Criterio |
|---|---|---|
| CRI-01 | Inicial | Relación motivación-objetivo de la clase |
| CRI-02 | Inicial | Conocimientos previos o prerrequisitos |
| CRI-03 | Desarrollo | Estimulación del pensamiento crítico y creativo |
| CRI-04 | Desarrollo | Ambiente interactivo y colaborativo |
| CRI-05 | Desarrollo | Dominio del conocimiento disciplinar |
| CRI-06 | Desarrollo | Interdisciplinariedad |
| CRI-07 | Desarrollo | Recursos didácticos |
| CRI-08 | Desarrollo | Conclusiones, definiciones y otras generalizaciones |
| CRI-09 | Consolidación | Retroalimentación del docente |
| CRI-10 | Consolidación | Evaluación formativa |
| CRI-11 | Consolidación | Evaluación sumativa |
| CRI-12 | Clima | Promoción del respeto |
| CRI-13 | Clima | Manejo del comportamiento de los estudiantes |
| CRI-14 | Clima | Ambiente democrático |
| CRI-15 | Clima | Atención a estudiantes con necesidades educativas especiales (NEE) |

Los descriptores completos están preparados como semilla en `06-CATALOGO-RUBRICA.md` y deben pasar revisión pedagógica contra el original antes del primer seed de producción. La interfaz y los documentos nunca deben mantener copias hardcodeadas diferentes.

### Anexo 5 e IA

- **RF-060** Capturar fortalezas, aspectos a mejorar, compromiso del directivo, compromiso del docente y observaciones.
- **RF-061** Permitir redacción totalmente manual aun cuando la IA no esté configurada o falle.
- **RF-062** Enviar a IA solo el contexto mínimo: registro, criterios generales, niveles, descriptores elegidos y observaciones.
- **RF-063** Solicitar respuesta estructurada con los cinco campos del Anexo 5, sin inventar hechos ni cambiar niveles.
- **RF-064** Mostrar propuesta como borrador no guardado hasta que el usuario la acepte o edite.
- **RF-065** Permitir regenerar y registrar versión de prompt/modelo, estado y latencia, sin guardar secretos ni razonamiento interno.
- **RF-066** Exigir confirmación `reviewed_by_human=true` antes de finalizar si se usó IA.
- **RF-067** Mantener espacios para firma y nombre de directivo/delegado y docente; no implementar firma electrónica.

### Documentos

- **RF-070** Generar cada anexo de forma independiente.
- **RF-071** Generar expediente conjunto ordenado 1, 2, 3, 5.
- **RF-072** Usar exclusivamente snapshot de evaluación y versiones de rúbrica/plantilla registradas.
- **RF-073** Mostrar estado `PENDIENTE/GENERANDO/LISTO/ERROR` y permitir reintento idempotente.
- **RF-074** Nombrar archivos de forma determinista: `{visit_id}_v{version}_{document_type}.pdf`.
- **RF-075** Registrar Drive file ID, hash de snapshot, versión, creador y fecha.
- **RF-076** No regenerar silenciosamente un archivo existente; crear nueva versión o devolver el actual si snapshot y plantilla coinciden.

## 4. Reglas y validaciones

### Datos generales

- Fecha obligatoria y válida; por defecto no futura, salvo permiso administrativo.
- Número de estudiantes entero entre 0 y 999.
- Docente activo obligatorio; se conserva snapshot del nombre aunque luego cambie el catálogo.
- Curso, asignatura, contenido, evaluador y jornada obligatorios para finalizar.
- Texto normalizado en Unicode, recortado, sin HTML ejecutable.

### Longitudes iniciales

| Campo | Máximo recomendado |
|---|---:|
| contenido/tema | 250 |
| observación por criterio | 1000 |
| argumento criterio general | 1000 |
| registro Anexo 1 | 12000 |
| cada bloque Anexo 5 | 5000 |
| motivo de reapertura/anulación | 500 |

Los máximos se validan en cliente y servidor y se ajustan tras probar las plantillas.

### Integridad

- No se finaliza con campos requeridos pendientes.
- No se mezclan respuestas de distintas versiones de rúbrica.
- `NO_APLICA` no cuenta como logro ni como resultado negativo.
- Cambiar un nivel invalida cualquier documento generado de esa versión.
- Cerrar crea una instantánea; documentos nunca leen datos editables después del cierre.
- Reabrir incrementa `data_version`, invalida documentos vigentes y conserva versiones anteriores.

## 5. Requisitos no funcionales

- **RNF-001 Usabilidad:** flujo por pasos, indicador de progreso, mensajes en español claro y foco en escritorio/tablet.
- **RNF-002 Accesibilidad:** navegación por teclado, etiquetas, contraste WCAG AA y selección no dependiente solo del color.
- **RNF-003 Rendimiento:** lectura común <3 s y guardado <5 s en condiciones normales; generación asíncrona/tolerante a demora.
- **RNF-004 Disponibilidad:** fallo de IA no bloquea captura ni finalización manual.
- **RNF-005 Seguridad:** mínimo privilegio, controles en servidor, secretos fuera de Sheets/código y sin enlaces públicos.
- **RNF-006 Privacidad:** minimizar PII y no enviar nombres a IA si no son necesarios.
- **RNF-007 Auditabilidad:** actor, acción, entidad, fecha, versión y resultado en eventos importantes.
- **RNF-008 Mantenibilidad:** capas, JSDoc, lint/formato, constantes centralizadas y sin índices de columna dispersos.
- **RNF-009 Compatibilidad:** últimas versiones estables de Chrome/Edge; validar navegador institucional.
- **RNF-010 Recuperabilidad:** respaldo verificable y procedimiento documentado de restauración.
- **RNF-011 Migrabilidad:** IDs UUID, timestamps ISO UTC, enums estables y contratos DTO independientes de Sheets.

## 6. Criterios de aceptación end-to-end

1. Dada una cuenta no autorizada, el servidor rechaza toda lectura y escritura.
2. Dado un borrador parcial, puede guardarse, cerrar sesión y recuperarse sin pérdida.
3. Al marcar un criterio general en desacuerdo sin argumento, no permite continuar/finalizar y enfoca el campo.
4. Al elegir un nivel en los 15 criterios, Anexo 2 y 3 muestran exactamente la misma selección.
5. Al elegir No aplica, no se asigna descriptor de logro y se aplica la regla de justificación.
6. La IA nunca guarda directamente ni altera niveles; el usuario puede editar cada campo.
7. La evaluación no finaliza sin revisión humana del contenido asistido.
8. Una evaluación finalizada no es editable por el evaluador.
9. Una reapertura registra administrador, motivo y nueva versión.
10. Los PDFs individuales y el conjunto provienen del mismo hash de snapshot.
11. El expediente excluye Anexo 4 y adjuntos de evidencia.
12. Los PDFs conservan espacios para firmas manuscritas y no declaran firma digital.
