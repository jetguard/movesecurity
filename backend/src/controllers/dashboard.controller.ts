import { Request, Response } from "express";

export function dashboard(req: Request, res: Response) {
  return res.json({
    sistema: "MoveSecurity",
    usuario: "Fernando",
    status: "online",
  });
}
