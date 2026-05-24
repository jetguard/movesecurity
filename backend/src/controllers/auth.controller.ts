import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { jwtSecret } from "../config/security";

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

    await prisma.logAuditoria.create({
      data: {
        usuarioId: usuario.id,
        usuarioNome: usuario.nome,
        ip: req.ip,
        acao: "Criação de usuário",
        tipoRegistro: "Usuario",
        registroId: usuario.id,
        dadosNovos: JSON.stringify({
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
        }),
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

    if (usuario.statusUsuario !== "ATIVO") {
      return res.status(403).json({
        error: "Usuário bloqueado ou inativo",
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
      jwtSecret(),
      {
        expiresIn: "7d",
      }
    );

    const agora = new Date();
    await prisma.usuario.update({
      where: {
        id: usuario.id,
      },
      data: {
        ultimoAcesso: agora,
      },
    });

    await prisma.logAuditoria.create({
      data: {
        usuarioId: usuario.id,
        usuarioNome: usuario.nome,
        ip: req.ip,
        acao: "Acesso ao sistema",
        tipoRegistro: "Auth",
        registroId: usuario.id,
        dadosNovos: JSON.stringify({
          email: usuario.email,
          acessoEm: agora.toISOString(),
        }),
      },
    });

    return res.json({
      token,
      usuario: {
          id: usuario.id,
          nome: usuario.nome,
          apelido: usuario.apelido,
          fotoPerfil: usuario.fotoPerfil,
          email: usuario.email,
          perfilAcesso: usuario.perfilAcesso,
          unidade: usuario.unidade,
        },
    });

  } catch (error) {
    return res.status(500).json({
      error: "Erro ao fazer login",
    });
  }
}

