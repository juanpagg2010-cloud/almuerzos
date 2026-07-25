import Menu from "../models/menuModel.js";
import AttendanceConfirmation from "../models/attendanceConfirmationModel.js";
import appError from "../utils/appError.js";

const normalizeDate = (value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw appError("La fecha del menu no es valida. Usa el formato YYYY-MM-DD.", 400);
  }

  return date;
};

const pickMenuFields = (payload) => {
  const allowedFields = ["platoPrincipal", "acompanamiento", "bebida", "postre", "descripcion", "estado"];
  const fields = {};

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) fields[field] = payload[field];
  });

  if (fields.estado && !["Publicado", "Cerrado"].includes(fields.estado)) {
    throw appError("El estado debe ser Publicado o Cerrado.", 400);
  }

  return fields;
};

export const createMenu = async (payload, adminId) => {
  const { fecha, platoPrincipal } = payload;

  if (!fecha || !platoPrincipal?.trim()) {
    throw appError("La fecha y el plato principal son obligatorios.", 400);
  }

  const menuDate = normalizeDate(fecha);
  const alreadyExists = await Menu.exists({ fecha: menuDate });
  if (alreadyExists) {
    throw appError("Ya existe un menu para esa fecha.", 409);
  }

  return Menu.create({
    ...pickMenuFields(payload),
    fecha: menuDate,
    platoPrincipal: platoPrincipal.trim(),
    creadoPor: adminId,
  });
};

export const listMenus = async ({ desde, hasta, estado } = {}, role) => {
  const filters = {};

  if (role !== "Admin") filters.estado = "Publicado";
  else if (estado) {
    if (!["Publicado", "Cerrado"].includes(estado)) {
      throw appError("El estado debe ser Publicado o Cerrado.", 400);
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

  return Menu.find(filters).sort({ fecha: 1 });
};

export const getMenuById = async (id, role) => {
  const filters = { _id: id };
  if (role !== "Admin") filters.estado = "Publicado";

  const menu = await Menu.findOne(filters);
  if (!menu) throw appError("Menu no encontrado.", 404);
  return menu;
};

export const updateMenu = async (id, payload) => {
  const updates = pickMenuFields(payload);

  if (payload.fecha !== undefined) updates.fecha = normalizeDate(payload.fecha);
  if (updates.platoPrincipal !== undefined) {
    if (!updates.platoPrincipal?.trim()) throw appError("El plato principal no puede quedar vacio.", 400);
    updates.platoPrincipal = updates.platoPrincipal.trim();
  }

  if (!Object.keys(updates).length) {
    throw appError("No enviaste campos validos para actualizar.", 400);
  }

  const menu = await Menu.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  if (!menu) throw appError("Menu no encontrado.", 404);
  return menu;
};

export const deleteMenu = async (id) => {
  const menu = await Menu.findByIdAndDelete(id);
  if (!menu) throw appError("Menu no encontrado.", 404);

  // Evita dejar confirmaciones sin menu cuando coordinacion elimina una fecha.
  await AttendanceConfirmation.deleteMany({ menuId: menu._id });

  return menu;
};

export const isMenuOpenForConfirmation = (menu) => {
  const endOfMenuDay = new Date(menu.fecha);
  endOfMenuDay.setUTCHours(23, 59, 59, 999);
  return menu.estado === "Publicado" && Date.now() <= endOfMenuDay.getTime();
};

export default { createMenu, deleteMenu, getMenuById, isMenuOpenForConfirmation, listMenus, updateMenu };
