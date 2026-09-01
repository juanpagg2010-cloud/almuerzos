export const notFound = (req, res) => res.status(404).json({
  ok: false,
  message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
});

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  const isValidationError = error.name === "ValidationError";
  const isCastError = error.name === "CastError";
  const isDuplicateKey = error.code === 11000;
  const statusCode = error.statusCode
    || (isDuplicateKey ? 409 : null)
    || (isValidationError || isCastError ? 400 : null)
    || 500;
  const message = isDuplicateKey
    ? "Ya existe un registro con esos datos."
    : isValidationError
      ? Object.values(error.errors)[0]?.message || "Los datos enviados no son validos."
      : isCastError
        ? "El formato de los datos enviados no es valido."
        : error.message || "Error interno del servidor.";

  return res.status(statusCode).json({ ok: false, message });
};
