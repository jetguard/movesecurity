import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import { AuthRequest } from "../middlewares/auth";
import { registrarLog } from "../services/auditoria.service";
import {
  normalizarUnidadesPermitidas,
  serializarUnidadesPermitidas,
} from "../config/unidades";
import {
  gerarHashPin,
  validarFormatoPin,
  validarPinOperacional,
} from "../services/pinOperacional.service";

const selectUsuario = {
  id: true,
  nome: true,
  email: true,
  cpf: true,
  apelido: true,
  fotoPerfil: true,
  re: true,
  setor: true,
  cargo: true,
  empresa: true,
  equipe: true,
  unidade: true,
  unidadesPermitidas: true,
  perfilAcesso: true,
  statusUsuario: true,
  deveAlterarSenha: true,
  senhaAlteradaEm: true,
  pinOperacionalHash: true,
  pinOperacionalCriadoEm: true,
  pinOperacionalAtualizadoEm: true,
  ultimoAcesso: true,
  createdAt: true,
};

function formatarUsuario(usuario: any) {
  if (!usuario) return usuario;
  return {
    ...usuario,
    unidadesPermitidas: normalizarUnidadesPermitidas(
      usuario.unidadesPermitidas,
      usuario.unidade,
    ),
    pinOperacionalHash: undefined,
    possuiPinOperacional: Boolean(
      usuario.pinOperacionalHash ||
        usuario.pinOperacionalCriadoEm ||
        usuario.pinOperacionalAtualizadoEm,
    ),
  };
}

function normalizarPerfil(perfil: string) {
  const mapa: Record<string, string> = {
    "Super Admin": "SUPER_ADMIN",
    Administrador: "ADMINISTRADOR",
    Gestor: "GESTOR",
    Coordenador: "COORDENADOR",
    Supervisor: "SUPERVISOR",
    Analista: "ANALISTA",
    Operador: "OPERADOR",
    Portaria: "PORTARIA",
    Cadastro: "CADASTRO",
    "Técnico/Manutenção": "TECNICO_MANUTENCAO",
    "Tecnico/Manutencao": "TECNICO_MANUTENCAO",
    "Técnico Manutenção": "TECNICO_MANUTENCAO",
    "Tecnico Manutencao": "TECNICO_MANUTENCAO",
    TECNICO: "TECNICO_MANUTENCAO",
    MANUTENCAO: "TECNICO_MANUTENCAO",
    SUPER_ADMIN: "SUPER_ADMIN",
    ADMINISTRADOR: "ADMINISTRADOR",
    GESTOR: "GESTOR",
    COORDENADOR: "COORDENADOR",
    SUPERVISOR: "SUPERVISOR",
    ANALISTA: "ANALISTA",
    OPERADOR: "OPERADOR",
    PORTARIA: "PORTARIA",
    CADASTRO: "CADASTRO",
    TECNICO_MANUTENCAO: "TECNICO_MANUTENCAO",
  };

  return mapa[perfil] || perfil;
}

function validarStatus(status?: string) {
  if (!status) return "ATIVO";
  return ["ATIVO", "INATIVO", "BLOQUEADO"].includes(status) ? status : "ATIVO";
}

function validarEquipe(equipe?: string) {
  if (!equipe) return null;
  return [
    "Equipe A",
    "Equipe B",
    "Equipe C",
    "Equipe D",
    "Administrativo",
  ].includes(equipe)
    ? equipe
    : null;
}

function limparCpf(cpf: string) {
  return String(cpf || "").replace(/\D/g, "");
}

function cpfValido(cpf: string) {
  const digitos = limparCpf(cpf);
  if (!digitos) return true;
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;

  const calcularDigito = (tamanho: number) => {
    const soma = digitos
      .slice(0, tamanho)
      .split("")
      .reduce(
        (total, numero, index) =>
          total + Number(numero) * (tamanho + 1 - index),
        0,
      );
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return (
    calcularDigito(9) === Number(digitos[9]) &&
    calcularDigito(10) === Number(digitos[10])
  );
}

async function vincularTreinamentosPocSep007(usuario: {
  id: number;
  email: string;
  cpf?: string | null;
  cargo?: string | null;
  setor?: string | null;
  unidade?: string | null;
  empresa?: string | null;
}) {
  const cpf = limparCpf(usuario.cpf || "");
  await prisma.treinamentoPocSep007.updateMany({
    where: {
      usuarioId: null,
      OR: [{ email: usuario.email }, ...(cpf ? [{ cpf }] : [])],
    },
    data: {
      usuarioId: usuario.id,
      cargo: usuario.cargo,
      departamento: usuario.setor,
      unidade: usuario.unidade,
      empresa: usuario.empresa || "Movecta S/A",
    },
  });
}

async function vincularTreinamentosPocSep001(usuario: {
  id: number;
  email: string;
  cpf?: string | null;
  cargo?: string | null;
  setor?: string | null;
  unidade?: string | null;
  empresa?: string | null;
}) {
  const cpf = limparCpf(usuario.cpf || "");
  await prisma.treinamentoPocSep001.updateMany({
    where: {
      usuarioId: null,
      OR: [{ email: usuario.email }, ...(cpf ? [{ cpf }] : [])],
    },
    data: {
      usuarioId: usuario.id,
      cargo: usuario.cargo,
      departamento: usuario.setor,
      unidade: usuario.unidade,
      empresa: usuario.empresa || "Movecta S/A",
    },
  });
}

async function vincularTreinamentosPocComplementares(usuario: {
  id: number;
  email: string;
  cpf?: string | null;
  cargo?: string | null;
  setor?: string | null;
  unidade?: string | null;
  empresa?: string | null;
}) {
  const cpf = limparCpf(usuario.cpf || "");
  const data = {
    usuarioId: usuario.id,
    cargo: usuario.cargo,
    departamento: usuario.setor,
    unidade: usuario.unidade,
    empresa: usuario.empresa || "Movecta S/A",
  };
  const where = {
    usuarioId: null,
    OR: [{ email: usuario.email }, ...(cpf ? [{ cpf }] : [])],
  };

  await Promise.all([
    prisma.treinamentoPocSep002.updateMany({ where, data }),
    prisma.treinamentoPocSep003.updateMany({ where, data }),
    prisma.treinamentoPocSep004.updateMany({ where, data }),
    prisma.treinamentoPocSep005.updateMany({ where, data }),
    prisma.treinamentoPocSep006.updateMany({ where, data }),
  ]);
}

export async function listarUsuarios(req: Request, res: Response) {
  const usuarios = await prisma.usuario.findMany({
    orderBy: {
      nome: "asc",
    },
    select: selectUsuario,
  });

  return res.json(usuarios.map(formatarUsuario));
}

export async function criarUsuario(req: AuthRequest, res: Response) {
  try {
    const {
      nome,
      email,
      cpf,
      re,
      setor,
      cargo,
      equipe,
      unidade,
      unidadesPermitidas,
      perfilAcesso,
      senha,
      confirmarSenha,
    } = req.body;

    const unidadesDoUsuario = normalizarUnidadesPermitidas(
      unidadesPermitidas,
      unidade,
    );
    const unidadePrincipal =
      unidade && unidadesDoUsuario.includes(unidade)
        ? unidade
        : unidadesDoUsuario[0];
    const cpfNormalizado = limparCpf(cpf);

    if (
      !nome ||
      !email ||
      !re ||
      !setor ||
      !cargo ||
      !unidadePrincipal ||
      !perfilAcesso ||
      !senha
    ) {
      return res
        .status(400)
        .json({ error: "Preencha todos os campos obrigatórios." });
    }

    if (!cpfValido(cpfNormalizado)) {
      return res.status(400).json({ error: "CPF inválido." });
    }

    if (senha !== confirmarSenha) {
      return res.status(400).json({ error: "As senhas não coincidem." });
    }

    const existe = await prisma.usuario.findFirst({
      where: {
        OR: [{ email }, ...(cpfNormalizado ? [{ cpf: cpfNormalizado }] : [])],
      },
    });
    if (existe) {
      return res.status(400).json({
        error:
          existe.email === email
            ? "E-mail já cadastrado."
            : "CPF já cadastrado.",
      });
    }

    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        cpf: cpfNormalizado || null,
        re,
        setor,
        cargo,
        equipe: validarEquipe(equipe),
        unidade: unidadePrincipal,
        unidadesPermitidas: serializarUnidadesPermitidas(
          unidadesDoUsuario,
          unidadePrincipal,
        ),
        empresa: "Movecta S/A",
        perfilAcesso: normalizarPerfil(perfilAcesso),
        statusUsuario: "ATIVO",
        deveAlterarSenha: true,
        senha: await bcrypt.hash(senha, 10),
      },
      select: selectUsuario,
    });

    await registrarLog({
      req,
      acao: "Criação de usuário",
      tipoRegistro: "Usuario",
      registroId: usuario.id,
      dadosNovos: usuario,
    });

    await vincularTreinamentosPocSep007(usuario);
    await vincularTreinamentosPocSep001(usuario);
    await vincularTreinamentosPocComplementares(usuario);

    return res.status(201).json(formatarUsuario(usuario));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar usuário" });
  }
}

export async function atualizarUsuario(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const usuarioAnterior = await prisma.usuario.findUnique({
      where: { id: Number(id) },
      select: selectUsuario,
    });

    if (!usuarioAnterior) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    if (
      usuarioAnterior.perfilAcesso === "SUPER_ADMIN" &&
      req.usuarioPerfil !== "SUPER_ADMIN"
    ) {
      return res
        .status(403)
        .json({ error: "Somente Super Admin pode alterar outro Super Admin." });
    }

    const {
      nome,
      email,
      cpf,
      re,
      setor,
      cargo,
      equipe,
      unidade,
      unidadesPermitidas,
      perfilAcesso,
      statusUsuario,
    } = req.body;
    const unidadesDoUsuario = normalizarUnidadesPermitidas(
      unidadesPermitidas,
      unidade || usuarioAnterior.unidade,
    );
    const unidadePrincipal =
      unidade && unidadesDoUsuario.includes(unidade)
        ? unidade
        : unidadesDoUsuario[0];
    const cpfNormalizado = limparCpf(cpf);

    if (!cpfValido(cpfNormalizado)) {
      return res.status(400).json({ error: "CPF inválido." });
    }

    if (cpfNormalizado) {
      const cpfExistente = await prisma.usuario.findFirst({
        where: {
          cpf: cpfNormalizado,
          id: { not: Number(id) },
        },
      });
      if (cpfExistente) {
        return res.status(400).json({ error: "CPF já cadastrado." });
      }
    }

    const usuario = await prisma.usuario.update({
      where: { id: Number(id) },
      data: {
        nome,
        email,
        cpf: cpfNormalizado || null,
        re,
        setor,
        cargo,
        equipe: validarEquipe(equipe),
        unidade: unidadePrincipal,
        unidadesPermitidas: serializarUnidadesPermitidas(
          unidadesDoUsuario,
          unidadePrincipal,
        ),
        empresa: "Movecta S/A",
        perfilAcesso: normalizarPerfil(perfilAcesso),
        statusUsuario: validarStatus(statusUsuario),
      },
      select: selectUsuario,
    });

    await registrarLog({
      req,
      acao:
        usuarioAnterior.perfilAcesso !== usuario.perfilAcesso
          ? "Alteração de permissões"
          : "Alteração de usuário",
      tipoRegistro: "Usuario",
      registroId: usuario.id,
      dadosAnteriores: usuarioAnterior,
      dadosNovos: usuario,
    });

    await vincularTreinamentosPocSep007(usuario);
    await vincularTreinamentosPocSep001(usuario);
    await vincularTreinamentosPocComplementares(usuario);

    return res.json(formatarUsuario(usuario));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar usuário" });
  }
}

export async function redefinirSenhaUsuario(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { senha, confirmarSenha } = req.body;

    if (!senha || senha !== confirmarSenha) {
      return res.status(400).json({ error: "As senhas não coincidem." });
    }

    const usuarioAnterior = await prisma.usuario.findUnique({
      where: { id: Number(id) },
      select: selectUsuario,
    });

    if (!usuarioAnterior) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    if (
      usuarioAnterior.perfilAcesso === "SUPER_ADMIN" &&
      req.usuarioPerfil !== "SUPER_ADMIN"
    ) {
      return res.status(403).json({
        error: "Somente Super Admin pode redefinir senha de outro Super Admin.",
      });
    }

    const usuario = await prisma.usuario.update({
      where: { id: Number(id) },
      data: {
        senha: await bcrypt.hash(senha, 10),
        deveAlterarSenha: true,
        senhaAlteradaEm: null,
      },
      select: selectUsuario,
    });

    await registrarLog({
      req,
      acao: "Redefinição de senha",
      tipoRegistro: "Usuario",
      registroId: usuario.id,
      dadosNovos: { id: usuario.id, email: usuario.email },
    });

    return res.json(formatarUsuario(usuario));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao redefinir senha" });
  }
}

export async function resetarDispositivoUsuario(
  req: AuthRequest,
  res: Response,
) {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const usuario = await prisma.usuario.findUnique({
      where: { id: Number(id) },
      select: selectUsuario,
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    await prisma.dispositivoAutorizado.updateMany({
      where: {
        usuarioId: usuario.id,
        status: "Autorizado",
      },
      data: {
        status: "Resetado",
        resetadoEm: new Date(),
        resetadoPorId: req.usuarioId,
        motivoReset: motivo || "Reset administrativo de dispositivo",
      },
    });

    await registrarLog({
      req,
      acao: "Reset de dispositivo autorizado",
      tipoRegistro: "Usuario",
      registroId: usuario.id,
      dadosNovos: {
        usuarioId: usuario.id,
        email: usuario.email,
        motivo: motivo || "Reset administrativo de dispositivo",
      },
    });

    return res.json({
      mensagem:
        "Dispositivo resetado. O próximo acesso vinculará um novo computador.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao resetar dispositivo" });
  }
}

export async function resetarPinUsuario(req: AuthRequest, res: Response) {
  try {
    if (req.usuarioPerfil !== "SUPER_ADMIN") {
      return res
        .status(403)
        .json({ error: "Somente Super Admin pode resetar PIN operacional." });
    }

    const { id } = req.params;
    const usuarioAnterior = await prisma.usuario.findUnique({
      where: { id: Number(id) },
      select: selectUsuario,
    });

    if (!usuarioAnterior) {
      return res.status(404).json({ error: "Usuario nao encontrado" });
    }

    const usuario = await prisma.usuario.update({
      where: { id: Number(id) },
      data: {
        pinOperacionalHash: await gerarHashPin("1234"),
        pinOperacionalCriadoEm:
          usuarioAnterior.pinOperacionalCriadoEm || new Date(),
        pinOperacionalAtualizadoEm: new Date(),
        pinTentativasInvalidas: 0,
        pinBloqueadoAte: null,
      },
      select: selectUsuario,
    });

    await registrarLog({
      req,
      acao: "Reset de PIN operacional",
      tipoRegistro: "Usuario",
      registroId: usuario.id,
      dadosAnteriores: {
        id: usuarioAnterior.id,
        email: usuarioAnterior.email,
        possuiPinOperacional: Boolean(
          usuarioAnterior.pinOperacionalCriadoEm ||
            usuarioAnterior.pinOperacionalAtualizadoEm,
        ),
      },
      dadosNovos: {
        id: usuario.id,
        email: usuario.email,
        possuiPinOperacional: true,
        pinTemporario: true,
        resetadoEm: new Date().toISOString(),
      },
    });

    return res.json({
      mensagem:
        "PIN operacional restaurado para 1234. O usuario devera alterar o PIN no perfil.",
      usuario: formatarUsuario(usuario),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao resetar PIN operacional" });
  }
}

export async function alterarStatusUsuario(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { statusUsuario } = req.body;

    const usuarioAnterior = await prisma.usuario.findUnique({
      where: { id: Number(id) },
      select: selectUsuario,
    });

    if (!usuarioAnterior) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    if (usuarioAnterior.perfilAcesso === "SUPER_ADMIN") {
      return res.status(403).json({
        error: "O usuário Super Admin não pode ser bloqueado ou desativado.",
      });
    }

    const usuario = await prisma.usuario.update({
      where: { id: Number(id) },
      data: {
        statusUsuario: validarStatus(statusUsuario),
      },
      select: selectUsuario,
    });

    await registrarLog({
      req,
      acao:
        usuario.statusUsuario === "BLOQUEADO"
          ? "Bloqueio de usuário"
          : "Desbloqueio/ativação de usuário",
      tipoRegistro: "Usuario",
      registroId: usuario.id,
      dadosAnteriores: usuarioAnterior,
      dadosNovos: usuario,
    });

    return res.json(formatarUsuario(usuario));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao alterar status do usuário" });
  }
}

export async function excluirUsuario(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const usuario = await prisma.usuario.findUnique({
      where: { id: Number(id) },
      select: selectUsuario,
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    if (usuario.perfilAcesso === "SUPER_ADMIN") {
      return res
        .status(403)
        .json({ error: "O usuário Super Admin não pode ser excluído." });
    }

    await prisma.usuario.delete({ where: { id: Number(id) } });

    await registrarLog({
      req,
      acao: "Exclusão de usuário",
      tipoRegistro: "Usuario",
      registroId: usuario.id,
      dadosAnteriores: usuario,
    });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao excluir usuário" });
  }
}

export async function buscarPerfil(req: AuthRequest, res: Response) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: {
        id: req.usuarioId,
      },
      select: selectUsuario,
    });

    if (!usuario) {
      return res.status(404).json({
        error: "Usuário não encontrado",
      });
    }

    return res.json(formatarUsuario(usuario));
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao buscar perfil",
    });
  }
}

export async function atualizarPerfil(req: AuthRequest, res: Response) {
  try {
    const { apelido, removerFoto } = req.body;
    const arquivo = req.file as Express.Multer.File | undefined;

    const data: {
      apelido?: string;
      fotoPerfil?: string | null;
    } = {};

    const usuarioAnterior = await prisma.usuario.findUnique({
      where: {
        id: req.usuarioId,
      },
      select: {
        id: true,
        nome: true,
        apelido: true,
        fotoPerfil: true,
      },
    });

    if (!usuarioAnterior) {
      return res.status(404).json({
        error: "Usuário não encontrado",
      });
    }

    if (typeof apelido === "string") {
      data.apelido = apelido.trim();
    }

    if (arquivo) {
      data.fotoPerfil = `/uploads/perfis/${arquivo.filename}`;
    } else if (removerFoto === "true") {
      data.fotoPerfil = null;
    }

    const usuario = await prisma.usuario.update({
      where: {
        id: req.usuarioId,
      },
      data,
      select: selectUsuario,
    });

    if (usuarioAnterior.apelido !== usuario.apelido) {
      await registrarLog({
        req,
        acao: "Alteração de apelido",
        tipoRegistro: "Usuario",
        registroId: usuario.id,
        dadosAnteriores: { apelido: usuarioAnterior.apelido },
        dadosNovos: { apelido: usuario.apelido },
      });
    }

    if (usuarioAnterior.fotoPerfil !== usuario.fotoPerfil) {
      await registrarLog({
        req,
        acao: usuario.fotoPerfil
          ? "Alteração de foto de perfil"
          : "Remoção de foto de perfil",
        tipoRegistro: "Usuario",
        registroId: usuario.id,
        dadosAnteriores: { fotoPerfil: usuarioAnterior.fotoPerfil },
        dadosNovos: { fotoPerfil: usuario.fotoPerfil },
      });
    }

    return res.json(formatarUsuario(usuario));
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao atualizar perfil",
    });
  }
}

export async function atualizarPinOperacional(req: AuthRequest, res: Response) {
  try {
    const { pinAtual, senhaAtual, novoPin, confirmarNovoPin } = req.body;

    if (!novoPin || !confirmarNovoPin) {
      return res
        .status(400)
        .json({ error: "Informe e confirme o novo PIN de segurança." });
    }

    if (novoPin !== confirmarNovoPin) {
      return res
        .status(400)
        .json({ error: "Os PINs de segurança não coincidem." });
    }

    if (!validarFormatoPin(String(novoPin))) {
      return res.status(400).json({
        error:
          "O PIN de segurança deve possuir exatamente 4 dígitos numéricos.",
      });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuarioId },
      select: {
        id: true,
        nome: true,
        email: true,
        senha: true,
        pinOperacionalHash: true,
        pinOperacionalCriadoEm: true,
      },
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    if (usuario.pinOperacionalHash) {
      if (!pinAtual) {
        return res
          .status(400)
          .json({ error: "Informe o PIN atual para cadastrar um novo PIN." });
      }
      await validarPinOperacional(usuario.id, String(pinAtual));
    } else {
      if (!senhaAtual) {
        return res.status(400).json({
          error: "Informe sua senha atual para criar o PIN de segurança.",
        });
      }

      const senhaValida = await bcrypt.compare(
        String(senhaAtual),
        usuario.senha,
      );
      if (!senhaValida) {
        return res.status(400).json({ error: "Senha atual inválida." });
      }
    }

    const atualizado = await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        pinOperacionalHash: await gerarHashPin(String(novoPin)),
        pinOperacionalCriadoEm: usuario.pinOperacionalCriadoEm || new Date(),
        pinOperacionalAtualizadoEm: new Date(),
        pinTentativasInvalidas: 0,
        pinBloqueadoAte: null,
      },
      select: selectUsuario,
    });

    await registrarLog({
      req,
      acao: usuario.pinOperacionalHash
        ? "Atualização de PIN operacional"
        : "Criação de PIN operacional",
      tipoRegistro: "Usuario",
      registroId: usuario.id,
      dadosNovos: {
        id: usuario.id,
        email: usuario.email,
        pinOperacionalAtualizadoEm: new Date().toISOString(),
      },
    });

    return res.json(formatarUsuario(atualizado));
  } catch (error: any) {
    const status = error?.status || 500;
    return res
      .status(status)
      .json({ error: error?.message || "Erro ao atualizar PIN operacional" });
  }
}
