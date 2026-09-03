import AttendanceConfirmation from "../models/attendanceConfirmationModel.js";
import Menu from "../models/menuModel.js";
import appError from "../utils/appError.js";
import { isMenuOpenForConfirmation } from "./menuService.js";

const parseAttendance = (value) => {
  if (typeof value !== "boolean") {
    throw appError("El campo asistira debe ser true o false.", 400);
  }
  return value;
};

export const confirmAttendance = async (menuId, studentId, { asistira, observacion = "" }) => {
  const menu = await Menu.findById(menuId);
  if (!menu) throw appError("Menu no encontrado.", 404);

  if (!isMenuOpenForConfirmation(menu)) {
    throw appError("Este menu ya no esta disponible para confirmacion.", 409);
  }

  const confirmation = await AttendanceConfirmation.findOneAndUpdate(
    { menuId, estudianteId: studentId },
    {
      $set: {
        asistira: parseAttendance(asistira),
        observacion: String(observacion || "").trim(),
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).populate("menuId");

  return confirmation;
};

export const getMyConfirmations = (studentId) => AttendanceConfirmation.find({ estudianteId: studentId })
  .populate("menuId")
  .sort({ updatedAt: -1 });

export const getMenuConfirmations = async (menuId) => {
  const menu = await Menu.findById(menuId);
  if (!menu) throw appError("Menu no encontrado.", 404);

  const confirmations = await AttendanceConfirmation.find({ menuId })
    .populate("estudianteId", "name grado grupo")
    .sort({ updatedAt: -1 });

  const confirmed = confirmations.filter((confirmation) => confirmation.asistira).length;

  return {
    menu,
    total: confirmations.length,
    asistiran: confirmed,
    noAsistiran: confirmations.length - confirmed,
    confirmations,
  };
};

export default { confirmAttendance, getMenuConfirmations, getMyConfirmations };
