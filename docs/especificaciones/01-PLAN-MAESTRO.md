# Plan maestro - Visitas Áulicas V1

## 1. Objetivo

Construir una aplicación web interna en Google Apps Script para transformar el borrador físico posterior a una observación de clase en información estructurada y documentos oficiales reproducibles. La V1 debe reducir duplicación, errores de transcripción y tiempo de elaboración, sin sustituir el juicio del evaluador.

## 2. Resultado esperado

Una evaluación cerrada produce:

- Anexo 1: registro de la observación de clase.
- Anexo 2: ficha de observación, incluidos datos informativos, seis criterios generales y los 15 resultados derivados de la rúbrica.
- Anexo 3: rúbrica con el descriptor elegido en cada criterio.
- Anexo 5: fortalezas, aspectos a mejorar, compromisos, observaciones y espacios de firmas.
- Expediente PDF conjunto en el orden 1, 2, 3, 5.

Cada PDF individual y conjunto queda asociado a la misma versión de datos.

## 3. Alcance funcional

### Incluido

- Acceso con cuenta Google y lista explícita de usuarios autorizados.
- Roles Administrador, Evaluador y Consulta.
- Catálogos de institución, usuarios, docentes, rúbrica y checks documentales.
- Creación, guardado automático/manual, edición y recuperación de borradores.
- Captura posterior a la observación; no se usa durante la clase.
- Check de disponibilidad de evidencia/documentación física, sin adjuntos.
- Rúbrica de 15 criterios con descriptores visibles y una respuesta por criterio.
- Seis criterios generales del Anexo 2 con argumento obligatorio al discrepar.
- Asistencia de IA para Anexo 5, siempre editable y confirmada por una persona.
- Generación individual y conjunta de PDFs desde plantillas Google Docs.
- Historial, reimpresión, versionado documental y auditoría básica.

### Excluido

- Carga, OCR o almacenamiento de evidencias.
- Anexo 4 en la app o en el expediente.
- Seguimiento posterior de compromisos, alertas o fechas de cumplimiento.
- Firma electrónica; los PDFs conservan espacios para firmas manuscritas.
- Evaluación automática por IA.
- Aplicación móvil nativa, trabajo sin conexión y notificaciones.
- Dashboard comparativo, importación masiva y multiinstitución SaaS.

## 4. Proceso operativo objetivo

1. El administrador configura institución, usuarios, docentes, criterios, plantillas y checks.
2. El evaluador realiza la observación con documentos físicos fuera de la app.
3. Después, crea una evaluación y completa datos generales.
4. Transcribe el registro del Anexo 1.
5. Marca documentos/evidencias físicas disponibles.
6. Responde los seis criterios generales del Anexo 2.
7. Responde los 15 criterios del Anexo 3; esas respuestas alimentan también el Anexo 2.
8. Redacta el Anexo 5 manualmente o solicita una propuesta de IA.
9. Revisa la vista previa, corrige y confirma una declaración de revisión humana.
10. Finaliza; el sistema valida, crea una instantánea y genera los PDFs.
11. Imprime y adjunta físicamente las evidencias y firmas.

## 5. Fases de trabajo

| Fase | Entregables | Salida verificable |
|---|---|---|
| 0. Descubrimiento | matriz campo-anexo, decisiones abiertas, muestra de PDFs | aprobación funcional y visual |
| 1. Diseño | wireframes, modelo de datos, contratos de servicio, catálogos | revisión técnica y de usuario |
| 2. Base técnica | repositorio clasp, ambientes, configuración, permisos, bitácora | Web App accesible en DEV |
| 3. Núcleo manual | docentes, visitas, Anexo 1, generales, rúbrica, Anexo 5 manual | flujo completo sin IA ni PDF |
| 4. Documentos | cuatro plantillas, motor de sustitución, PDFs, expediente | comparación visual aprobada |
| 5. IA | prompt versionado, JSON validado, revisión humana, métricas mínimas | resultado seguro y editable |
| 6. Calidad | pruebas, UAT, accesibilidad, rendimiento, recuperación | criterios de aceptación cumplidos |
| 7. Producción | despliegue, manual, capacitación, respaldo y soporte | piloto en operación |

Orden obligatorio: el sistema debe cerrar una evaluación y producir documentos correctos sin IA antes de integrar IA.

## 6. Requisitos de proceso

- Product owner institucional decide campos, textos oficiales y política documental.
- Un responsable pedagógico valida criterios y descriptores.
- Un responsable técnico controla despliegues, secretos y respaldos.
- Toda modificación de rúbrica crea una nueva `rubric_version`; no altera visitas anteriores.
- Toda modificación de plantilla crea una nueva `template_version`.
- Los defectos de exactitud documental bloquean salida a producción.
- Las decisiones se registran en ADR breves dentro del repositorio.

## 7. Roles del equipo

| Rol | Responsabilidad |
|---|---|
| Product owner | prioridad, alcance y aceptación |
| Referente pedagógico | fidelidad de anexos, rúbrica y lenguaje |
| Desarrollador Apps Script | implementación, pruebas y despliegue |
| QA/UAT | casos, regresión documental y aceptación |
| Administrador institucional | altas, catálogos y soporte de primer nivel |

Una persona puede cubrir varios roles en el MVP, pero las aprobaciones pedagógica y técnica deben quedar explícitas.

## 8. Estimación orientativa

Rango inicial: 7 a 10 semanas calendario o 120 a 190 horas, condicionado por la fidelidad requerida de los PDFs y el número de ciclos de validación. Distribución sugerida:

- Descubrimiento y diseño: 15-25 h.
- Base técnica y datos: 20-30 h.
- Flujo funcional: 35-50 h.
- Plantillas/PDF: 25-45 h.
- IA: 10-18 h.
- QA, UAT, despliegue y capacitación: 15-22 h.

No es una cotización. La reproducción exacta de tablas, saltos y logotipos es el mayor factor de incertidumbre.

## 9. Costes operativos

- Apps Script, Sheets, Docs y Drive: normalmente sin infraestructura adicional si la institución ya dispone de Google Workspace y sus cuotas cubren el volumen.
- IA: variable por solicitud; registrar proveedor, modelo, unidades consumidas y coste estimado si está disponible.
- Desarrollo/mantenimiento: principal coste del MVP.
- Dominio y hosting externo: no requeridos para V1.

Antes de producción se deben confirmar cuotas vigentes, política de Workspace y términos del proveedor de IA; no se deben codificar precios en la aplicación.

## 10. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Plantilla oficial difícil de reproducir | alto | prototipo documental en fase 0 y prueba visual página por página |
| Edición concurrente en Sheets | alto | `LockService`, operaciones por lote, control de versión optimista |
| Cuotas/tiempo máximo de Apps Script | alto | colas de generación, caché, lotes y monitorización de fallos |
| Cambio de rúbrica | alto | catálogo y versiones; snapshot por visita |
| Respuesta inadecuada de IA | alto | no decide niveles, JSON estricto, revisión obligatoria y fallback manual |
| Exposición de datos | alto | mínimos datos, secretos en propiedades, ACL de Drive y lista de acceso |
| Dependencia de IDs de Google | medio | configuración centralizada y adapters |
| PDFs distintos entre regeneraciones | medio | versión de plantilla, hash de snapshot y nombre determinista |
| Pérdida o corrupción de Sheet | alto | respaldos, exportación periódica y pruebas de restauración |
| Crecimiento más allá del MVP | medio | capas y contratos transportables a API/SQL |

## 11. Indicadores del piloto

- 100 % de evaluaciones cerradas generan los cinco archivos esperados.
- 0 diferencias de datos entre UI, Anexo 2, Anexo 3 y snapshot.
- Mediana de generación individual menor a 20 s; expediente menor a 45 s, sujeta a cuotas.
- Menos de 2 % de intentos de generación con reintento manual.
- 100 % de textos IA confirmados o editados antes de finalizar.
- Reducción de al menos 40 % del tiempo de transcripción/documentación frente al proceso base, medida en piloto.

## 12. Hito de salida de MVP

Se autoriza producción cuando: P0 está terminado; UAT es aprobado por referente pedagógico; no hay defectos críticos/altos; permisos y respaldos fueron probados; existen manual de administración y operación; y una evaluación de muestra fue reimpresa desde producción con los mismos datos.

