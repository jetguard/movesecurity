import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, PointerEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  PenLine,
  ShieldCheck,
} from "lucide-react";

type SecaoTreinamento = {
  numero: string;
  titulo: string;
  objetivo: string;
  resumo: string;
  responsabilidades: string[];
  pontos: string[];
  atencao: string;
};

type PerguntaQuiz = {
  pergunta: string;
  opcoes: string[];
  correta: number;
};

type RegistroTreinamento = {
  token: string;
  codigo?: string | null;
  nomeCompleto: string;
  cpf?: string | null;
  email: string;
  cargo?: string | null;
  departamento?: string | null;
  unidade?: string | null;
  empresa?: string | null;
  etapaAtual: number;
  status: string;
  porcentagem: number;
  nota?: number | null;
  tentativas: number;
  certificadoUrl?: string | null;
  emailStatus?: string | null;
};

const formInicial = {
  nomeCompleto: "",
  cpf: "",
  email: "",
  unidade: "",
};

const secoes: SecaoTreinamento[] = [
  {
    numero: "5.1",
    titulo: "Ronda física",
    objetivo: "Orientar preparação, execução e registro da ronda física.",
    resumo:
      "A ronda física exige verificação de EPIs, rádio HT, acessos, deslocamento pelo trajeto definido e observação ativa de irregularidades.",
    responsabilidades: [
      "Verificar EPIs, comunicação e acessos antes do deslocamento.",
      "Percorrer o trajeto observando sons, odores, fumaça, gás e alterações visuais.",
      "Inspecionar barreiras físicas, utilidades e locais críticos.",
    ],
    pontos: [
      "Teste fechaduras, cadeados, portões, janelas, cercas, mourões, muros e concertinas.",
      "Reporte ao CCOS início, metade, fim ou interrupção da ronda.",
      "Registre a marcação dos pontos definidos para comprovar cobertura da área.",
    ],
    atencao:
      "A ronda física deve ser preventiva, registrada e comunicada ao CCOS durante todo o deslocamento.",
  },
  {
    numero: "5.2",
    titulo: "Ronda via câmera",
    objetivo: "Padronizar a ronda remota realizada pelo sistema de CFTV.",
    resumo:
      "A ronda via câmera depende de câmeras online, imagens nítidas, conectividade adequada e observação de perímetro, áreas internas e pontos críticos.",
    responsabilidades: [
      "Verificar status das câmeras e nitidez das imagens.",
      "Validar conectividade para evitar travamentos em câmeras PTZ.",
      "Observar intrusão, sinistros, eventos e patrimônio.",
    ],
    pontos: [
      "A observação pode iniciar pelo perímetro e seguir para áreas internas.",
      "Em pontos críticos, use zoom e PTZ para verificar detalhes.",
      "Quando houver agente em campo, a ronda virtual deve acompanhar o deslocamento.",
    ],
    atencao:
      "A ronda virtual apoia a proteção das equipes e não substitui a atenção operacional.",
  },
  {
    numero: "5.3",
    titulo: "Protocolo de incidentes - ronda física",
    objetivo:
      "Definir ações imediatas para incidentes encontrados durante ronda física.",
    resumo:
      "O agente deve agir de forma segura diante de intrusão, porta aberta, arrombamento, princípio de incêndio ou falha de iluminação.",
    responsabilidades: [
      "Não confrontar intrusão ou invasão sozinho.",
      "Isolar a área, recuar e acionar reforço via rádio quando necessário.",
      "Registrar falhas para posterior confecção de RE e apontamentos de vulnerabilidade.",
    ],
    pontos: [
      "Porta aberta ou arrombada exige comunicação ao CCOS e varredura antes de fechamento.",
      "Princípio de incêndio exige avaliação segura e acionamento da brigada, SSMA ou Bombeiros.",
      "Falha de iluminação deve gerar registro, correção e intensificação da vigilância.",
    ],
    atencao: "A segurança do agente vem antes da intervenção direta.",
  },
  {
    numero: "5.4",
    titulo: "Protocolo de incidentes - ronda via câmera",
    objetivo:
      "Definir ações imediatas do CCOS diante de incidentes identificados por câmera.",
    resumo:
      "O CCOS deve manter a câmera no evento, ampliar campo de visão, acionar equipes e registrar o fato conforme procedimento.",
    responsabilidades: [
      "Manter a câmera no evento e acionar câmeras adjacentes.",
      "Acionar equipes de pronta resposta ou autoridades quando necessário.",
      "Informar liderança para averiguação de portas abertas ou arrombadas.",
    ],
    pontos: [
      "Princípio de incêndio exige acionamento da brigada, SSMA ou Bombeiros.",
      "Falhas de iluminação devem gerar RE e direcionamento para correção.",
      "Relatórios devem considerar POC-SEP-001 e matriz FC-1114.",
    ],
    atencao:
      "A preservação da imagem e o acionamento rápido são essenciais para a resposta.",
  },
  {
    numero: "5.5",
    titulo: "Auditorias de Vulnerabilidade Patrimonial - AVP",
    objetivo: "Apresentar a ronda mensal de auditoria patrimonial.",
    resumo:
      "A Segurança Patrimonial executa auditorias mensais em perímetro, armazéns, escritórios, pátio de contêineres e pontos sensíveis para identificar vulnerabilidades.",
    responsabilidades: [
      "Consolidar inconformidades no FC-2158 AVP.",
      "Emitir análise de nível de segurança com fotos, descrições e localização.",
      "Direcionar correções aos responsáveis de cada departamento.",
    ],
    pontos: [
      "Apontamentos são classificados por classe e nível de urgência.",
      "Classes previstas: emergencial, crítica e preventiva.",
      "A análise considera probabilidade, impacto e urgência.",
    ],
    atencao:
      "A AVP reduz vulnerabilidades e orienta correções com base em criticidade.",
  },
  {
    numero: "5.6",
    titulo: "Conclusão",
    objetivo: "Reforçar a importância da padronização das rondas patrimoniais.",
    resumo:
      "A padronização garante controle rigoroso, rastreabilidade, mitigação de incidentes e fortalecimento das barreiras de segurança física.",
    responsabilidades: [
      "Cumprir o procedimento de ronda patrimonial.",
      "Registrar e comunicar desvios identificados.",
      "Contribuir para a integridade do patrimônio, colaboradores e continuidade do negócio.",
    ],
    pontos: [
      "Rondas reduzem vulnerabilidades operacionais.",
      "O procedimento preserva a imagem institucional da organização.",
      "A rastreabilidade fortalece a resposta e a melhoria contínua.",
    ],
    atencao:
      "O cumprimento estrito do procedimento é parte essencial da segurança patrimonial.",
  },
];

const quizBase: PerguntaQuiz[] = [
  {
    pergunta: "Qual é o foco da etapa 5.1 - Ronda física?",
    opcoes: [
      "Orientar preparação, execução e registro da ronda física.",
      "Apenas comunicação informal sem registro.",
      "Somente acompanhamento financeiro do contrato.",
      "Atividade sem relação com segurança patrimonial.",
    ],
    correta: 0,
  },
  {
    pergunta: "Na etapa Ronda física, qual ponto deve ser observado?",
    opcoes: [
      "Teste fechaduras, cadeados, portões, janelas, cercas, mourões, muros e concertinas.",
      "Ação opcional sem necessidade de evidências.",
      "Somente acompanhamento financeiro do contrato.",
      "Procedimento externo sem aplicação operacional.",
    ],
    correta: 0,
  },
  {
    pergunta: "Qual é o foco da etapa 5.2 - Ronda via câmera?",
    opcoes: [
      "Padronizar a ronda remota realizada pelo sistema de CFTV.",
      "Apenas comunicação informal sem registro.",
      "Somente acompanhamento financeiro do contrato.",
      "Atividade sem relação com segurança patrimonial.",
    ],
    correta: 0,
  },
  {
    pergunta: "Na etapa Ronda via câmera, qual ponto deve ser observado?",
    opcoes: [
      "A observação pode iniciar pelo perímetro e seguir para áreas internas.",
      "Ação opcional sem necessidade de evidências.",
      "Somente acompanhamento financeiro do contrato.",
      "Procedimento externo sem aplicação operacional.",
    ],
    correta: 0,
  },
  {
    pergunta:
      "Qual é o foco da etapa 5.3 - Protocolo de incidentes - ronda física?",
    opcoes: [
      "Definir ações imediatas para incidentes encontrados durante ronda física.",
      "Apenas comunicação informal sem registro.",
      "Somente acompanhamento financeiro do contrato.",
      "Atividade sem relação com segurança patrimonial.",
    ],
    correta: 0,
  },
  {
    pergunta:
      "Na etapa Protocolo de incidentes - ronda física, qual ponto deve ser observado?",
    opcoes: [
      "Porta aberta ou arrombada exige comunicação ao CCOS e varredura antes de fechamento.",
      "Ação opcional sem necessidade de evidências.",
      "Somente acompanhamento financeiro do contrato.",
      "Procedimento externo sem aplicação operacional.",
    ],
    correta: 0,
  },
  {
    pergunta:
      "Qual é o foco da etapa 5.4 - Protocolo de incidentes - ronda via câmera?",
    opcoes: [
      "Definir ações imediatas do CCOS diante de incidentes identificados por câmera.",
      "Apenas comunicação informal sem registro.",
      "Somente acompanhamento financeiro do contrato.",
      "Atividade sem relação com segurança patrimonial.",
    ],
    correta: 0,
  },
  {
    pergunta:
      "Na etapa Protocolo de incidentes - ronda via câmera, qual ponto deve ser observado?",
    opcoes: [
      "Princípio de incêndio exige acionamento da brigada, SSMA ou Bombeiros.",
      "Ação opcional sem necessidade de evidências.",
      "Somente acompanhamento financeiro do contrato.",
      "Procedimento externo sem aplicação operacional.",
    ],
    correta: 0,
  },
  {
    pergunta:
      "Qual é o foco da etapa 5.5 - Auditorias de Vulnerabilidade Patrimonial - AVP?",
    opcoes: [
      "Apresentar a ronda mensal de auditoria patrimonial.",
      "Apenas comunicação informal sem registro.",
      "Somente acompanhamento financeiro do contrato.",
      "Atividade sem relação com segurança patrimonial.",
    ],
    correta: 0,
  },
  {
    pergunta:
      "Na etapa Auditorias de Vulnerabilidade Patrimonial - AVP, qual ponto deve ser observado?",
    opcoes: [
      "Apontamentos são classificados por classe e nível de urgência.",
      "Ação opcional sem necessidade de evidências.",
      "Somente acompanhamento financeiro do contrato.",
      "Procedimento externo sem aplicação operacional.",
    ],
    correta: 0,
  },
  {
    pergunta: "Qual é o foco da etapa 5.6 - Conclusão?",
    opcoes: [
      "Reforçar a importância da padronização das rondas patrimoniais.",
      "Apenas comunicação informal sem registro.",
      "Somente acompanhamento financeiro do contrato.",
      "Atividade sem relação com segurança patrimonial.",
    ],
    correta: 0,
  },
  {
    pergunta: "Na etapa Conclusão, qual ponto deve ser observado?",
    opcoes: [
      "Rondas reduzem vulnerabilidades operacionais.",
      "Ação opcional sem necessidade de evidências.",
      "Somente acompanhamento financeiro do contrato.",
      "Procedimento externo sem aplicação operacional.",
    ],
    correta: 0,
  },
  {
    pergunta:
      "Conforme a Ronda física, qual responsabilidade faz parte do procedimento?",
    opcoes: [
      "Verificar EPIs, comunicação e acessos antes do deslocamento.",
      "Atividade sem relação com segurança patrimonial.",
      "Apenas comunicação informal sem registro.",
      "Procedimento externo sem aplicação operacional.",
    ],
    correta: 0,
  },
  {
    pergunta:
      "Conforme a Ronda via câmera, qual responsabilidade faz parte do procedimento?",
    opcoes: [
      "Verificar status das câmeras e nitidez das imagens.",
      "Atividade sem relação com segurança patrimonial.",
      "Apenas comunicação informal sem registro.",
      "Procedimento externo sem aplicação operacional.",
    ],
    correta: 0,
  },
  {
    pergunta:
      "Conforme a Protocolo de incidentes - ronda física, qual responsabilidade faz parte do procedimento?",
    opcoes: [
      "Não confrontar intrusão ou invasão sozinho.",
      "Atividade sem relação com segurança patrimonial.",
      "Apenas comunicação informal sem registro.",
      "Procedimento externo sem aplicação operacional.",
    ],
    correta: 0,
  },
];

const fundoMobileUrl = "/images/treinamento-terminal/fundo-para-movel.png";
const fundoDesktopUrl = "/images/treinamento-terminal/fundo-para-desktop.jpeg";

function apenasDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

function mascararCpf(valor: string) {
  const digitos = apenasDigitos(valor).slice(0, 11);
  return digitos
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function cpfValido(cpf: string) {
  const digitos = apenasDigitos(cpf);
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

function emailValido(email: string) {
  const normalizado = email.trim();
  if (!normalizado || normalizado.length > 254 || normalizado.includes(".."))
    return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizado);
}

function embaralhar<T>(itens: T[]) {
  return [...itens].sort(() => Math.random() - 0.5);
}

function embaralharQuiz(perguntas: PerguntaQuiz[]) {
  return embaralhar(
    perguntas.map((pergunta, baseIndex) => ({ ...pergunta, baseIndex })),
  ).map((pergunta) => {
    const opcoes = embaralhar(
      pergunta.opcoes.map((texto, index) => ({
        texto,
        correta: index === pergunta.correta,
        originalIndex: index,
      })),
    );
    return {
      pergunta: pergunta.pergunta,
      opcoes: opcoes.map((opcao) => opcao.texto),
      correta: opcoes.findIndex((opcao) => opcao.correta),
      baseIndex: pergunta.baseIndex,
      opcoesOriginais: opcoes.map((opcao) => opcao.originalIndex),
    };
  });
}

export default function TreinamentoPocSep002Publico() {
  const [quiz] = useState(() => embaralharQuiz(quizBase));
  const [indiceSecao, setIndiceSecao] = useState(0);
  const [respostas, setRespostas] = useState<Array<number | null>>(() =>
    quiz.map(() => null),
  );
  const [indicePerguntaQuiz, setIndicePerguntaQuiz] = useState(0);
  const [mostrarResultado, setMostrarResultado] = useState(false);
  const [form, setForm] = useState(formInicial);
  const [unidades, setUnidades] = useState<string[]>([]);
  const [treinamento, setTreinamento] = useState<RegistroTreinamento | null>(
    null,
  );
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [buscandoCadastro, setBuscandoCadastro] = useState(false);
  const [resultadoQuiz, setResultadoQuiz] = useState<{
    aprovado: boolean;
    nota: number;
    acertos: number;
  } | null>(null);
  const [assinaturaVazia, setAssinaturaVazia] = useState(true);
  const [assinando, setAssinando] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const secaoAtual = secoes[indiceSecao];
  const indiceQuiz = secoes.length;
  const indiceResultado = secoes.length + 1;
  const indiceAssinatura = secoes.length + 2;
  const etapaQuiz = indiceSecao === indiceQuiz;
  const etapaResultado = indiceSecao === indiceResultado;
  const etapaAssinatura = indiceSecao >= indiceAssinatura;

  useEffect(() => {
    axios
      .get("/api/public/treinamento-poc-sep-002/unidades")
      .then((response) => {
        const lista = Array.isArray(response.data?.unidades)
          ? response.data.unidades
          : [];
        setUnidades(lista);
        setForm((atual) => ({ ...atual, unidade: atual.unidade || "" }));
      })
      .catch(() => undefined);
  }, []);

  const acertos = useMemo(
    () =>
      respostas.reduce<number>(
        (total, resposta, index) =>
          total + (resposta === quiz[index].correta ? 1 : 0),
        0,
      ),
    [respostas],
  );

  function avancar() {
    setMostrarResultado(false);
    setIndiceSecao((atual) => Math.min(secoes.length, atual + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function voltar() {
    setMostrarResultado(false);
    setIndiceSecao((atual) => Math.max(0, atual - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selecionarResposta(pergunta: number, opcao: number) {
    setRespostas((atuais) =>
      atuais.map((item, index) => (index === pergunta ? opcao : item)),
    );
  }

  function alterar(nome: keyof typeof formInicial, valor: string) {
    if (nome === "cpf") valor = mascararCpf(valor);
    setForm((atual) => ({ ...atual, [nome]: valor }));
  }

  async function buscarCadastro(identificador: string) {
    const valor = identificador.trim();
    if (!valor) return;
    const cpf = mascararCpf(valor);
    const podeBuscar = emailValido(valor) || cpfValido(cpf);
    if (!podeBuscar) return;

    setBuscandoCadastro(true);
    try {
      const response = await axios.get(
        "/api/public/treinamento-poc-sep-002/participante",
        {
          params: { identificador: valor },
        },
      );
      const participante = response.data?.participante;
      if (!participante) return;

      setForm((atual) => ({
        ...atual,
        nomeCompleto: participante.nomeCompleto || atual.nomeCompleto,
        cpf: mascararCpf(participante.cpf || atual.cpf),
        email: participante.email || atual.email,
        unidade: participante.unidade || atual.unidade,
      }));
      setMensagem(
        "Cadastro localizado no JetGuard. Confira os dados e inicie o treinamento.",
      );
    } catch {
      return;
    } finally {
      setBuscandoCadastro(false);
    }
  }

  async function iniciar(event: FormEvent) {
    event.preventDefault();
    if (!form.nomeCompleto.trim()) {
      setMensagem("Informe o nome completo para continuar.");
      return;
    }
    if (!cpfValido(form.cpf)) {
      setMensagem("Informe um CPF válido para continuar.");
      return;
    }
    if (!emailValido(form.email)) {
      setMensagem("Informe um e-mail válido para continuar.");
      return;
    }
    if (!form.unidade) {
      setMensagem("Selecione a unidade para continuar.");
      return;
    }
    setCarregando(true);
    setMensagem("");
    try {
      const response = await axios.post(
        "/api/public/treinamento-poc-sep-002/iniciar",
        form,
      );
      const registro = response.data.treinamento as RegistroTreinamento;
      setTreinamento(registro);
      if (registro.nota !== null && registro.nota !== undefined) {
        const acertosEstimados = Math.round(
          (Number(registro.nota) / 100) * quiz.length,
        );
        const aprovado = Number(registro.nota) >= 80;
        setResultadoQuiz({
          aprovado,
          nota: Number(registro.nota),
          acertos: acertosEstimados,
        });
        setIndiceSecao(
          registro.certificadoUrl
            ? indiceAssinatura
            : aprovado
              ? indiceAssinatura
              : indiceResultado,
        );
      } else {
        setIndiceSecao(
          Math.max(0, Math.min(secoes.length, (registro.etapaAtual || 1) - 1)),
        );
      }
    } catch (error: any) {
      setMensagem(
        error.response?.data?.error ||
          "Não foi possível iniciar o treinamento.",
      );
    } finally {
      setCarregando(false);
    }
  }

  async function concluirEtapaAtual() {
    if (!treinamento) return;
    setCarregando(true);
    setMensagem("");
    try {
      const response = await axios.put(
        `/api/public/treinamento-poc-sep-002/${treinamento.token}/etapa`,
        {
          etapa: indiceSecao + 1,
        },
      );
      setTreinamento(response.data.treinamento);
      avancar();
    } catch (error: any) {
      setMensagem(
        error.response?.data?.error || "Não foi possível salvar a etapa.",
      );
    } finally {
      setCarregando(false);
    }
  }

  async function validarQuiz() {
    if (!treinamento) return;
    if (respostas.some((resposta) => resposta === null)) {
      setMostrarResultado(true);
      setIndicePerguntaQuiz(
        Math.max(
          0,
          respostas.findIndex((resposta) => resposta === null),
        ),
      );
      setMensagem("Responda todas as questões antes de validar.");
      return;
    }
    setCarregando(true);
    setMensagem("");
    try {
      const respostasOriginais = quizBase.map<number | null>(() => null);
      respostas.forEach((resposta, perguntaIndex) => {
        const pergunta = quiz[perguntaIndex];
        if (resposta !== null)
          respostasOriginais[pergunta.baseIndex] =
            pergunta.opcoesOriginais[resposta];
      });
      const response = await axios.post(
        `/api/public/treinamento-poc-sep-002/${treinamento.token}/quiz`,
        {
          respostas: respostasOriginais,
        },
      );
      setResultadoQuiz({
        aprovado: response.data.aprovado,
        nota: response.data.nota,
        acertos: response.data.acertos,
      });
      setTreinamento(response.data.treinamento);
      setMostrarResultado(true);
      setIndiceSecao(indiceResultado);
      if (!response.data.aprovado) {
        const primeiraIncorreta = respostas.findIndex(
          (resposta, index) => resposta !== quiz[index].correta,
        );
        setIndicePerguntaQuiz(Math.max(0, primeiraIncorreta));
      }
      setMensagem(
        response.data.aprovado
          ? "Você atingiu a nota mínima. Avance para assinatura e emissão do certificado."
          : "Você não atingiu a nota mínima de 80%. Revise as perguntas e tente novamente.",
      );
    } catch (error: any) {
      setMensagem(
        error.response?.data?.error || "Não foi possível validar a avaliação.",
      );
    } finally {
      setCarregando(false);
    }
  }

  function prepararCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const escala = window.devicePixelRatio || 1;
    canvas.width = rect.width * escala;
    canvas.height = rect.height * escala;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(escala, escala);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.4;
    setAssinaturaVazia(true);
  }

  useEffect(() => {
    if (!etapaAssinatura) return;
    prepararCanvas();
  }, [etapaAssinatura]);

  function pontoCanvas(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function iniciarAssinatura(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(event.pointerId);
    const ponto = pontoCanvas(event);
    ctx.beginPath();
    ctx.moveTo(ponto.x, ponto.y);
    setAssinando(true);
    setAssinaturaVazia(false);
  }

  function moverAssinatura(event: PointerEvent<HTMLCanvasElement>) {
    if (!assinando) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const ponto = pontoCanvas(event);
    ctx.lineTo(ponto.x, ponto.y);
    ctx.stroke();
  }

  function finalizarAssinatura() {
    setAssinando(false);
  }

  async function concluirComAssinatura() {
    if (!treinamento || !canvasRef.current) return;
    if (assinaturaVazia) {
      setMensagem("Assine no campo indicado para emitir o certificado.");
      return;
    }
    setCarregando(true);
    setMensagem("");
    try {
      const response = await axios.post(
        `/api/public/treinamento-poc-sep-002/${treinamento.token}/concluir`,
        {
          assinaturaDataUrl: canvasRef.current.toDataURL("image/png"),
        },
      );
      setTreinamento(response.data.treinamento);
      setMensagem(response.data.mensagem || "Certificado emitido com sucesso.");
    } catch (error: any) {
      setMensagem(
        error.response?.data?.error || "Não foi possível emitir o certificado.",
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="treinamento-terminal-publico relative min-h-screen overflow-hidden bg-[#eef0f7] text-slate-950">
      <picture className="fixed inset-0 z-0 block h-full w-full">
        <source media="(min-width: 768px)" srcSet={fundoDesktopUrl} />
        <img
          src={fundoMobileUrl}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover object-center"
        />
      </picture>
      <div className="fixed inset-0 z-0 bg-white/45" />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        <div className="terminal-panel mb-5 flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 shadow-xl sm:mb-8 sm:px-5 sm:py-4">
          <div>
            <p className="terminal-eyebrow text-xs font-black uppercase text-blue-700">
              POC-SEP-002
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Ronda Patrimonial
            </h1>
          </div>
          <ShieldCheck className="h-9 w-9 shrink-0 text-blue-600 sm:h-10 sm:w-10" />
        </div>

        {!treinamento && (
          <form
            onSubmit={iniciar}
            className="terminal-panel rounded-2xl border p-4 shadow-2xl sm:p-6"
          >
            <p className="terminal-eyebrow text-sm font-black uppercase text-blue-700">
              Acesso corporativo
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Identifique-se para iniciar
            </h2>
            <p className="mt-2 text-sm font-extrabold leading-6 text-slate-950">
              Este treinamento é exclusivo para colaboradores da Movecta.
              Preencha seus dados para iniciar ou continuar.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="terminal-label block text-sm font-extrabold">
                Nome completo
                <input
                  value={form.nomeCompleto}
                  onChange={(event) =>
                    alterar("nomeCompleto", event.target.value)
                  }
                  required
                  placeholder="Digite seu nome completo"
                  className="terminal-input mt-2.5 w-full rounded-2xl border px-4 py-3.5 text-[15px] font-semibold outline-none transition"
                />
              </label>
              <label className="terminal-label block text-sm font-extrabold">
                CPF
                <input
                  value={form.cpf}
                  onChange={(event) => alterar("cpf", event.target.value)}
                  onBlur={(event) => buscarCadastro(event.target.value)}
                  inputMode="numeric"
                  maxLength={14}
                  required
                  placeholder="000.000.000-00"
                  aria-invalid={form.cpf.length === 14 && !cpfValido(form.cpf)}
                  title="Digite um CPF válido"
                  className="terminal-input mt-2.5 w-full rounded-2xl border px-4 py-3.5 text-[15px] font-semibold outline-none transition"
                />
              </label>
              <label className="terminal-label block text-sm font-extrabold">
                E-mail corporativo
                <input
                  value={form.email}
                  onChange={(event) => alterar("email", event.target.value)}
                  onBlur={(event) => buscarCadastro(event.target.value)}
                  type="email"
                  required
                  placeholder="nome.sobrenome@movecta.com.br"
                  className="terminal-input mt-2.5 w-full rounded-2xl border px-4 py-3.5 text-[15px] font-semibold outline-none transition"
                />
              </label>
              <label className="terminal-label block text-sm font-extrabold">
                Unidade
                <select
                  value={form.unidade}
                  onChange={(event) => alterar("unidade", event.target.value)}
                  required
                  className="terminal-input mt-2.5 w-full rounded-2xl border px-4 py-3.5 text-[15px] font-semibold outline-none transition"
                >
                  <option value="">Selecione sua unidade</option>
                  {unidades.map((unidade) => (
                    <option key={unidade} value={unidade}>
                      {unidade}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {mensagem && (
              <div className="terminal-message mt-4 whitespace-pre-line rounded-xl border px-4 py-3 text-sm font-black shadow-lg">
                {mensagem}
              </div>
            )}
            {buscandoCadastro && (
              <p className="mt-3 text-sm font-black text-blue-700">
                Consultando cadastro no JetGuard...
              </p>
            )}
            <button
              disabled={carregando}
              className="terminal-primary-action mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-black shadow-lg transition disabled:opacity-60 sm:w-auto"
            >
              {carregando ? "Validando..." : "Iniciar treinamento"}
            </button>
          </form>
        )}

        {treinamento && (
          <div className="terminal-info-card mb-5 rounded-xl border p-4 text-sm font-bold shadow-sm">
            <p className="font-black text-slate-950">
              {treinamento.nomeCompleto}
            </p>
            <p>
              {treinamento.cpf || "-"} | {treinamento.email}
            </p>
            <p>
              {treinamento.cargo || "-"} | {treinamento.departamento || "-"} |{" "}
              {treinamento.unidade || "-"}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${treinamento.porcentagem}%` }}
              />
            </div>
            <p className="mt-1 text-xs font-black text-blue-700">
              {treinamento.porcentagem}% concluído
            </p>
          </div>
        )}

        {treinamento && (
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => {
                setMostrarResultado(false);
                setIndiceSecao(
                  Math.min(
                    secoes.length - 1,
                    Math.max(0, (treinamento.etapaAtual || 1) - 1),
                  ),
                );
              }}
              className={`terminal-step rounded-2xl border px-4 py-3 text-sm font-black shadow-lg shadow-slate-900/10 ${
                !etapaQuiz && !etapaResultado && !etapaAssinatura
                  ? "terminal-step-active"
                  : "terminal-step-idle"
              }`}
            >
              POC-SEP-002
            </button>
            <button
              type="button"
              disabled={(treinamento?.etapaAtual || 1) < 7}
              onClick={() => setIndiceSecao(indiceQuiz)}
              className={`terminal-step rounded-2xl border px-4 py-3 text-sm font-black shadow-lg shadow-slate-900/10 ${
                etapaQuiz ? "terminal-step-active" : "terminal-step-idle"
              } disabled:cursor-not-allowed disabled:opacity-45`}
            >
              Quiz
            </button>
            <button
              type="button"
              disabled={!resultadoQuiz}
              onClick={() => setIndiceSecao(indiceResultado)}
              className={`terminal-step rounded-2xl border px-4 py-3 text-sm font-black shadow-lg shadow-slate-900/10 ${
                etapaResultado ? "terminal-step-active" : "terminal-step-idle"
              } disabled:cursor-not-allowed disabled:opacity-45`}
            >
              Resultado
            </button>
            <button
              type="button"
              disabled={!resultadoQuiz?.aprovado}
              onClick={() => setIndiceSecao(indiceAssinatura)}
              className={`terminal-step rounded-2xl border px-4 py-3 text-sm font-black shadow-lg shadow-slate-900/10 ${
                etapaAssinatura ? "terminal-step-active" : "terminal-step-idle"
              } disabled:cursor-not-allowed disabled:opacity-45`}
            >
              Assinatura
            </button>
          </div>
        )}

        {treinamento && !etapaQuiz && !etapaResultado && !etapaAssinatura ? (
          <div className="terminal-panel rounded-2xl border p-4 shadow-2xl sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="terminal-eyebrow text-sm font-black uppercase text-blue-700">
                  POC-SEP-002
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  {secaoAtual.titulo}
                </h2>
              </div>
              <div className="terminal-info-card rounded-xl border px-4 py-3 text-sm font-black shadow-sm">
                Leitura {indiceSecao + 1} de {secoes.length}
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="terminal-info-card rounded-xl border p-4 shadow-sm">
                <p className="terminal-eyebrow text-xs font-black uppercase text-blue-700">
                  Objetivo
                </p>
                <p className="mt-2 text-sm font-black leading-6 text-slate-950">
                  {secaoAtual.objetivo}
                </p>
              </div>
              <div className="terminal-info-card rounded-xl border p-4 shadow-sm">
                <p className="terminal-eyebrow text-xs font-black uppercase text-blue-700">
                  Conteúdo resumido
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-800">
                  {secaoAtual.resumo}
                </p>
              </div>
            </div>

            <div className="mt-5 terminal-info-card rounded-xl border p-4 shadow-sm">
              <p className="terminal-eyebrow text-xs font-black uppercase text-blue-700">
                Principais responsabilidades
              </p>
              <div className="mt-3 grid gap-2">
                {secaoAtual.responsabilidades.map((responsabilidade) => (
                  <div
                    key={responsabilidade}
                    className="flex gap-3 text-sm font-bold leading-6 text-slate-800"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                    <span>{responsabilidade}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <p className="terminal-eyebrow text-xs font-black uppercase text-blue-700">
                Pontos importantes
              </p>
              {secaoAtual.pontos.map((ponto) => (
                <div
                  key={ponto}
                  className="terminal-info-card flex gap-3 rounded-xl border p-4 text-sm font-bold leading-6 shadow-sm"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                  <span>{ponto}</span>
                </div>
              ))}
            </div>

            <div className="terminal-attention mt-5 rounded-xl border px-4 py-3 text-sm font-black leading-6 shadow-sm">
              Atenção: {secaoAtual.atencao}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={voltar}
                disabled={indiceSecao === 0}
                className="terminal-secondary-action inline-flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-black shadow-lg transition disabled:opacity-50 sm:w-auto"
              >
                <ArrowLeft size={18} /> Voltar
              </button>
              <button
                type="button"
                disabled={carregando}
                onClick={concluirEtapaAtual}
                className="terminal-primary-action inline-flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-black shadow-lg transition disabled:opacity-60 sm:w-auto"
              >
                {carregando ? "Salvando..." : "Li e compreendi esta etapa"}{" "}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        ) : treinamento && etapaQuiz ? (
          <div className="terminal-panel rounded-2xl border p-4 shadow-2xl sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="terminal-eyebrow text-sm font-black uppercase text-blue-700">
                  Avaliação
                </p>
                <h2 className="mt-2 text-2xl font-black">Quiz POC-SEP-002</h2>
                <p className="mt-2 text-sm font-bold text-slate-700">
                  Responda as 15 questões com base no procedimento estudado.
                </p>
              </div>
              <FileText className="h-10 w-10 text-blue-700" />
            </div>

            <div className="mt-6 grid gap-4">
              {quiz.map((item, perguntaIndex) => {
                if (perguntaIndex !== indicePerguntaQuiz) return null;
                const resposta = respostas[perguntaIndex];
                const respondida = resposta !== null;
                const incorreta = mostrarResultado && resposta !== item.correta;
                return (
                  <div
                    key={item.pergunta}
                    className={`terminal-info-card rounded-2xl border p-4 shadow-sm ${incorreta ? "border-red-400 ring-2 ring-red-300" : ""}`}
                  >
                    <p className="text-sm font-black text-slate-950">
                      {perguntaIndex + 1}. {item.pergunta}
                    </p>
                    {incorreta && (
                      <p className="terminal-quiz-error mt-2 rounded-xl border px-3 py-2 text-sm font-black">
                        Resposta incorreta. Revise esta questão.
                      </p>
                    )}
                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {item.opcoes.map((opcao, opcaoIndex) => (
                        <button
                          key={opcao}
                          type="button"
                          onClick={() =>
                            selecionarResposta(perguntaIndex, opcaoIndex)
                          }
                          className={`terminal-quiz-option rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${
                            resposta === opcaoIndex
                              ? "terminal-quiz-option-active shadow-lg shadow-blue-700/20"
                              : "terminal-quiz-option-idle"
                          }`}
                        >
                          {String.fromCharCode(65 + opcaoIndex)}. {opcao}
                        </button>
                      ))}
                    </div>
                    {!respondida && mostrarResultado && (
                      <p className="terminal-quiz-error mt-2 rounded-xl border px-3 py-2 text-sm font-black">
                        Selecione uma alternativa para esta questão.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-sm">
              <button
                type="button"
                onClick={() =>
                  setIndicePerguntaQuiz((atual) => Math.max(0, atual - 1))
                }
                disabled={indicePerguntaQuiz === 0}
                className="terminal-secondary-action inline-flex items-center gap-2 rounded-xl border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowLeft size={16} /> Pergunta anterior
              </button>
              <span>
                Questão {indicePerguntaQuiz + 1} de {quiz.length}
              </span>
              <button
                type="button"
                onClick={() =>
                  setIndicePerguntaQuiz((atual) =>
                    Math.min(quiz.length - 1, atual + 1),
                  )
                }
                disabled={indicePerguntaQuiz === quiz.length - 1}
                className="terminal-secondary-action inline-flex items-center gap-2 rounded-xl border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Próxima pergunta <ArrowRight size={16} />
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={voltar}
                className="terminal-secondary-action inline-flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-black shadow-lg transition sm:w-auto"
              >
                <ArrowLeft size={18} /> Voltar às etapas
              </button>
              <button
                type="button"
                disabled={carregando}
                onClick={validarQuiz}
                className="terminal-primary-action inline-flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-black shadow-lg transition disabled:opacity-60 sm:w-auto"
              >
                {carregando ? "Validando..." : "Validar respostas"}
              </button>
            </div>
          </div>
        ) : treinamento && etapaResultado ? (
          <div className="terminal-panel rounded-2xl border p-4 shadow-2xl sm:p-6">
            <p className="terminal-eyebrow text-sm font-black uppercase text-blue-700">
              Resultado
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Resultado da avaliação
            </h2>
            <div
              className={`terminal-result-card mt-6 rounded-2xl border-2 bg-white p-5 shadow-xl ${resultadoQuiz?.aprovado ? "border-emerald-500" : "border-blue-500"}`}
            >
              <p
                className={`text-sm font-black uppercase tracking-[0.18em] ${resultadoQuiz?.aprovado ? "text-emerald-700" : "text-blue-700"}`}
              >
                {resultadoQuiz?.aprovado ? "Aprovado" : "Revisão necessária"}
              </p>
              <p className="mt-3 text-4xl font-black text-slate-950">
                {resultadoQuiz?.acertos ?? acertos} de {quiz.length} acertos
              </p>
              <p className="mt-2 text-xl font-black text-slate-900">
                Nota:{" "}
                {resultadoQuiz?.nota ??
                  Math.round((acertos / quiz.length) * 100)}
                %
              </p>
              <p className="mt-3 text-base font-bold text-slate-800">
                É necessário atingir pelo menos 80% de acertos para avançar para
                assinatura e emissão do certificado.
              </p>
            </div>
            {mensagem && (
              <div className="terminal-message mt-4 whitespace-pre-line rounded-xl border px-4 py-3 text-sm font-black shadow-lg">
                {mensagem}
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setIndiceSecao(indiceQuiz)}
                className="terminal-secondary-action inline-flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-black shadow-lg transition sm:w-auto"
              >
                <ArrowLeft size={18} /> Revisar perguntas
              </button>
              {resultadoQuiz?.aprovado && (
                <button
                  type="button"
                  onClick={() => setIndiceSecao(indiceAssinatura)}
                  className="terminal-primary-action inline-flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-black shadow-lg transition sm:w-auto"
                >
                  Avançar para assinatura <ArrowRight size={18} />
                </button>
              )}
            </div>
          </div>
        ) : treinamento && etapaAssinatura ? (
          <div className="terminal-panel rounded-2xl border p-4 shadow-2xl sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="terminal-eyebrow text-sm font-black uppercase text-blue-700">
                  Assinatura
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  Assinatura e emissão do certificado
                </h2>
                <p className="mt-2 text-sm font-bold text-slate-700">
                  Assine no campo abaixo para emitir o certificado e enviá-lo ao
                  e-mail informado.
                </p>
              </div>
              <PenLine className="h-10 w-10 text-blue-700" />
            </div>
            <div className="mt-6 rounded-2xl border border-blue-100 bg-white p-2 shadow-sm ring-1 ring-blue-50">
              <canvas
                ref={canvasRef}
                className="h-44 w-full touch-none rounded-lg bg-white"
                onPointerDown={iniciarAssinatura}
                onPointerMove={moverAssinatura}
                onPointerUp={finalizarAssinatura}
                onPointerCancel={finalizarAssinatura}
              />
            </div>
            {mensagem && (
              <div className="terminal-message mt-4 whitespace-pre-line rounded-xl border px-4 py-3 text-sm font-black shadow-lg">
                {mensagem}
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              {!treinamento.certificadoUrl && (
                <button
                  type="button"
                  onClick={prepararCanvas}
                  className="terminal-secondary-action inline-flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-black shadow-lg transition sm:w-auto"
                >
                  Limpar assinatura
                </button>
              )}
              <button
                type="button"
                disabled={carregando || Boolean(treinamento.certificadoUrl)}
                onClick={concluirComAssinatura}
                className="terminal-primary-action inline-flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-black shadow-lg transition disabled:opacity-60 sm:w-auto"
              >
                {carregando
                  ? "Emitindo..."
                  : treinamento.certificadoUrl
                    ? "Certificado emitido"
                    : "Emitir certificado"}
              </button>
              {treinamento.certificadoUrl && (
                <a
                  href={treinamento.certificadoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="terminal-success-action inline-flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-black shadow-lg transition sm:w-auto"
                >
                  <Download size={18} /> Baixar certificado
                </a>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
