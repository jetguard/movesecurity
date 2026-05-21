import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function register(req: Request, res: Response) {
  try {
    const { nome, email, senha } = req.body;

    const usuarioExiste = await prisma.usuario.findUnique({
      where: {
        email,
      },
    });

    if (usuarioExiste) {
      return res.status(400).json({
        error: "Usuário já existe",
      });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: senhaHash,
      },
    });

    return res.json(usuario);

  } catch (error) {
    return res.status(500).json({
      error: "Erro ao cadastrar usuário",
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, senha } = req.body;

    const usuario = await prisma.usuario.findUnique({
      where: {
        email,
      },
    });

    if (!usuario) {
      return res.status(400).json({
        error: "Usuário não encontrado",
      });
    }

    const senhaCorreta = await bcrypt.compare(
      senha,
      usuario.senha
    );

    if (!senhaCorreta) {
      return res.status(400).json({
        error: "Senha inválida",
      });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
      },
      "jetguard_secret",
      {
        expiresIn: "7d",
      }
    );

    return res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
      },
    });

  } catch (error) {
    return res.status(500).json({
      error: "Erro ao fazer login",
    });
  }
}