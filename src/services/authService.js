import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import appError from "../utils/appError.js";

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

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
export const registerStudent = async ({ name, email, password }) => {
  const normalizedEmail = normalizeEmail(email);

  if (!name?.trim() || !normalizedEmail || !password) {
    throw appError("Nombre, correo y contrasena son obligatorios.", 400);
  }

  if (String(password).length < 6) {
    throw appError("La contrasena debe tener al menos 6 caracteres.", 400);
  }

  const exists = await User.exists({ email: normalizedEmail });
  if (exists) {
    throw appError("Ya existe una cuenta con este correo.", 409);
  }

  return User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: await bcrypt.hash(password, 12),
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

export default { createToken, getCurrentUser, loginUser, registerStudent, sanitizeUser };
