import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import {
  generateSecret as gerarSegredoOtp,
  generateURI as gerarUriOtp,
  verify as verificarOtp,
} from "otplib";
import { randomUUID } from "node:crypto";
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
import {
  criptografarSegredo,
  descriptografarSegredo,
} from "../utils/secretCrypto";

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
  terceirizado: true,
  equipe: true,
  unidade: true,
  unidadesPermitidas: true,
  perfilAcesso: true,
  statusUsuario: true,
  deveAlterarSenha: true,
  somenteCadastro: true,
  gruposTreinamentoJson: true,
  senhaAlteradaEm: true,
  pinOperacionalHash: true,
  pinOperacionalCriadoEm: true,
  pinOperacionalAtualizadoEm: true,
  doisFatoresAtivo: true,
  doisFatoresMetodo: true,
  doisFatoresTotpConfirmadoEm: true,
  ultimoAcesso: true,
  createdAt: true,
};

function formatarUsuario(usuario: any) {
  if (!usuario) return usuario;
  return {
    ...usuario,
    gruposTreinamento: normalizarGruposTreinamento(
      usuario.gruposTreinamentoJson,
      usuario.terceirizado,
    ),
    gruposTreinamentoJson: undefined,
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
    doisFatoresAtivo: Boolean(usuario.doisFatoresAtivo),
    doisFatoresMetodo: usuario.doisFatoresMetodo || null,
    doisFatoresTotpConfigurado: Boolean(usuario.doisFatoresTotpConfirmadoEm),
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

const GRUPOS_TREINAMENTO = [
  "CCOS",
  "Liderança",
  "Balança",
  "Portaria",
  "Terceirizado",
];

const MODULOS_ACESSO = [
  "dashboard",
  "relatorios",
  "documentos",
  "treinamentos",
  "treinamentos_criador",
  "treinamentos_criados",
  "treinamentos_visitantes",
  "operacao",
  "cftv",
  "solicitacoes_imagens",
  "quadra_seguranca",
  "analise_riscos",
  "plano_acao",
  "cadastros",
  "usuarios",
  "configuracoes",
  "sistema",
  "logs",
];

const ACOES_ACESSO = ["leitura", "criar", "editar", "excluir"];

type PermissaoModulo = {
  modulo: string;
  leitura: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
};

function normalizarGrupoTreinamento(grupo: string) {
  const valor = String(grupo || "")
    .trim()
    .toLowerCase();
  return GRUPOS_TREINAMENTO.find((item) => item.toLowerCase() === valor) || "";
}

function normalizarGruposTreinamento(valor: unknown, terceirizado = false) {
  let itens: unknown[] = [];
  if (Array.isArray(valor)) {
    itens = valor;
  } else if (typeof valor === "string") {
    try {
      const parsed = JSON.parse(valor);
      itens = Array.isArray(parsed) ? parsed : valor.split(",");
    } catch {
      itens = valor.split(",");
    }
  }

  const grupos = itens
    .map((item) => normalizarGrupoTreinamento(String(item)))
    .filter(Boolean);
  if (terceirizado && !grupos.includes("Terceirizado")) {
    grupos.push("Terceirizado");
  }
  return Array.from(new Set(grupos));
}

function normalizarCodigoPerfil(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function permissoesCompletas(modulos: string[]) {
  return Array.from(new Set(modulos))
    .filter((modulo) => MODULOS_ACESSO.includes(modulo))
    .map((modulo) => ({
      modulo,
      leitura: true,
      criar: true,
      editar: true,
      excluir: true,
    }));
}

function normalizarPermissoesDetalhadas(valor: unknown): PermissaoModulo[] {
  const bruto =
    typeof valor === "string"
      ? (() => {
          try {
            return JSON.parse(valor || "[]");
          } catch {
            return [];
          }
        })()
      : valor;

  if (Array.isArray(bruto)) {
    if (bruto.every((item) => typeof item === "string")) {
      return permissoesCompletas(bruto);
    }

    const mapa = new Map<string, PermissaoModulo>();
    for (const item of bruto) {
      const modulo = String(item?.modulo || item?.chave || "").trim();
      if (!MODULOS_ACESSO.includes(modulo)) continue;
      const permissoes = {
        modulo,
        leitura: Boolean(item.leitura),
        criar: Boolean(item.criar),
        editar: Boolean(item.editar),
        excluir: Boolean(item.excluir),
      };
      if (permissoes.criar || permissoes.editar || permissoes.excluir) {
        permissoes.leitura = true;
      }
      if (ACOES_ACESSO.some((acao) => Boolean(permissoes[acao as keyof PermissaoModulo]))) {
        mapa.set(modulo, permissoes);
      }
    }
    return Array.from(mapa.values());
  }

  if (bruto && typeof bruto === "object") {
    const mapa = new Map<string, PermissaoModulo>();
    for (const [modulo, acoes] of Object.entries(bruto as Record<string, any>)) {
      if (!MODULOS_ACESSO.includes(modulo)) continue;
      const listaAcoes = Array.isArray(acoes) ? acoes : [];
      const permissoes = {
        modulo,
        leitura: listaAcoes.includes("leitura"),
        criar: listaAcoes.includes("criar"),
        editar: listaAcoes.includes("editar"),
        excluir: listaAcoes.includes("excluir"),
      };
      if (permissoes.criar || permissoes.editar || permissoes.excluir) {
        permissoes.leitura = true;
      }
      if (ACOES_ACESSO.some((acao) => Boolean(permissoes[acao as keyof PermissaoModulo]))) {
        mapa.set(modulo, permissoes);
      }
    }
    return Array.from(mapa.values());
  }

  return [];
}

function modulosPermitidos(permissoes: PermissaoModulo[]) {
  return permissoes
    .filter((permissao) =>
      ACOES_ACESSO.some((acao) => Boolean(permissao[acao as keyof PermissaoModulo])),
    )
    .map((permissao) => permissao.modulo);
}

function formatarPerfilAcesso(perfil: any) {
  const permissoesDetalhadas = normalizarPermissoesDetalhadas(
    perfil.permissoesJson,
  );
  return {
    ...perfil,
    permissoes: modulosPermitidos(permissoesDetalhadas),
    permissoesDetalhadas,
    permissoesJson: undefined,
  };
}

async function buscarPerfilAtivo(codigo: string) {
  return prisma.perfilAcesso.findFirst({
    where: {
      codigo: normalizarPerfil(codigo),
      status: "ATIVO",
    },
  });
}

async function validarPerfilUsuario(perfil: string) {
  const codigo = normalizarPerfil(perfil);
  if (!codigo) return "";
  const perfilBanco = await buscarPerfilAtivo(codigo);
  return perfilBanco ? codigo : "";
}

export async function listarPerfisAcesso(req: AuthRequest, res: Response) {
  try {
    const perfis = await prisma.perfilAcesso.findMany({
      orderBy: [{ sistema: "desc" }, { nome: "asc" }],
    });
    return res.json(perfis.map(formatarPerfilAcesso));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar perfis de acesso." });
  }
}

export async function criarPerfilAcesso(req: AuthRequest, res: Response) {
  try {
    const nome = String(req.body.nome || "").trim();
    const descricao = String(req.body.descricao || "").trim();
    const permissoes = normalizarPermissoesDetalhadas(
      req.body.permissoesDetalhadas || req.body.permissoes,
    );
    const codigo = normalizarCodigoPerfil(req.body.codigo || nome);

    if (!nome || !codigo) {
      return res.status(400).json({ error: "Informe o nome do perfil." });
    }

    if (!permissoes.length) {
      return res
        .status(400)
        .json({ error: "Selecione ao menos um módulo para o perfil." });
    }

    const perfil = await prisma.perfilAcesso.create({
      data: {
        codigo,
        nome,
        descricao: descricao || null,
        permissoesJson: JSON.stringify(permissoes),
        sistema: false,
        status: "ATIVO",
      },
    });

    await registrarLog({
      req,
      acao: "Criação de perfil de acesso",
      tipoRegistro: "PerfilAcesso",
      registroId: perfil.id,
      dadosNovos: formatarPerfilAcesso(perfil),
    });

    return res.status(201).json(formatarPerfilAcesso(perfil));
  } catch (error: any) {
    console.error(error);
    if (error?.code === "P2002") {
      return res
        .status(400)
        .json({ error: "Já existe um perfil com este código." });
    }
    return res.status(500).json({ error: "Erro ao criar perfil de acesso." });
  }
}

export async function atualizarPerfilAcesso(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const anterior = await prisma.perfilAcesso.findUnique({ where: { id } });

    if (!anterior) {
      return res.status(404).json({ error: "Perfil de acesso não encontrado." });
    }

    const nome = String(req.body.nome || "").trim();
    const descricao = String(req.body.descricao || "").trim();
    const permissoes = normalizarPermissoesDetalhadas(
      req.body.permissoesDetalhadas || req.body.permissoes,
    );
    const status = ["ATIVO", "INATIVO"].includes(String(req.body.status))
      ? String(req.body.status)
      : anterior.status;

    if (!nome) {
      return res.status(400).json({ error: "Informe o nome do perfil." });
    }

    if (!permissoes.length) {
      return res
        .status(400)
        .json({ error: "Selecione ao menos um módulo para o perfil." });
    }

    const perfil = await prisma.perfilAcesso.update({
      where: { id },
      data: {
        nome,
        descricao: descricao || null,
        permissoesJson: JSON.stringify(permissoes),
        status,
      },
    });

    await registrarLog({
      req,
      acao: "Alteração de perfil de acesso",
      tipoRegistro: "PerfilAcesso",
      registroId: perfil.id,
      dadosAnteriores: formatarPerfilAcesso(anterior),
      dadosNovos: formatarPerfilAcesso(perfil),
    });

    return res.json(formatarPerfilAcesso(perfil));
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao atualizar perfil de acesso." });
  }
}

export async function excluirPerfilAcesso(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const perfil = await prisma.perfilAcesso.findUnique({ where: { id } });

    if (!perfil) {
      return res.status(404).json({ error: "Perfil de acesso não encontrado." });
    }

    if (perfil.sistema || perfil.codigo === "SUPER_ADMIN") {
      return res
        .status(403)
        .json({ error: "Perfis do sistema não podem ser excluídos." });
    }

    const emUso = await prisma.usuario.count({
      where: { perfilAcesso: perfil.codigo },
    });

    if (emUso > 0) {
      return res.status(400).json({
        error:
          "Este perfil está atribuído a usuários. Altere os usuários antes de excluir.",
      });
    }

    await prisma.perfilAcesso.delete({ where: { id } });

    await registrarLog({
      req,
      acao: "Exclusão de perfil de acesso",
      tipoRegistro: "PerfilAcesso",
      registroId: perfil.id,
      dadosAnteriores: formatarPerfilAcesso(perfil),
    });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao excluir perfil de acesso." });
  }
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

  await prisma.treinamentoPocSep006.updateMany({ where, data });
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
      terceirizado,
      somenteCadastro,
      gruposTreinamento,
    } = req.body;

    const emailNormalizado = String(email || "").trim().toLowerCase();
    const unidadesDoUsuario = normalizarUnidadesPermitidas(
      unidadesPermitidas,
      unidade,
    );
    const unidadePrincipal =
      unidade && unidadesDoUsuario.includes(unidade)
        ? unidade
        : unidadesDoUsuario[0];
    const cpfNormalizado = limparCpf(cpf);
    const cadastroSemAcesso = Boolean(somenteCadastro);
    const colaboradorTerceirizado = Boolean(terceirizado);
    const grupos = normalizarGruposTreinamento(
      gruposTreinamento ?? req.body.gruposTreinamentoJson,
      colaboradorTerceirizado,
    );

    if (
      !nome ||
      !emailNormalizado ||
      (!re && !cpfNormalizado) ||
      !setor ||
      !cargo ||
      !unidadePrincipal ||
      (!cadastroSemAcesso && !perfilAcesso)
    ) {
      return res
        .status(400)
        .json({ error: "Preencha todos os campos obrigatórios." });
    }

    if (!cpfValido(cpfNormalizado)) {
      return res.status(400).json({ error: "CPF inválido." });
    }

    if (!cadastroSemAcesso && senha && senha !== confirmarSenha) {
      return res.status(400).json({ error: "As senhas não coincidem." });
    }

    const perfilNormalizado = cadastroSemAcesso
      ? "CADASTRO"
      : await validarPerfilUsuario(perfilAcesso);

    if (!perfilNormalizado) {
      return res
        .status(400)
        .json({ error: "Perfil de acesso inválido ou inativo." });
    }

    const existe = await prisma.usuario.findFirst({
      where: {
        OR: [
          { email: emailNormalizado },
          ...(cpfNormalizado ? [{ cpf: cpfNormalizado }] : []),
        ],
      },
    });
    if (existe) {
      return res.status(400).json({
        error:
          existe.email === emailNormalizado
            ? "E-mail já cadastrado."
            : "CPF já cadastrado.",
      });
    }

    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email: emailNormalizado,
        cpf: cpfNormalizado || null,
        re,
        setor,
        cargo,
        terceirizado: colaboradorTerceirizado,
        equipe: validarEquipe(equipe),
        unidade: unidadePrincipal,
        unidadesPermitidas: serializarUnidadesPermitidas(
          unidadesDoUsuario,
          unidadePrincipal,
        ),
        empresa: "Movecta S/A",
        perfilAcesso: perfilNormalizado,
        statusUsuario: cadastroSemAcesso ? "INATIVO" : "ATIVO",
        deveAlterarSenha: !cadastroSemAcesso,
        somenteCadastro: cadastroSemAcesso,
        gruposTreinamentoJson: JSON.stringify(grupos),
        senha: await bcrypt.hash(
          cadastroSemAcesso || !senha ? randomUUID() : String(senha),
          10,
        ),
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
      terceirizado,
      somenteCadastro,
      gruposTreinamento,
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
    const cadastroSemAcesso = Boolean(somenteCadastro);
    const colaboradorTerceirizado = Boolean(terceirizado);
    const grupos = normalizarGruposTreinamento(
      gruposTreinamento ?? req.body.gruposTreinamentoJson,
      colaboradorTerceirizado,
    );

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

    const perfilNormalizado = cadastroSemAcesso
      ? "CADASTRO"
      : await validarPerfilUsuario(perfilAcesso || usuarioAnterior.perfilAcesso);

    if (!perfilNormalizado) {
      return res
        .status(400)
        .json({ error: "Perfil de acesso inválido ou inativo." });
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
        terceirizado: colaboradorTerceirizado,
        equipe: validarEquipe(equipe),
        unidade: unidadePrincipal,
        unidadesPermitidas: serializarUnidadesPermitidas(
          unidadesDoUsuario,
          unidadePrincipal,
        ),
        empresa: "Movecta S/A",
        perfilAcesso: perfilNormalizado,
        statusUsuario: cadastroSemAcesso
          ? "INATIVO"
          : validarStatus(statusUsuario),
        deveAlterarSenha: cadastroSemAcesso
          ? false
          : usuarioAnterior.deveAlterarSenha,
        somenteCadastro: cadastroSemAcesso,
        gruposTreinamentoJson: JSON.stringify(grupos),
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

export async function atualizarDoisFatores(req: AuthRequest, res: Response) {
  try {
    const ativo = Boolean(req.body.ativo);
    const senhaAtual = String(req.body.senhaAtual || "");

    if (!senhaAtual) {
      return res.status(400).json({
        error: "Informe sua senha atual para alterar a autenticação em 2 etapas.",
      });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuarioId },
      select: {
        id: true,
        nome: true,
        email: true,
        senha: true,
        perfilAcesso: true,
        doisFatoresAtivo: true,
      },
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    if (usuario.perfilAcesso !== "SUPER_ADMIN") {
      return res.status(403).json({
        error: "A autenticação em 2 etapas está disponível somente para Super Admin.",
      });
    }

    const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
    if (!senhaValida) {
      return res.status(400).json({ error: "Senha atual inválida." });
    }

    const atualizado = await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        doisFatoresAtivo: ativo,
        doisFatoresMetodo: ativo ? "EMAIL" : null,
        doisFatoresCodigoHash: null,
        doisFatoresExpiraEm: null,
        doisFatoresTentativas: 0,
        doisFatoresTotpSecret: ativo ? undefined : null,
        doisFatoresTotpConfirmadoEm: ativo ? undefined : null,
      },
      select: selectUsuario,
    });

    await registrarLog({
      req,
      acao: ativo ? "Ativação de 2FA" : "Desativação de 2FA",
      tipoRegistro: "Usuario",
      registroId: usuario.id,
      dadosAnteriores: { doisFatoresAtivo: usuario.doisFatoresAtivo },
      dadosNovos: { doisFatoresAtivo: ativo, doisFatoresMetodo: ativo ? "EMAIL" : null },
    });

    return res.json(formatarUsuario(atualizado));
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: error?.message || "Erro ao atualizar 2FA." });
  }
}

export async function prepararDoisFatoresAutenticador(
  req: AuthRequest,
  res: Response,
) {
  try {
    const senhaAtual = String(req.body.senhaAtual || "");

    if (!senhaAtual) {
      return res.status(400).json({
        error: "Informe sua senha atual para configurar o aplicativo autenticador.",
      });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuarioId },
      select: {
        id: true,
        nome: true,
        email: true,
        senha: true,
        perfilAcesso: true,
      },
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    if (usuario.perfilAcesso !== "SUPER_ADMIN") {
      return res.status(403).json({
        error:
          "A autenticação por aplicativo está disponível somente para Super Admin.",
      });
    }

    const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
    if (!senhaValida) {
      return res.status(400).json({ error: "Senha atual inválida." });
    }

    const segredo = gerarSegredoOtp();
    const otpauthUrl = gerarUriOtp({
      issuer: "MoveSecurity",
      label: usuario.email,
      secret: segredo,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      margin: 1,
      width: 220,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    });

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        doisFatoresAtivo: false,
        doisFatoresMetodo: "AUTHENTICATOR",
        doisFatoresCodigoHash: null,
        doisFatoresExpiraEm: null,
        doisFatoresTentativas: 0,
        doisFatoresTotpSecret: criptografarSegredo(segredo),
        doisFatoresTotpConfirmadoEm: null,
      },
    });

    await registrarLog({
      req,
      acao: "Preparação de 2FA por autenticador",
      tipoRegistro: "Usuario",
      registroId: usuario.id,
      dadosNovos: { doisFatoresMetodo: "AUTHENTICATOR" },
    });

    return res.json({
      qrCodeDataUrl,
      chaveManual: segredo,
      issuer: "MoveSecurity",
      conta: usuario.email,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || "Erro ao preparar aplicativo autenticador.",
    });
  }
}

export async function confirmarDoisFatoresAutenticador(
  req: AuthRequest,
  res: Response,
) {
  try {
    const codigo = String(req.body.codigo || "").replace(/\D/g, "").slice(0, 6);

    if (codigo.length !== 6) {
      return res
        .status(400)
        .json({ error: "Informe o código de 6 dígitos do aplicativo." });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuarioId },
      select: {
        id: true,
        nome: true,
        email: true,
        senha: true,
        perfilAcesso: true,
        doisFatoresTotpSecret: true,
      },
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    if (usuario.perfilAcesso !== "SUPER_ADMIN") {
      return res.status(403).json({
        error:
          "A autenticação por aplicativo está disponível somente para Super Admin.",
      });
    }

    const segredo = descriptografarSegredo(usuario.doisFatoresTotpSecret);
    if (!segredo) {
      return res.status(400).json({
        error: "Configure o aplicativo autenticador antes de confirmar.",
      });
    }

    const resultadoOtp = await verificarOtp({
      secret: segredo,
      token: codigo,
      epochTolerance: 30,
    });
    const codigoValido = resultadoOtp.valid;
    if (!codigoValido) {
      return res.status(400).json({ error: "Código de verificação inválido." });
    }

    const atualizado = await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        doisFatoresAtivo: true,
        doisFatoresMetodo: "AUTHENTICATOR",
        doisFatoresCodigoHash: null,
        doisFatoresExpiraEm: null,
        doisFatoresTentativas: 0,
        doisFatoresTotpConfirmadoEm: new Date(),
      },
      select: selectUsuario,
    });

    await registrarLog({
      req,
      acao: "Ativação de 2FA por autenticador",
      tipoRegistro: "Usuario",
      registroId: usuario.id,
      dadosNovos: { doisFatoresAtivo: true, doisFatoresMetodo: "AUTHENTICATOR" },
    });

    return res.json(formatarUsuario(atualizado));
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || "Erro ao confirmar aplicativo autenticador.",
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
