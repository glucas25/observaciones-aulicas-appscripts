var AppErrors = (function () {
  function AppError(code, message, details) {
    this.name = 'AppError';
    this.code = code;
    this.message = message;
    this.details = details || null;
    this.stack = new Error(message).stack;
  }
  AppError.prototype = Object.create(Error.prototype);
  AppError.prototype.constructor = AppError;

  function make(code, message, details) { return new AppError(code, message, details); }
  return {
    AppError: AppError,
    auth: function () { return make('AUTH_REQUIRED', 'No fue posible identificar su cuenta de Google.'); },
    forbidden: function (message) { return make('FORBIDDEN', message || 'No tiene permiso para realizar esta acción.'); },
    validation: function (message, details) { return make('VALIDATION_ERROR', message, details); },
    conflict: function () { return make('VERSION_CONFLICT', 'La evaluación cambió en otra pestaña. Recargue antes de guardar.'); },
    notFound: function (entity) { return make('NOT_FOUND', (entity || 'El registro') + ' no existe.'); },
    document: function (message) { return make('DOCUMENT_ERROR', message || 'No se pudo generar el documento.'); },
    ai: function (message) { return make('AI_UNAVAILABLE', message || 'La asistencia de IA no está disponible.'); },
    internal: function () { return make('INTERNAL_ERROR', 'Ocurrió un error inesperado. Use el identificador de solicitud para soporte.'); }
  };
})();

