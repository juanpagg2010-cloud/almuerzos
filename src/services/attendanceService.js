import AttendanceConfirmation from "../models/attendanceConfirmationModel.js";
import Menu from "../models/menuModel.js";
import User from "../models/userModel.js";
import appError from "../utils/appError.js";
import { isMenuOpenForConfirmation } from "./menuService.js";
import { APP_TIME_ZONE } from "../utils/time.js";

const parseAttendance = (value) => {
  if (typeof value !== "boolean") {
    throw appError("El campo asistira debe ser true o false.", 400);
  }
  return value;
};

export const confirmAttendance = async (
  menuId,
  studentId,
  { asistira, observacion = "" },
) => {
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

export const getMyConfirmations = (studentId) =>
  AttendanceConfirmation.find({ estudianteId: studentId })
    .populate("menuId")
    .sort({ updatedAt: -1 });

export const getMenuConfirmations = async (menuId) => {
  const menu = await Menu.findById(menuId);
  if (!menu) throw appError("Menu no encontrado.", 404);

  const confirmations = await AttendanceConfirmation.find({ menuId })
    .populate("estudianteId", "name grado grupo")
    .sort({ updatedAt: -1 });

  const confirmed = confirmations.filter(
    (confirmation) => confirmation.asistira,
  ).length;

  return {
    menu,
    total: confirmations.length,
    asistiran: confirmed,
    noAsistiran: confirmations.length - confirmed,
    confirmations,
  };
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const getDateValue = (date) => {
  const parts = Object.fromEntries(
    dateFormatter.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const displayDate = new Intl.DateTimeFormat("es-CO", {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const displayTime = new Intl.DateTimeFormat("es-CO", {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const normalizeRubricFilters = ({
  grado,
  grupo,
  fecha,
  orden = "desc",
} = {}) => {
  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha))
    throw appError("La fecha debe usar el formato YYYY-MM-DD.", 400);
  const normalizedGrade =
    grado === undefined || grado === "" ? null : Number(grado);
  const normalizedGroup =
    grupo === undefined || grupo === "" ? null : Number(grupo);
  if (
    normalizedGrade !== null &&
    (!Number.isInteger(normalizedGrade) ||
      normalizedGrade < 1 ||
      normalizedGrade > 11)
  )
    throw appError("El grado debe estar entre 1 y 11.", 400);
  if (
    normalizedGroup !== null &&
    (!Number.isInteger(normalizedGroup) ||
      normalizedGroup < 1 ||
      normalizedGroup > 8)
  )
    throw appError("El grupo debe estar entre 1 y 8.", 400);
  if (!["asc", "desc"].includes(orden))
    throw appError("El orden debe ser asc o desc.", 400);
  return { grado: normalizedGrade, grupo: normalizedGroup, fecha, orden };
};

const buildSummary = (records) => {
  const byGrade = {};
  const byGroup = {};
  records.forEach((record) => {
    const grade = `${record.grado}°`;
    const group = `${record.grado}° Grupo ${record.grupo}`;
    byGrade[grade] = (byGrade[grade] || 0) + 1;
    byGroup[group] = (byGroup[group] || 0) + 1;
  });
  return { byGrade, byGroup };
};

const METRICS_PERIODS = {
  day: "del día",
  week: "de esta semana",
  month: "de este mes",
  year: "de este año",
  six_months: "de los últimos 6 meses",
};

const dateValueFromUtc = (date) => date.toISOString().slice(0, 10);

const getMetricsRange = (period = "day") => {
  if (!Object.hasOwn(METRICS_PERIODS, period)) {
    throw appError("El período de métricas no es válido.", 400);
  }

  const endDate = getDateValue(new Date());
  const [year, month, day] = endDate.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));

  if (period === "week") start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  if (period === "month") start.setUTCDate(1);
  if (period === "year") start.setUTCMonth(0, 1);
  if (period === "six_months") {
    start.setUTCDate(1);
    start.setUTCMonth(start.getUTCMonth() - 5);
    const daysInMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
    start.setUTCDate(Math.min(day, daysInMonth));
  }

  return { period, periodLabel: METRICS_PERIODS[period], startDate: dateValueFromUtc(start), endDate };
};

// This reads the original attendance documents. updatedAt is written by
// MongoDB/Mongoose at the exact server-side moment a student confirms or updates
// their response; clients never send or control this value.
export const getAttendanceRubric = async (query = {}) => {
  const filters = normalizeRubricFilters(query);
  const confirmations = await AttendanceConfirmation.find()
    .populate("estudianteId", "name grado grupo")
    .populate("menuId", "fecha platoPrincipal")
    .lean();

  const records = confirmations
    .filter((confirmation) => confirmation.estudianteId)
    .map((confirmation) => ({
      id: String(confirmation._id),
      studentId: String(confirmation.estudianteId._id),
      nombre: confirmation.estudianteId.name,
      grado: confirmation.estudianteId.grado,
      grupo: confirmation.estudianteId.grupo,
      menu: confirmation.menuId?.platoPrincipal || "Menú eliminado",
      fechaAlmuerzo: confirmation.menuId?.fecha || null,
      confirmedAt: confirmation.updatedAt,
      fechaConfirmacion: displayDate.format(confirmation.updatedAt),
      horaConfirmacion: displayTime.format(confirmation.updatedAt),
      estado: confirmation.asistira ? "Confirmado" : "No asistirá",
      asistira: confirmation.asistira,
    }))
    .filter(
      (record) => filters.grado === null || record.grado === filters.grado,
    )
    .filter(
      (record) => filters.grupo === null || record.grupo === filters.grupo,
    )
    .filter(
      (record) =>
        !filters.fecha || getDateValue(record.confirmedAt) === filters.fecha,
    )
    .sort(
      (first, second) =>
        (filters.orden === "asc" ? 1 : -1) *
        (new Date(first.confirmedAt) - new Date(second.confirmedAt)),
    );

  const summary = buildSummary(records);
  return {
    records,
    filters,
    totalRegistros: records.length,
    totalAsistentes: records.filter((record) => record.asistira).length,
    totalNoAsistentes: records.filter((record) => !record.asistira).length,
    ...summary,
  };
};

// Dashboard metrics deliberately use the same confirmation documents as the
// attendance rubric. The range is calculated on the server in the app time
// zone, so a device's clock cannot move a record to another period.
export const getMetrics = async (period) => {
  const range = getMetricsRange(period);
  const isInRange = (date) => {
    const dateValue = getDateValue(date);
    return dateValue >= range.startDate && dateValue <= range.endDate;
  };
  const [confirmations, students] = await Promise.all([
    AttendanceConfirmation.find()
      .populate("estudianteId", "name grado grupo")
      .populate("menuId", "fecha platoPrincipal")
      .lean(),
    User.find({ role: "Estudiante" })
      .select("grado grupo isActive createdAt")
      .lean(),
  ]);

  const records = confirmations
    .filter(
      (confirmation) =>
        confirmation.estudianteId &&
        isInRange(confirmation.updatedAt),
    )
    .map((confirmation) => ({
      id: String(confirmation._id),
      studentId: String(confirmation.estudianteId._id),
      nombre: confirmation.estudianteId.name,
      grado: confirmation.estudianteId.grado,
      grupo: confirmation.estudianteId.grupo,
      menu: confirmation.menuId?.platoPrincipal || "Menú eliminado",
      fechaAlmuerzo: confirmation.menuId?.fecha || null,
      confirmedAt: confirmation.updatedAt,
      fechaConfirmacion: displayDate.format(confirmation.updatedAt),
      horaConfirmacion: displayTime.format(confirmation.updatedAt),
      estado: confirmation.asistira ? "Confirmado" : "No asistirá",
      asistira: confirmation.asistira,
    }))
    .sort(
      (first, second) =>
        new Date(second.confirmedAt) - new Date(first.confirmedAt),
    );

  const activeStudents = students.filter((student) => student.isActive);
  const studentResponses = new Set(records.map((record) => record.studentId));
  const totalStudents = activeStudents.length;
  const totalWithResponse = studentResponses.size;
  const totalNewStudents = students.filter((student) => isInRange(student.createdAt)).length;
  const summary = buildSummary(records);

  return {
    ...range,
    generatedAt: new Date().toISOString(),
    totalEstudiantesRegistradosPeriodo: totalNewStudents,
    totalEstudiantesActivos: totalStudents,
    totalRegistrosDia: records.length,
    totalEstudiantesConRespuesta: totalWithResponse,
    totalAlmuerzosConfirmados: records.filter((record) => record.asistira)
      .length,
    totalEstudiantesSinConfirmar: Math.max(
      0,
      totalStudents - totalWithResponse,
    ),
    porcentajeConfirmacion: totalStudents
      ? Number(((totalWithResponse / totalStudents) * 100).toFixed(1))
      : 0,
    records,
    ...summary,
  };
};

// Kept for existing consumers of the original daily endpoint.
export const getTodayMetrics = () => getMetrics("day");

export default {
  confirmAttendance,
  getAttendanceRubric,
  getMenuConfirmations,
  getMyConfirmations,
  getMetrics,
  getTodayMetrics,
};
