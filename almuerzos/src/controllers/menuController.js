import {
  createMenu,
  deleteMenu,
  getMenuById,
  listMenus,
  updateMenu,
} from "../services/menuService.js";

export const create = async (req, res) => {
  const menu = await createMenu(req.body, req.user._id);
  return res.status(201).json({ ok: true, menu });
};

export const list = async (req, res) => {
  const menus = await listMenus(req.query, req.user.role);
  return res.json({ ok: true, total: menus.length, menus });
};

export const getById = async (req, res) => {
  const menu = await getMenuById(req.params.id, req.user.role);
  return res.json({ ok: true, menu });
};

export const update = async (req, res) => {
  const menu = await updateMenu(req.params.id, req.body);
  return res.json({ ok: true, menu });
};

export const remove = async (req, res) => {
  const menu = await deleteMenu(req.params.id);
  return res.json({ ok: true, message: "Menu eliminado.", menu });
};

export default { create, getById, list, remove, update };
