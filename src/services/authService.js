import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import appError from "../utils/appError.js";

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const normalizeName = (name) => String(name || "").trim().replace(/\s+/g, " ");

const validateName = (name) => {
  const normalizedName = normalizeName(name);
  if (normalizedName.length < 2 || normalizedName.length > 120) {
    throw appError("El nombre debe tener entre 2 y 120 caracteres.", 400);
  }
  return normalizedName;
};

const validateGrade = (grado) => {
  const normalizedGrade = Number(grado);
  if (!Number.isInteger(normalizedGrade) || normalizedGrade < 1 || normalizedGrade > 11) {
    throw appError("El grado debe estar entre 1 y 11.", 400);
  }
  return normalizedGrade;
};

export const sanitizeUser = (user) => {
  const data = user.toObject ? user.toObject() : { ...user };
  delete data.password;
  return data;
};

export const createToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw appError("JWT_SECRET no esta configurado.", 500);
  }

  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
  );
};

// El registro abierto crea solamente estudiantes; los administradores se crean con el seed.
export const registerStudent = async ({ name, email, grado, grupo, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = validateName(name);
  const normalizedGrade = validateGrade(grado);
  const normalizedGroup = Number(grupo);

  if (!normalizedEmail || !grado || !grupo || !password) {
    throw appError("Nombre, correo y contrasena son obligatorios; tambien debes indicar grado y grupo. Ingresa tu nombre completo.", 400);
  }

  if (!Number.isInteger(normalizedGroup) || normalizedGroup < 1 || normalizedGroup > 8) {
    throw appError("El grupo debe estar entre 1 y 8.", 400);
  }

  if (String(password).length < 6) {
    throw appError("La contrasena debe tener al menos 6 caracteres.", 400);
  }

  const exists = await User.exists({ email: normalizedEmail });
  if (exists) {
    throw appError("Ya existe una cuenta con este correo.", 409);
  }

  return User.create({
    name: normalizedName,
    email: normalizedEmail,
    password: await bcrypt.hash(password, 12),
    grado: normalizedGrade,
    grupo: normalizedGroup,
    role: "Estudiante",
  });
};

export const loginUser = async ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    throw appError("Correo y contrasena son obligatorios.", 400);
  }

  const user = await User.findOne({ email: normalizedEmail }).select("+password");
  const passwordMatches = user && await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    throw appError("Correo o contrasena incorrectos.", 401);
  }

  if (!user.isActive) {
    throw appError("Esta cuenta se encuentra desactivada.", 403);
  }

  return user;
};

export const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw appError("Usuario no encontrado.", 404);
  return user;
};

// Los administradores pueden crear cuentas de ambos roles desde el portal interno.
export const createUserByAdmin = async ({ name, email, grado, grupo, password, role }) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = validateName(name);
  const selectedRole = String(role || "").trim();
  const normalizedGrade = grado === undefined || grado === "" ? undefined : Number(grado);
  const normalizedGroup = grupo === undefined || grupo === "" ? undefined : Number(grupo);

  if (!normalizedEmail || !password || !selectedRole) {
    throw appError("Nombre, correo, contrasena y rol son obligatorios.", 400);
  }
  if (!["Admin", "Estudiante"].includes(selectedRole)) throw appError("El rol seleccionado no es valido.", 400);
  if (String(password).length < 6) throw appError("La contrasena debe tener al menos 6 caracteres.", 400);

  if (selectedRole === "Estudiante") {
    validateGrade(normalizedGrade);
    if (!Number.isInteger(normalizedGroup) || normalizedGroup < 1 || normalizedGroup > 8) throw appError("El grupo debe estar entre 1 y 8.", 400);
  }

  const exists = await User.exists({ email: normalizedEmail });
  if (exists) throw appError("Ya existe una cuenta con este correo.", 409);

  return User.create({
    name: normalizedName, email: normalizedEmail, password: await bcrypt.hash(password, 12), role: selectedRole,
    ...(selectedRole === "Estudiante" ? { grado: normalizedGrade, grupo: normalizedGroup } : {}),
  });
};

export const updateOwnStudentProfile = async (userId, payload) => {
  const invalidFields = Object.keys(payload).filter((field) => field !== "name");
  if (invalidFields.length) {
    throw appError("Solo puedes modificar tu nombre.", 403);
  }
  if (!Object.hasOwn(payload, "name")) throw appError("Debes enviar el nombre a actualizar.", 400);

  const user = await User.findOneAndUpdate(
    { _id: userId, role: "Estudiante" },
    { name: validateName(payload.name) },
    { new: true, runValidators: true },
  );
  if (!user) throw appError("Estudiante no encontrado.", 404);
  return user;
};

export const updateStudentByAdmin = async (studentId, payload) => {
  const allowedFields = ["name", "grado"];
  const invalidFields = Object.keys(payload).filter((field) => !allowedFields.includes(field));
  if (invalidFields.length) throw appError("Solo se pueden modificar el nombre y el grado del estudiante.", 400);
  if (!Object.keys(payload).length) throw appError("Debes enviar datos para actualizar.", 400);

  const updates = {};
  if (Object.hasOwn(payload, "name")) updates.name = validateName(payload.name);
  if (Object.hasOwn(payload, "grado")) updates.grado = validateGrade(payload.grado);

  const student = await User.findOneAndUpdate(
    { _id: studentId, role: "Estudiante" },
    updates,
    { new: true, runValidators: true },
  );
  if (!student) throw appError("Estudiante no encontrado.", 404);
  return student;
};

export const listStudents = async ({ page = 1, limit = 10, search = "" } = {}) => {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));
  const filter = { role: "Estudiante" };

  if (String(search).trim()) {
    const query = String(search).trim();
    filter.$or = [
      { name: { $regex: query, $options: "i" } },
      { email: { $regex: query, $options: "i" } },
    ];
  }

  const [students, total] = await Promise.all([
    User.find(filter).select("name email grado grupo role isActive createdAt").sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit).limit(safeLimit),
    User.countDocuments(filter),
  ]);

  return { students, total, page: safePage, limit: safeLimit, pages: Math.max(1, Math.ceil(total / safeLimit)) };
};

export const listUsers = async ({ page = 1, limit = 10, search = "" } = {}) => {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));
  const filter = {};
  if (String(search).trim()) {
    const query = String(search).trim();
    filter.$or = [{ name: { $regex: query, $options: "i" } }, { email: { $regex: query, $options: "i" } }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).select("name email grado grupo role isActive createdAt").sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit),
    User.countDocuments(filter),
  ]);
  return { users, total, page: safePage, limit: safeLimit, pages: Math.max(1, Math.ceil(total / safeLimit)) };
};

export default { createToken, createUserByAdmin, getCurrentUser, listStudents, listUsers, loginUser, registerStudent, sanitizeUser, updateOwnStudentProfile, updateStudentByAdmin };
