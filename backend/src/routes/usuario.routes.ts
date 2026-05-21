import { Router } from "express";
import { listarUsuarios } from "../controllers/usuario.controller";

const router = Router();

router.get("/", listarUsuarios);

export default router;