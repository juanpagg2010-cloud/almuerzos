import { Router } from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import validateObjectId from "../middlewares/validateObjectId.js";
import * as attendanceService from "../services/attendanceService.js";

const router = Router();
const ADMIN = "Admin";
const STUDENT = "Estudiante";

router.use(protect);

// Consulta las confirmaciones del estudiante que inicio sesion.
router.get("/me", authorizeRoles(STUDENT), async (req, res) => {
  try {
    const confirmations = await attendanceService.getMyConfirmations(req.user._id);
    return res.status(200).json({
      ok: true,
      total: confirmations.length,
      confirmations,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      message: error.message || "No se pudieron consultar tus confirmaciones.",
    });
  }
});

// Crea o actualiza la respuesta del estudiante para un menu.
router.put("/menus/:menuId", authorizeRoles(STUDENT), validateObjectId("menuId"), async (req, res) => {
  try {
    const confirmation = await attendanceService.confirmAttendance(
      req.params.menuId,
      req.user._id,
      req.body,
    );

    return res.status(200).json({
      ok: true,
      message: "Asistencia al almuerzo confirmada.",
      confirmation,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "No se pudo confirmar la asistencia.",
    });
  }
});

// Muestra al administrador quienes confirmaron para un menu y los totales.
router.get("/menus/:menuId", authorizeRoles(ADMIN), validateObjectId("menuId"), async (req, res) => {
  try {
    const result = await attendanceService.getMenuConfirmations(req.params.menuId);
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      message: error.message || "No se pudieron consultar las confirmaciones.",
    });
  }
});

export default router;
