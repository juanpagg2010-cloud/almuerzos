import { Router } from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  createToken,
  createUserByAdmin,
  getCurrentUser,
  loginUser,
  listStudents,
  listUsers,
  registerStudent,
  sanitizeUser,
  updateOwnStudentProfile,
  updateStudentByAdmin,
} from "../services/authService.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import validateObjectId from "../middlewares/validateObjectId.js";

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

// A student can update only their own name. The service rejects manual
// attempts to alter grade, role, permissions, or another account.
router.patch("/me", protect, authorizeRoles("Estudiante"), async (req, res) => {
  try {
    const user = await updateOwnStudentProfile(getUserId(req.user), req.body);
    return res.status(200).json({ ok: true, message: "Perfil actualizado correctamente.", user: sanitizeUser(user) });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ ok: false, message: error.message || "No se pudo actualizar el perfil." });
  }
});

// Registro paginado para la vista administrativa.
router.get("/students", protect, authorizeRoles("Admin"), async (req, res) => {
  try {
    const result = await listStudents(req.query);
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ ok: false, message: error.message || "No se pudo consultar el registro." });
  }
});

router.post("/users", protect, authorizeRoles("Admin"), async (req, res) => {
  try {
    const user = await createUserByAdmin(req.body);
    return res.status(201).json({ ok: true, user: sanitizeUser(user) });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ ok: false, message: error.message || "No se pudo crear el usuario." });
  }
});

router.get("/users", protect, authorizeRoles("Admin"), async (req, res) => {
  try {
    const result = await listUsers(req.query);
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ ok: false, message: error.message || "No se pudo consultar los usuarios." });
  }
});

// Editing a student is intentionally separate from generic users: admin may
// change name and grade, but no student deletion endpoint exists.
router.patch("/students/:id", protect, authorizeRoles("Admin"), validateObjectId("id"), async (req, res) => {
  try {
    const user = await updateStudentByAdmin(req.params.id, req.body);
    return res.status(200).json({ ok: true, message: "Estudiante actualizado correctamente.", user: sanitizeUser(user) });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ ok: false, message: error.message || "No se pudo actualizar el estudiante." });
  }
});

router.delete("/students/:id", protect, authorizeRoles("Admin"), validateObjectId("id"), (req, res) => (
  res.status(405).json({ ok: false, message: "Los estudiantes no se pueden eliminar." })
));

export default router;
