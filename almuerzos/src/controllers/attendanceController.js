import {
  confirmAttendance,
  getMenuConfirmations,
  getMyConfirmations,
} from "../services/attendanceService.js";

export const confirm = async (req, res) => {
  const confirmation = await confirmAttendance(req.params.menuId, req.user._id, req.body);
  return res.json({
    ok: true,
    message: "Asistencia al almuerzo confirmada.",
    confirmation,
  });
};

export const mine = async (req, res) => {
  const confirmations = await getMyConfirmations(req.user._id);
  return res.json({ ok: true, total: confirmations.length, confirmations });
};

export const byMenu = async (req, res) => {
  const result = await getMenuConfirmations(req.params.menuId);
  return res.json({ ok: true, ...result });
};

export default { byMenu, confirm, mine };
