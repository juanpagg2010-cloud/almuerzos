// Crea errores con codigo HTTP para que el middleware global responda de forma uniforme.
const appError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export default appError;
