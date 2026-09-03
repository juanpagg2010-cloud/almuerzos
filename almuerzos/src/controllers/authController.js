import {
  createToken,
  getCurrentUser,
  loginUser,
  registerStudent,
  sanitizeUser,
} from "../services/authService.js";

const getUserId = (user) => user?._id || user?.id;

const sendAuthResponse = (res, statusCode, user) => res.status(statusCode).json({
  ok: true,
  token: createToken(user),
  user: sanitizeUser(user),
});

export const register = async (req, res) => {
  const user = await registerStudent(req.body);
  return sendAuthResponse(res, 201, user);
};

export const login = async (req, res) => {
  const user = await loginUser(req.body);
  return sendAuthResponse(res, 200, user);
};

export const me = async (req, res) => {
  const user = await getCurrentUser(getUserId(req.user));
  return res.json({ ok: true, user: sanitizeUser(user) });
};

export default { login, me, register };
