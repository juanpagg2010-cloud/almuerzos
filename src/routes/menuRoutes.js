import { Router } from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import validateObjectId from "../middlewares/validateObjectId.js";
import * as menuService from "../services/menuService.js";

const router = Router();
const ADMIN = "Admin";

router.use(protect);

// Lista menus: el administrador ve todos y el estudiante solo los publicados.
router.get("/", async (req, res) => {
  try {
    const menus = await menuService.listMenus(req.query, req.user.role);
    return res.status(200).json({ ok: true, total: menus.length, menus });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      message: error.message || "No se pudieron consultar los menus.",
    });
  }
});

// Crea el menu diario. Solo administracion puede publicarlo.
router.post("/", authorizeRoles(ADMIN), async (req, res) => {
  try {
    const menu = await menuService.createMenu(req.body, req.user._id);
    return res.status(201).json({ ok: true, menu });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "No se pudo crear el menu.",
    });
  }
});

// Consulta un menu puntual segun los permisos del usuario.
router.get("/:id", validateObjectId("id"), async (req, res) => {
  try {
    const menu = await menuService.getMenuById(req.params.id, req.user.role);
    return res.status(200).json({ ok: true, menu });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      message: error.message || "No se pudo consultar el menu.",
    });
  }
});

// Actualiza el contenido o estado de un menu. Solo administradores.
router.patch("/:id", authorizeRoles(ADMIN), validateObjectId("id"), async (req, res) => {
  try {
    const menu = await menuService.updateMenu(req.params.id, req.body);
    return res.status(200).json({ ok: true, menu });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "No se pudo actualizar el menu.",
    });
  }
});

// Elimina un menu y sus confirmaciones asociadas. Solo administradores.
router.delete("/:id", authorizeRoles(ADMIN), validateObjectId("id"), async (req, res) => {
  try {
    const menu = await menuService.deleteMenu(req.params.id);
    return res.status(200).json({
      ok: true,
      message: "Menu eliminado.",
      menu,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      ok: false,
      message: error.message || "No se pudo eliminar el menu.",
    });
  }
});

export default router;
