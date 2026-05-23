import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import { AuthRequest } from "../middlewares/auth";

export async function listarUsuarios(req: Request, res: Response) {
  const usuarios = await prisma.usuario.findMany({
    select: {
      id: true,
      nome: true,
      email: true,
      apelido: true,
      fotoPerfil: true,
      re: true,
      setor: true,
      cargo: true,
      empresa: true,
      createdAt: true,
    },
  });

  return res.json(usuarios);
}

export async function buscarPerfil(req: AuthRequest, res: Response) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: {
        id: req.usuarioId,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        apelido: true,
        fotoPerfil: true,
        re: true,
        setor: true,
        cargo: true,
        empresa: true,
        createdAt: true,
      },
    });

    if (!usuario) {
      return res.status(404).json({
        error: "Usuário não encontrado",
      });
    }

    return res.json(usuario);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao buscar perfil",
    });
  }
}

export async function atualizarPerfil(req: AuthRequest, res: Response) {
  try {
    const { apelido, senha } = req.body;
    const arquivo = req.file as Express.Multer.File | undefined;

    const data: {
      apelido?: string;
      senha?: string;
      fotoPerfil?: string;
    } = {};

    if (typeof apelido === "string") {
      data.apelido = apelido.trim();
    }

    if (typeof senha === "string" && senha.trim()) {
      data.senha = await bcrypt.hash(senha, 10);
    }

    if (arquivo) {
      data.fotoPerfil = `/uploads/perfis/${arquivo.filename}`;
    }

    const usuario = await prisma.usuario.update({
      where: {
        id: req.usuarioId,
      },
      data,
      select: {
        id: true,
        nome: true,
        email: true,
        apelido: true,
        fotoPerfil: true,
        re: true,
        setor: true,
        cargo: true,
        empresa: true,
        createdAt: true,
      },
    });

    return res.json(usuario);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao atualizar perfil",
    });
  }
}
