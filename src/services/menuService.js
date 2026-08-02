import Menu from "../models/menuModel.js";
import AttendanceConfirmation from "../models/attendanceConfirmationModel.js";
import appError from "../utils/appError.js";

const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

const normalizeDate = (value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw appError("La fecha del menú no es válida. Usa el formato YYYY-MM-DD.", 400);
  }
  return date;
};

const pickMenuFields = (payload) => {
  const allowedFields = ["platoPrincipal", "acompanamiento", "bebida", "descripcion", "estado", "diaSemana"];
  const fields = {};
  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) fields[field] = payload[field];
  });

  if (fields.estado && !["Borrador", "Publicado", "Cerrado"].includes(fields.estado)) {
    throw appError("El estado debe ser Borrador, Publicado o Cerrado.", 400);
  }
  if (fields.diaSemana !== undefined && !WEEKDAYS.includes(fields.diaSemana) && fields.diaSemana !== "") {
    throw appError("El día debe estar entre lunes y viernes.", 400);
  }
  return fields;
};

const validateWeeklyPublication = async (menuId, diaSemana) => {
  if (!WEEKDAYS.includes(diaSemana)) {
    throw appError("Selecciona un día de lunes a viernes para publicar el menú.", 400);
  }
  const sameDay = await Menu.findOne({ _id: { $ne: menuId }, estado: "Publicado", diaSemana });
  if (sameDay) {
    throw appError(`Ya hay un menú publicado para ${diaSemana}. Retíralo o cámbiale el día primero.`, 409);
  }
  const publishedCount = await Menu.countDocuments({ _id: { $ne: menuId }, estado: "Publicado" });
  if (publishedCount >= 5) {
    throw appError("Ya hay cinco menús en la vista semanal. Retira uno antes de publicar otro.", 409);
  }
};

export const createMenu = async (payload, adminId) => {
  const { platoPrincipal } = payload;
  if (!platoPrincipal?.trim()) throw appError("El plato principal es obligatorio.", 400);

  const fields = pickMenuFields(payload);
  const fecha = payload.fecha === undefined ? new Date() : normalizeDate(payload.fecha);
  if (fields.estado === "Publicado") await validateWeeklyPublication(null, fields.diaSemana);
  if (fields.estado !== "Publicado") fields.diaSemana = "";

  return Menu.create({ ...fields, fecha, platoPrincipal: platoPrincipal.trim(), creadoPor: adminId });
};

export const listMenus = async ({ desde, hasta, estado } = {}, role) => {
  const filters = {};
  if (role !== "Admin") filters.estado = "Publicado";
  else if (estado) {
    if (!["Borrador", "Publicado", "Cerrado"].includes(estado)) {
      throw appError("El estado debe ser Borrador, Publicado o Cerrado.", 400);
    }
    filters.estado = estado;
  }
  if (desde || hasta) {
    filters.fecha = {};
    if (desde) filters.fecha.$gte = normalizeDate(desde);
    if (hasta) filters.fecha.$lte = normalizeDate(hasta);
    if (filters.fecha.$gte && filters.fecha.$lte && filters.fecha.$gte > filters.fecha.$lte) {
      throw appError("La fecha inicial no puede ser posterior a la fecha final.", 400);
    }
  }
  return Menu.find(filters).sort(role === "Admin" ? { createdAt: -1 } : { diaSemana: 1, fecha: 1 });
};

export const getMenuById = async (id, role) => {
  const filters = { _id: id };
  if (role !== "Admin") filters.estado = "Publicado";
  const menu = await Menu.findOne(filters);
  if (!menu) throw appError("Menú no encontrado.", 404);
  return menu;
};

export const updateMenu = async (id, payload) => {
  const updates = pickMenuFields(payload);
  if (payload.fecha !== undefined) updates.fecha = normalizeDate(payload.fecha);
  if (updates.platoPrincipal !== undefined) {
    if (!updates.platoPrincipal?.trim()) throw appError("El plato principal no puede quedar vacío.", 400);
    updates.platoPrincipal = updates.platoPrincipal.trim();
  }
  if (!Object.keys(updates).length) throw appError("No enviaste campos válidos para actualizar.", 400);

  const existingMenu = await Menu.findById(id);
  if (!existingMenu) throw appError("Menú no encontrado.", 404);
  const resultingStatus = updates.estado ?? existingMenu.estado;
  const resultingDay = updates.diaSemana ?? existingMenu.diaSemana;
  const isPublishing = resultingStatus === "Publicado";
  const wasPublished = existingMenu.estado === "Publicado";

  if (isPublishing && (!wasPublished || updates.diaSemana !== undefined)) {
    await validateWeeklyPublication(id, resultingDay);
  }
  if (!isPublishing) updates.diaSemana = "";

  return Menu.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
};

export const addMenuImages = async (id, files) => {
  if (!files?.length) throw appError("Selecciona al menos una imagen.", 400);
  const imagePaths = files.map((file) => `/uploads/menus/${file.filename}`);
  const menu = await Menu.findByIdAndUpdate(id, { $push: { imagenes: { $each: imagePaths } } }, { new: true });
  if (!menu) throw appError("Menú no encontrado.", 404);
  return menu;
};

export const deleteMenu = async (id) => {
  const menu = await Menu.findByIdAndDelete(id);
  if (!menu) throw appError("Menú no encontrado.", 404);
  await AttendanceConfirmation.deleteMany({ menuId: menu._id });
  return menu;
};

export const isMenuOpenForConfirmation = (menu) => {
  const endOfMenuDay = new Date(menu.fecha);
  endOfMenuDay.setUTCHours(23, 59, 59, 999);
  return menu.estado === "Publicado" && Date.now() <= endOfMenuDay.getTime();
};

export default { addMenuImages, createMenu, deleteMenu, getMenuById, isMenuOpenForConfirmation, listMenus, updateMenu };
