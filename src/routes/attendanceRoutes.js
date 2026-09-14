import { Router } from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import validateObjectId from "../middlewares/validateObjectId.js";
import * as attendanceService from "../services/attendanceService.js";

const router = Router();
const ADMIN = "Admin";
const STUDENT = "Estudiante";

const escapeCsv = (value) => {
  const text = String(value ?? "");
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
};

router.use(protect);

// Administrative report built directly from attendance confirmations. It is
// declared before parameterized routes so /rubric is never treated as an id.
router.get("/rubric", authorizeRoles(ADMIN), async (req, res) => {
  try {
    const report = await attendanceService.getAttendanceRubric(req.query);
    return res.status(200).json({ ok: true, ...report });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ ok: false, message: error.message || "No se pudo generar la rúbrica." });
  }
});

router.get("/rubric.csv", authorizeRoles(ADMIN), async (req, res) => {
  try {
    const report = await attendanceService.getAttendanceRubric(req.query);
    const headers = ["#", "Nombre completo", "Grado", "Grupo", "Fecha", "Hora de confirmación", "Estado", "Menú"];
    const rows = report.records.map((record, index) => [index + 1, record.nombre, `${record.grado}°`, `Grupo ${record.grupo}`, record.fechaConfirmacion, record.horaConfirmacion, record.estado, record.menu]);
    const summary = [
      [],
      ["TOTAL DE ESTUDIANTES REGISTRADOS", report.totalRegistros],
      ["TOTAL DE ASISTENTES", report.totalAsistentes],
      [],
      ["POR GRADO"],
      ...Object.entries(report.byGrade),
      [],
      ["POR GRUPO"],
      ...Object.entries(report.byGroup),
    ];
    const csv = [headers, ...rows, ...summary].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="rubrica-asistencia.csv"',
      "Cache-Control": "no-store",
    });
    return res.status(200).send(`\uFEFF${csv}`);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ ok: false, message: error.message || "No se pudo descargar la rúbrica." });
  }
});

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
