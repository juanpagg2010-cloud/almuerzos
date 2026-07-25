import { Router } from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  createToken,
  getCurrentUser,
  loginUser,
  registerStudent,
  sanitizeUser,
} from "../services/authService.js";

const router = Router();
const getUserId = (user) => user?._id || user?.id;

const sendAuthResponse = (res, statusCode, user) => res.status(statusCode).json({
  ok: true,
  token: createToken(user),
  user: sanitizeUser(user),
});

// El registro publico siempre crea cuentas de estudiantes.
router.post("/register", async (req, res) => {
  try {
    const user = await registerStudent(req.body);
    return sendAuthResponse(res, 201, user);
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "No se pudo registrar el estudiante.",
    });
  }
});

// Inicia sesion para administradores o estudiantes.
router.post("/login", async (req, res) => {
  try {
    const user = await loginUser(req.body);
    return sendAuthResponse(res, 200, user);
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "No se pudo iniciar sesion.",
    });
  }
});

// Consulta los datos de la cuenta autenticada.
router.get("/me", protect, async (req, res) => {
  try {
    const user = await getCurrentUser(getUserId(req.user));
    return res.status(200).json({ ok: true, user: sanitizeUser(user) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      message: error.message || "No se pudo consultar el perfil.",
    });
  }
});

export default router;
