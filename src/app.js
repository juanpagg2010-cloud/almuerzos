import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { errorHandler, notFound } from "./middlewares/errorMiddleware.js";
import routes from "./routes/index.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "API de almuerzos en funcionamiento.",
    health: "/api/health",
    api: "/api/v1",
    documentation: "Consulta README.md para ver los endpoints y ejemplos de uso.",
  });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, status: "healthy" });
});

app.use("/api/v1", routes);
app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
