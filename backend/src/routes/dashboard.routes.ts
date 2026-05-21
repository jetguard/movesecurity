import { Router } from "express";
import { dashboard } from "../controllers/dashboard.controller";

const router = Router();

router.get("/", dashboard);

export default router;