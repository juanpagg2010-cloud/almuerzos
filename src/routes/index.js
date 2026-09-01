import { Router } from "express";
import attendanceRoutes from "./attendanceRoutes.js";
import authRoutes from "./authRoutes.js";
import menuRoutes from "./menuRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/menus", menuRoutes);
router.use("/attendance", attendanceRoutes);

export default router;
