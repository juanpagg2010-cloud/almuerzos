import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { errorHandler, notFound } from "./middlewares/errorMiddleware.js";
import routes from "./routes/index.js";
import { getServerTime } from "./utils/time.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicPath = path.join(__dirname, "../public");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// Alias sin extension para que una recarga del navegador conserve cada vista.
app.get("/admin", (req, res) => res.sendFile(path.join(publicPath, "admin.html")));
app.get("/estudiante", (req, res) => res.sendFile(path.join(publicPath, "estudiante.html")));
app.get("/registro", (req, res) => res.sendFile(path.join(publicPath, "registro.html")));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, status: "healthy" });
});

// Public server clock used by the UI. Database timestamps are always UTC.
app.get("/api/time", (req, res) => {
  res.json({ ok: true, serverTime: getServerTime() });
});

app.use("/api/v1", routes);
app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
