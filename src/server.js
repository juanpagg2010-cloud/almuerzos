import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";

dotenv.config();

const requiredVariables = ["MONGO_URI", "JWT_SECRET"];

const validateEnvironment = () => {
  const missing = requiredVariables.filter(
    (variable) => !process.env[variable],
  );
  if (missing.length) {
    throw new Error(
      `Faltan variables obligatorias en .env: ${missing.join(", ")}`,
    );
  }
};

const startServer = async () => {
  validateEnvironment();
  await connectDB();

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`API de almuerzos disponible en http://localhost:${port}`);
  });
};

startServer().catch((error) => {
  console.error(`No se pudo iniciar el servidor: ${error.message}`);
  process.exit(1);
});
