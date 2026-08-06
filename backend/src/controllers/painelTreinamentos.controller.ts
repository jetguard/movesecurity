import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest, PERFIS } from "../middlewares/auth";

type RegistroTreinamento = {
  id: string;
  treinamento: string;
  poc?: string;
  nome: string;
  cpf?: string | null;
  email: string;
  matricula?: string | null;
  foto?: string | null;
  cargo?: string | null;
  departamento?: string | null;
  unidade?: string | null;
  equipe?: string | null;
  gestor?: string | null;
  usuarioId?: number | null;
  dataInicio?: Date | null;
  dataConclusao?: Date | null;
  ultimoAcesso?: Date | null;
  nota?: number | null;
  tentativas: number;
  status: string;
  porcentagem: number;
  certificadoUrl?: string | null;
  certificadoEmitido: boolean;
  aprovado: boolean;
  vencido: boolean;
  tempoHoras?: number | null;
  competencias: string[];
};

const TREINAMENTOS = [
  {
    chave: "treinamentoTerminal",
    titulo: "Treinamento de Acesso ao Recinto Alfandegado",
    poc: null,
    certificado: "treinamento-terminal",
    competencias: ["Controle de Acesso", "Segurança Patrimonial"],
  },
  {
    chave: "integracaoTerminal",
    titulo: "Integração de Motoristas",
    poc: null,
    certificado: "integracao-terminal",
    competencias: ["Controle de Acesso", "Segurança Patrimonial"],
  },
  {
    chave: "treinamentoPocSep006",
    titulo: "POC-SEP-006",
    poc: "POC-SEP-006",
    certificado: "treinamento-poc-sep-006",
    competencias: ["CCOS", "Rondas", "Ocorrências"],
  },
  {
    chave: "treinamentoPocSep007",
    titulo: "POC-SEP-007",
    poc: "POC-SEP-007",
    certificado: "treinamento-poc-sep-007",
    competencias: ["Controle de Acesso", "Segurança Patrimonial"],
  },
];

const COMPETENCIAS = [
  "Controle de Acesso",
  "CCOS",
  "Rondas",
  "Scanner",
  "Investigação",
  "Ocorrências",
  "Eventos",
  "Contratos",
  "Análise de Risco",
  "Segurança Patrimonial",
];

function texto(valor: unknown) {
  return String(valor || "").trim();
}

function normalizarCpf(cpf?: string | null) {
  return texto(cpf).replace(/\D/g, "");
}

function chavePessoa(item: {
  usuarioId?: number | null;
  cpf?: string | null;
  email?: string | null;
}) {
  if (item.usuarioId) return `u:${item.usuarioId}`;
  const cpf = normalizarCpf(item.cpf);
  if (cpf) return `cpf:${cpf}`;
  return `email:${texto(item.email).toLowerCase()}`;
}

function media(valores: Array<number | null | undefined>) {
  const validos = valores.filter(
    (valor): valor is number =>
      typeof valor === "number" && Number.isFinite(valor),
  );
  if (!validos.length) return 0;
  return (
    Math.round(
      (validos.reduce((total, valor) => total + valor, 0) / validos.length) *
        10,
    ) / 10
  );
}

function agruparMedia<T>(
  itens: T[],
  chave: (item: T) => string | null | undefined,
  valor: (item: T) => number | null | undefined,
) {
  const grupos = new Map<string, Array<number | null | undefined>>();
  itens.forEach((item) => {
    const nome = texto(chave(item)) || "Não informado";
    grupos.set(nome, [...(grupos.get(nome) || []), valor(item)]);
  });

  return Array.from(grupos.entries())
    .map(([nome, valores]) => ({
      nome,
      media: media(valores),
      total: valores.length,
    }))
    .sort((a, b) => b.media - a.media || b.total - a.total);
}

function concluido(status?: string | null) {
  return texto(status).toLowerCase().startsWith("conclu");
}

function certificadoUrl(
  base: string,
  token?: string | null,
  certificadoArquivo?: string | null,
) {
  if (!token || !certificadoArquivo) return null;
  return `/api/public/${base}/${token}/certificado`;
}

function dataSomada(data: Date, anos: number) {
  const nova = new Date(data);
  nova.setFullYear(nova.getFullYear() + anos);
  return nova;
}

function diferencaHoras(inicio?: Date | null, fim?: Date | null) {
  if (!inicio || !fim) return null;
  const horas = (fim.getTime() - inicio.getTime()) / 36e5;
  return Math.max(0, Math.round(horas * 10) / 10);
}

function dentroPeriodo(
  data: Date | null | undefined,
  inicio: string,
  fim: string,
) {
  if (!data) return true;
  if (inicio && data < new Date(`${inicio}T00:00:00`)) return false;
  if (fim && data > new Date(`${fim}T23:59:59`)) return false;
  return true;
}

function numeroFiltro(valor: unknown) {
  const textoValor = texto(valor);
  if (!textoValor) return null;
  const numero = Number(textoValor);
  return Number.isFinite(numero) ? numero : null;
}

function calcularIco(registros: RegistroTreinamento[]) {
  const notaMedia = media(registros.map((item) => item.nota));
  const reprovacoes = registros.filter(
    (item) =>
      item.tentativas > 1 ||
      texto(item.status).toLowerCase().includes("reprov"),
  ).length;
  const pendentes = registros.filter((item) => !item.aprovado).length;
  const vencidos = registros.filter((item) => item.vencido).length;
  const tempoMedio = media(registros.map((item) => item.tempoHoras));
  const fatorTempo = Math.max(0, 100 - Math.min(100, tempoMedio * 2));
  const fatorReprovacao = Math.max(0, 100 - reprovacoes * 18);
  const fatorReciclagem = Math.max(0, 100 - vencidos * 25);
  const fatorPendencia = Math.max(0, 100 - pendentes * 12);
  const ico = Math.round(
    notaMedia * 0.4 +
      fatorTempo * 0.2 +
      fatorReprovacao * 0.15 +
      fatorReciclagem * 0.15 +
      fatorPendencia * 0.1,
  );

  let classificacao = "Reciclagem Prioritária";
  if (ico >= 90) classificacao = "Excelente";
  else if (ico >= 80) classificacao = "Muito Bom";
  else if (ico >= 70) classificacao = "Bom";
  else if (ico >= 60) classificacao = "Necessita Desenvolvimento";

  return { ico, classificacao };
}

function recomendacoes(registros: RegistroTreinamento[], ico: number) {
  const saida: string[] = [];
  const menor = [...registros]
    .filter((item) => typeof item.nota === "number")
    .sort((a, b) => Number(a.nota) - Number(b.nota))[0];
  if (menor && Number(menor.nota) < 80)
    saida.push(`Recomendar reciclagem em ${menor.treinamento}.`);
  if (registros.some((item) => item.tentativas > 3))
    saida.push("Sugerir acompanhamento pelo gestor por excesso de tentativas.");
  if (ico >= 95)
    saida.push("Indicar aptidão para atuar como multiplicador interno.");
  if (registros.some((item) => item.vencido))
    saida.push("Priorizar reciclagem de treinamentos vencidos.");
  if (!saida.length)
    saida.push("Manter acompanhamento periódico de desempenho.");
  return saida;
}

export async function painelAnaliticoTreinamentos(
  req: AuthRequest,
  res: Response,
) {
  try {
    const usuarioLogado = await prisma.usuario.findUnique({
      where: { id: Number(req.usuarioId) },
    });
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        cpf: true,
        re: true,
        fotoPerfil: true,
        cargo: true,
        setor: true,
        equipe: true,
        unidade: true,
        empresa: true,
        ultimoAcesso: true,
        createdAt: true,
      },
    });
    const usuariosPorId = new Map(
      usuarios.map((usuario) => [usuario.id, usuario]),
    );
    const usuariosPorCpf = new Map(
      usuarios
        .filter((usuario) => usuario.cpf)
        .map((usuario) => [normalizarCpf(usuario.cpf), usuario]),
    );
    const usuariosPorEmail = new Map(
      usuarios.map((usuario) => [usuario.email.toLowerCase(), usuario]),
    );

    const registros: RegistroTreinamento[] = [];
    for (const fonte of TREINAMENTOS) {
      const delegate = (prisma as any)[fonte.chave];
      const itens = await delegate.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5000,
      });
      itens.forEach((item: any) => {
        const usuario =
          (item.usuarioId && usuariosPorId.get(item.usuarioId)) ||
          usuariosPorCpf.get(normalizarCpf(item.cpf)) ||
          usuariosPorEmail.get(texto(item.email).toLowerCase()) ||
          null;
        const dataInicio = item.dataInicio || item.createdAt || null;
        const dataConclusao = item.dataConclusao || item.concluidoEm || null;
        const temCertificado = Boolean(item.certificadoArquivo);
        const aprovado =
          concluido(item.status) ||
          temCertificado ||
          item.quizAprovado === true;
        const nota =
          typeof item.nota === "number"
            ? item.nota
            : item.quizAprovado
              ? 100
              : null;
        const vencido = Boolean(
          dataConclusao && dataSomada(new Date(dataConclusao), 2) < new Date(),
        );

        registros.push({
          id: `${fonte.chave}:${item.id}`,
          treinamento: fonte.titulo,
          poc: fonte.poc || undefined,
          nome: item.nomeCompleto || usuario?.nome || "-",
          cpf: item.cpf || usuario?.cpf,
          email: item.email || usuario?.email || "",
          matricula: usuario?.re || null,
          foto: usuario?.fotoPerfil || null,
          cargo: item.cargo || usuario?.cargo || null,
          departamento: item.departamento || usuario?.setor || null,
          unidade: item.unidade || usuario?.unidade || null,
          equipe: usuario?.equipe || null,
          gestor: null,
          usuarioId: item.usuarioId || usuario?.id || null,
          dataInicio,
          dataConclusao,
          ultimoAcesso:
            item.ultimoAcessoEm ||
            usuario?.ultimoAcesso ||
            item.updatedAt ||
            null,
          nota,
          tentativas: Number(item.tentativas || (item.quizAprovado ? 1 : 0)),
          status: item.status,
          porcentagem: Number(item.porcentagem || (aprovado ? 100 : 0)),
          certificadoUrl: certificadoUrl(
            fonte.certificado,
            item.token,
            item.certificadoArquivo,
          ),
          certificadoEmitido: temCertificado,
          aprovado,
          vencido,
          tempoHoras: diferencaHoras(dataInicio, dataConclusao),
          competencias: fonte.competencias,
        });
      });
    }

    const perfil = req.usuarioPerfil || "";
    const escopados = registros.filter((item) => {
      if ([PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR].includes(perfil))
        return true;
      if (perfil === PERFIS.COORDENADOR)
        return item.unidade && item.unidade === usuarioLogado?.unidade;
      if ([PERFIS.GESTOR, PERFIS.SUPERVISOR].includes(perfil))
        return item.equipe && item.equipe === usuarioLogado?.equipe;
      return false;
    });

    const filtros = {
      nome: texto(req.query.nome).toLowerCase(),
      matricula: texto(req.query.matricula).toLowerCase(),
      unidade: texto(req.query.unidade),
      departamento: texto(req.query.departamento),
      cargo: texto(req.query.cargo),
      treinamento: texto(req.query.treinamento),
      situacao: texto(req.query.situacao),
      status: texto(req.query.status),
      notaMin: numeroFiltro(req.query.notaMin),
      notaMax: numeroFiltro(req.query.notaMax),
      inicio: texto(req.query.inicio),
      fim: texto(req.query.fim),
    };

    const filtrados = escopados.filter((item) => {
      const buscaPessoa =
        `${item.nome} ${item.email} ${item.cpf || ""}`.toLowerCase();
      if (filtros.nome && !buscaPessoa.includes(filtros.nome)) return false;
      if (
        filtros.matricula &&
        !texto(item.matricula).toLowerCase().includes(filtros.matricula)
      )
        return false;
      if (filtros.unidade && item.unidade !== filtros.unidade) return false;
      if (filtros.departamento && item.departamento !== filtros.departamento)
        return false;
      if (filtros.cargo && item.cargo !== filtros.cargo) return false;
      if (filtros.treinamento && item.treinamento !== filtros.treinamento)
        return false;
      if (filtros.status && item.status !== filtros.status) return false;
      if (filtros.situacao === "Concluído" && !item.aprovado) return false;
      if (filtros.situacao === "Pendente" && item.aprovado) return false;
      if (filtros.situacao === "Vencido" && !item.vencido) return false;
      if (
        filtros.notaMin !== null &&
        typeof item.nota === "number" &&
        item.nota < filtros.notaMin
      )
        return false;
      if (
        filtros.notaMax !== null &&
        typeof item.nota === "number" &&
        item.nota > filtros.notaMax
      )
        return false;
      if (
        !dentroPeriodo(
          item.dataConclusao || item.dataInicio,
          filtros.inicio,
          filtros.fim,
        )
      )
        return false;
      return true;
    });

    const colaboradoresMap = new Map<string, RegistroTreinamento[]>();
    filtrados.forEach((item) => {
      const chave = chavePessoa(item);
      colaboradoresMap.set(chave, [
        ...(colaboradoresMap.get(chave) || []),
        item,
      ]);
    });

    const colaboradores = Array.from(colaboradoresMap.entries()).map(
      ([chave, itens]) => {
        const base = itens[0];
        const notas = itens
          .map((item) => item.nota)
          .filter((nota): nota is number => typeof nota === "number");
        const { ico, classificacao } = calcularIco(itens);
        const concluidos = itens.filter((item) => item.aprovado).length;
        const pendentes = itens.length - concluidos;
        const ultimaAvaliacao =
          [...itens]
            .filter((item) => item.dataConclusao)
            .sort(
              (a, b) => Number(b.dataConclusao) - Number(a.dataConclusao),
            )[0]?.dataConclusao || null;
        const ultimoAcesso =
          [...itens]
            .filter((item) => item.ultimoAcesso)
            .sort((a, b) => Number(b.ultimoAcesso) - Number(a.ultimoAcesso))[0]
            ?.ultimoAcesso || null;
        const fortes = agruparMedia(
          itens,
          (item) => item.competencias[0],
          (item) => item.nota,
        )
          .filter((item) => item.media >= 85)
          .map((item) => item.nome);
        const fracos = agruparMedia(
          itens,
          (item) => item.competencias[0],
          (item) => item.nota,
        )
          .filter((item) => item.media < 80)
          .map((item) => item.nome);
        return {
          id: chave,
          foto: base.foto,
          nome: base.nome,
          matricula: base.matricula,
          cpf: base.cpf,
          email: base.email,
          cargo: base.cargo,
          departamento: base.departamento,
          unidade: base.unidade,
          equipe: base.equipe,
          gestor: base.gestor,
          dataAdmissao: null,
          tempoEmpresa: "-",
          quantidadeTreinamentos: itens.length,
          treinamentosConcluidos: concluidos,
          treinamentosPendentes: pendentes,
          notaMedia: media(notas),
          maiorNota: notas.length ? Math.max(...notas) : null,
          menorNota: notas.length ? Math.min(...notas) : null,
          ultimaAvaliacao,
          ultimoAcesso,
          situacao: itens.some((item) => item.vencido)
            ? "Vencido"
            : pendentes
              ? "Pendente"
              : "Conforme",
          ico,
          classificacaoIco: classificacao,
          pontosFortes: fortes,
          pontosFracos: fracos,
          recomendacoes: recomendacoes(itens, ico),
          historico: itens.sort(
            (a, b) => Number(b.ultimoAcesso) - Number(a.ultimoAcesso),
          ),
        };
      },
    );

    const concluidos = filtrados.filter((item) => item.aprovado);
    const pendentes = filtrados.filter((item) => !item.aprovado);
    const vencidos = filtrados.filter((item) => item.vencido);
    const reprovacoes = filtrados.filter(
      (item) =>
        item.tentativas > 1 ||
        texto(item.status).toLowerCase().includes("reprov"),
    );
    const notas = filtrados
      .map((item) => item.nota)
      .filter((nota): nota is number => typeof nota === "number");
    const mediaTreinamento = agruparMedia(
      filtrados,
      (item) => item.treinamento,
      (item) => item.nota,
    );
    const porTreinamento = TREINAMENTOS.map((fonte) => {
      const itens = filtrados.filter(
        (item) => item.treinamento === fonte.titulo,
      );
      const aprovados = itens.filter((item) => item.aprovado).length;
      const reps = itens.filter(
        (item) =>
          item.tentativas > 1 ||
          texto(item.status).toLowerCase().includes("reprov"),
      ).length;
      return {
        nome: fonte.titulo,
        media: media(itens.map((item) => item.nota)),
        aprovados,
        reprovados: reps,
        total: itens.length,
        taxaAprovacao: itens.length
          ? Math.round((aprovados / itens.length) * 100)
          : 0,
        taxaReprovacao: itens.length
          ? Math.round((reps / itens.length) * 100)
          : 0,
        tempoMedio: media(itens.map((item) => item.tempoHoras)),
      };
    });

    const meses = new Map<string, Array<number | null | undefined>>();
    concluidos.forEach((item) => {
      const data = item.dataConclusao || item.dataInicio;
      if (!data) return;
      const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
      meses.set(chave, [...(meses.get(chave) || []), item.nota]);
    });

    const competencias = COMPETENCIAS.map((competencia) => {
      const itens = filtrados.filter((item) =>
        item.competencias.includes(competencia),
      );
      return { competencia, nota: media(itens.map((item) => item.nota)) };
    });

    const assuntosErro = competencias
      .map((item) => ({
        assunto: item.competencia,
        indiceErro: Math.max(0, Math.round(100 - item.nota)),
      }))
      .sort((a, b) => b.indiceErro - a.indiceErro);

    return res.json({
      kpis: {
        totalColaboradores: colaboradores.length,
        treinamentosConcluidos: concluidos.length,
        treinamentosPendentes: pendentes.length,
        treinamentosVencidos: vencidos.length,
        treinamentosObrigatoriosPendentes: pendentes.length,
        mediaGeralAvaliacoes: media(notas),
        maiorNota: notas.length ? Math.max(...notas) : 0,
        menorNota: notas.length ? Math.min(...notas) : 0,
        certificadosEmitidos: filtrados.filter(
          (item) => item.certificadoEmitido,
        ).length,
        reprovacoes: reprovacoes.length,
        reciclagens: vencidos.length,
        tempoMedioConclusao: media(filtrados.map((item) => item.tempoHoras)),
        percentualConformidade: filtrados.length
          ? Math.round((concluidos.length / filtrados.length) * 100)
          : 0,
      },
      graficos: {
        mediaTreinamento,
        aprovadosReprovados: [
          { nome: "Aprovados", valor: concluidos.length },
          { nome: "Reprovados", valor: reprovacoes.length },
          { nome: "Pendentes", valor: pendentes.length },
        ],
        evolucaoNotas: Array.from(meses.entries()).map(([mes, valores]) => ({
          mes,
          media: media(valores),
        })),
        maiorReprovacao: [...porTreinamento]
          .sort((a, b) => b.taxaReprovacao - a.taxaReprovacao)
          .slice(0, 8),
        maiorAprovacao: [...porTreinamento]
          .sort((a, b) => b.taxaAprovacao - a.taxaAprovacao)
          .slice(0, 8),
        tempoMedioTreinamento: porTreinamento.map((item) => ({
          nome: item.nome,
          tempoMedio: item.tempoMedio,
        })),
        notasUnidade: agruparMedia(
          filtrados,
          (item) => item.unidade,
          (item) => item.nota,
        ),
        notasDepartamento: agruparMedia(
          filtrados,
          (item) => item.departamento,
          (item) => item.nota,
        ),
        notasCargo: agruparMedia(
          filtrados,
          (item) => item.cargo,
          (item) => item.nota,
        ),
        rankingColaboradores: [...colaboradores]
          .sort((a, b) => b.notaMedia - a.notaMedia)
          .slice(0, 20),
        rankingUnidades: agruparMedia(
          filtrados,
          (item) => item.unidade,
          (item) => item.nota,
        ),
        rankingDepartamentos: agruparMedia(
          filtrados,
          (item) => item.departamento,
          (item) => item.nota,
        ),
        rankingTreinamentosDificeis: [...porTreinamento].sort(
          (a, b) => b.taxaReprovacao - a.taxaReprovacao || a.media - b.media,
        ),
        assuntosErro,
        competencias,
      },
      colaboradores,
      opcoes: {
        unidades: Array.from(
          new Set(escopados.map((item) => item.unidade).filter(Boolean)),
        ).sort(),
        departamentos: Array.from(
          new Set(escopados.map((item) => item.departamento).filter(Boolean)),
        ).sort(),
        cargos: Array.from(
          new Set(escopados.map((item) => item.cargo).filter(Boolean)),
        ).sort(),
        treinamentos: TREINAMENTOS.map((item) => item.titulo),
        status: Array.from(
          new Set(escopados.map((item) => item.status).filter(Boolean)),
        ).sort(),
      },
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao gerar painel analítico de treinamentos." });
  }
}
