import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export const protect = async (req, res, next) => {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ ok: false, message: "Token de autenticacion requerido." });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ ok: false, message: "JWT_SECRET no esta configurado." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({ ok: false, message: "Sesion invalida o usuario desactivado." });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ ok: false, message: "Token invalido o expirado." });
  }
};

export default protect;
