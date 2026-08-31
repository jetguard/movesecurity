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
import { ocultarCpf } from "../utils/cpf";
import { formatarNomePessoa, nomePessoaValido } from "../utils/nomePessoa";

type SecaoTreinamento = {
  numero: string;
  titulo: string;
  resumo: string;
  pontos: string[];
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
  terceirizado: false,
};

const secoes: SecaoTreinamento[] = [
  {
    numero: "5",
    titulo: "Descrição do controle de acesso",
    resumo:
      "O controle de acesso dos Terminais Movecta utiliza o sistema Ronda Senior e dispositivos físicos como catracas, torniquetes, cancelas, leitoras de crachá e biometria.",
    pontos: [
      "O acesso ao sistema é restrito à equipe de Controle de Acesso e membros autorizados da Segurança Patrimonial.",
      "O processo busca registrar, validar e controlar o ingresso de pessoas e veículos não atrelados à carga.",
    ],
  },
  {
    numero: "5.1",
    titulo: "Agendamento de acesso",
    resumo:
      "O acesso deve ser autorizado previamente pelo setor responsável e comunicado à Segurança Patrimonial/Portaria por e-mail.",
    pontos: [
      "Devem ser informados nome completo, CPF, empresa e justificativa do acesso.",
      "Quando houver veículo, também devem ser enviados modelo, placa e motivo para ingresso.",
      "A falta de informação obrigatória impede a liberação do acesso.",
    ],
  },
  {
    numero: "5.2",
    titulo: "Liberação de acesso",
    resumo:
      "A entrada é realizada nas portarias, mediante documento oficial com foto, confirmação da liberação prévia, registro fotográfico e biométrico.",
    pontos: [
      "A equipe deve confrontar as informações recebidas por e-mail com os documentos apresentados.",
      "Inconsistências devem ser corrigidas pelo responsável pela liberação antes do acesso.",
      "Acesso com veículo exige condutor previamente liberado, CNH, CRLV e justificativa.",
      "Equipamentos e ferramentas devem ser identificados e registrados quando aplicável.",
    ],
  },
  {
    numero: "5.3",
    titulo: "Cadastro de colaboradores",
    resumo:
      "Colaboradores devem ser cadastrados no BDCC no ato da admissão por Gente & Gestão.",
    pontos: [
      "O início das atividades depende de cadastro, crachá e coleta biométrica.",
      "Em urgência, pode ser usado crachá provisório junto ao setor de Gente & Gestão.",
      "Em perda de crachá, a Segurança deve inviabilizar o crachá perdido e impedir uso por terceiros.",
    ],
  },
  {
    numero: "5.4",
    titulo: "Cadastro de prestadores de serviço",
    resumo:
      "Prestadores devem ser cadastrados no BDCC por sua empresa antes do início das atividades.",
    pontos: [
      "O acesso depende de cadastro concluído e emissão do crachá.",
      "Em urgência, pode haver crachá provisório por até 30 dias.",
      "A recepção consulta a regularidade junto ao controle de SSMA.",
      "Crachá perdido deve ser bloqueado e substituído via empresa prestadora.",
    ],
  },
  {
    numero: "5.5",
    titulo: "Cadastro de visitante",
    resumo:
      "Visitantes eventuais não precisam de cadastro no BDCC, mas o acesso deve ser formalmente autorizado com antecedência.",
    pontos: [
      "A autorização deve ocorrer com antecedência de 24 horas.",
      "Pessoas sem cadastro não podem exceder 5 acessos por mês e 12 por ano.",
      "Visitantes e prestadores devem ser acompanhados durante toda permanência no terminal.",
      "EPIs devem ser entregues e recolhidos com controle específico quando necessário.",
    ],
  },
  {
    numero: "5.6",
    titulo: "Cadastro de despachante",
    resumo:
      "Despachantes de empresa cadastrada no BDCC não seguem limite de acesso e usam crachá próprio.",
    pontos: [
      "Despachante não cadastrado deve ser cadastrado pela Portaria e receber crachá de visitante.",
      "Em indisponibilidade sistêmica, o cadastro deve seguir o fluxo manual e formulários vigentes.",
    ],
  },
  {
    numero: "5.7",
    titulo: "Inspeção visual de entrada e saída",
    resumo:
      "Funcionários e prestadores são submetidos à inspeção visual na entrada ou saída dos terminais.",
    pontos: [
      "Bolsas, mochilas, sacolas e volumes são inspecionados visualmente.",
      "A pessoa inspecionada abre compartimentos e retira pertences quando solicitado.",
      "Pode ser usado bastão detector de metais ou outro recurso não intrusivo.",
      "Objeto suspeito ou proibido exige acionamento da liderança de Segurança.",
    ],
  },
  {
    numero: "5.8",
    titulo: "Autoridades e órgãos intervenientes",
    resumo:
      "Autoridades portuárias, veículos e pessoas em emergência ou casos especiais podem ser dispensados de critérios comuns de acesso e inspeção.",
    pontos: [
      "A dispensa depende de autorização do Supervisor ou Coordenador de Segurança Portuária.",
      "A autorização deve ser comunicada formalmente, por e-mail ou rádio.",
    ],
  },
  {
    numero: "5.9",
    titulo: "Contingências dos sistemas",
    resumo:
      "Quando o Ronda Senior estiver inoperante, as autorizações devem permanecer pelo fluxo de e-mail.",
    pontos: [
      "A equipe deve acionar o Líder de Segurança e abrir chamado junto à T.I.",
      "Após restabelecimento, os registros devem ser lançados retroativamente quando possível.",
      "Registros manuais por contingência exigem autorização do Líder de Segurança.",
    ],
  },
  {
    numero: "5.10",
    titulo: "Acesso de veículos em área alfandegada",
    resumo:
      "Veículos leves ou não atrelados à carga só acessam área alfandegada com permissão antecipada e liberação por crachá.",
    pontos: [
      "Veículo sem autorização deve permanecer em estacionamento externo.",
      "O Agente utiliza o crachá do condutor para liberação na cancela.",
      "Todos os veículos são submetidos à inspeção veicular.",
      "Passageiros não devem acessar pela entrada de veículos; devem usar a entrada de pedestres.",
    ],
  },
  {
    numero: "5.11",
    titulo: "Bloqueios de acesso",
    resumo:
      "O bloqueio de acesso deve ocorrer imediatamente quando colaborador ou prestador continuado for desligado.",
    pontos: [
      "Para colaborador desligado, Gente & Gestão formaliza o desligamento à Segurança Patrimonial.",
      "A Segurança bloqueia crachá, revoga usuários, verifica chaves e retém itens no momento de saída.",
      "Para prestador desligado, a comunicação deve ser feita por e-mail pelos departamentos responsáveis.",
    ],
  },
  {
    numero: "5.12",
    titulo: "Proibições de acesso",
    resumo:
      "A Segurança Patrimonial deve impedir práticas e condições proibidas durante registro e permanência no terminal.",
    pontos: [
      "É proibido acesso sob visível efeito de drogas ou embriaguez.",
      "Crachá é individual, intransferível e não pode ser emprestado.",
      "Menores de 18 anos não acessam área alfandegada, exceto menores aprendizes.",
      "Fotos, vídeos ou áudios só podem ocorrer com autorização formal.",
      "Armas, animais sem amparo legal e comércio de bens/serviços são proibidos.",
    ],
  },
  {
    numero: "5.13",
    titulo: "Níveis de acesso e controle de crachás",
    resumo:
      "Os crachás possuem cores que representam categorias e permissões específicas de acesso.",
    pontos: [
      "Preto identifica Unidade de Segurança.",
      "Verde identifica áreas administrativas.",
      "Laranja identifica motorista.",
      "Roxo identifica agentes de órgãos públicos ou intervenientes.",
    ],
  },
  {
    numero: "5.14",
    titulo: "Controle de chaves",
    resumo:
      "Chaves de áreas comuns ficam nas recepções e chaves de áreas sensíveis ficam sob guarda do CCOS.",
    pontos: [
      "A retirada de chaves comuns deve ser registrada em formulário vigente.",
      "Chaves sensíveis dependem de autorização da liderança e registro formal.",
      "A Segurança Patrimonial deve manter o controle de chaves atualizado.",
    ],
  },
];

const quiz: PerguntaQuiz[] = [
  {
    pergunta:
      "Qual sistema é citado como base do controle de acesso dos Terminais Movecta?",
    opcoes: [
      "Ronda Senior",
      "SAP Financeiro",
      "Controle manual sem sistema",
      "Sistema de despacho",
    ],
    correta: 0,
  },
  {
    pergunta: "Quais dados devem ser enviados para agendamento de acesso?",
    opcoes: [
      "Apenas nome e horário",
      "Nome completo, CPF, empresa e justificativa",
      "Somente placa do veículo",
      "Somente telefone do visitante",
    ],
    correta: 1,
  },
  {
    pergunta: "O que acontece se faltar informação obrigatória no agendamento?",
    opcoes: [
      "O acesso é liberado com observação",
      "O acesso é liberado pela recepção",
      "A liberação de acesso é impedida",
      "O crachá é emitido automaticamente",
    ],
    correta: 2,
  },
  {
    pergunta: "Na liberação de acesso, qual documento deve ser apresentado?",
    opcoes: [
      "Documento oficial com fotografia",
      "Cartão de visita",
      "Comprovante residencial",
      "Somente e-mail impresso",
    ],
    correta: 0,
  },
  {
    pergunta:
      "Para acessar com veículo em área alfandegada, o condutor deve apresentar:",
    opcoes: [
      "Somente autorização verbal",
      "CNH e documentos do veículo",
      "Apenas crachá de visitante",
      "Somente nota fiscal",
    ],
    correta: 1,
  },
  {
    pergunta: "Quem cadastra colaboradores no BDCC no ato da admissão?",
    opcoes: [
      "Recepção",
      "Gente & Gestão",
      "Prestador de serviço",
      "Despachante",
    ],
    correta: 1,
  },
  {
    pergunta:
      "Por quanto tempo pode ser utilizado crachá provisório para prestador em situação de urgência?",
    opcoes: ["7 dias", "15 dias", "30 dias", "90 dias"],
    correta: 2,
  },
  {
    pergunta:
      "Visitantes eventuais devem ter autorização formal com antecedência de:",
    opcoes: ["2 horas", "12 horas", "24 horas", "72 horas"],
    correta: 2,
  },
  {
    pergunta: "Qual é o limite previsto para pessoas sem cadastro?",
    opcoes: [
      "5 acessos por mês e 12 por ano",
      "12 acessos por mês e 5 por ano",
      "Acesso ilimitado",
      "1 acesso por ano",
    ],
    correta: 0,
  },
  {
    pergunta:
      "Na inspeção visual, quem deve abrir bolsas, bolsos ou compartimentos?",
    opcoes: [
      "O Agente de Segurança",
      "A pessoa inspecionada",
      "O motorista da área",
      "O gestor do setor",
    ],
    correta: 1,
  },
  {
    pergunta: "Objeto suspeito ou proibido durante inspeção exige:",
    opcoes: [
      "Liberação com registro",
      "Acionamento imediato da liderança de Segurança",
      "Descarte sem comunicação",
      "Somente aviso verbal ao visitante",
    ],
    correta: 1,
  },
  {
    pergunta:
      "Em caso de Ronda Senior inoperante, as autorizações devem seguir por:",
    opcoes: [
      "Telefone pessoal",
      "Fluxo por e-mail",
      "Acesso livre",
      "Planilha sem autorização",
    ],
    correta: 1,
  },
  {
    pergunta: "Veículos sem autorização para área alfandegada devem:",
    opcoes: [
      "Entrar pela cancela manual",
      "Permanecer em estacionamento externo",
      "Entrar com passageiro",
      "Aguardar dentro do terminal",
    ],
    correta: 1,
  },
  {
    pergunta: "O compartilhamento ou empréstimo de crachá é:",
    opcoes: [
      "Permitido entre colegas",
      "Permitido para visitantes",
      "Proibido, pois o crachá é individual e intransferível",
      "Obrigatório em contingência",
    ],
    correta: 2,
  },
  {
    pergunta: "Chaves de áreas sensíveis ficam sob guarda de qual área?",
    opcoes: [
      "Recepção externa",
      "CCOS",
      "Empresa visitante",
      "Motorista autorizado",
    ],
    correta: 1,
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

export default function TreinamentoPocSep007Publico() {
  const [indiceSecao, setIndiceSecao] = useState(0);
  const [respostas, setRespostas] = useState<Array<number | null>>(
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
      .get("/api/public/treinamento-poc-sep-007/unidades")
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

  function alterar(nome: keyof typeof formInicial, valor: string | boolean) {
    if (nome === "nomeCompleto" && typeof valor === "string") {
      if (valor.includes("@")) {
        setMensagem(
          "Digite apenas o nome completo. O e-mail deve ser informado somente no campo de e-mail.",
        );
        return;
      }
      setForm((atual) => ({
        ...atual,
        nomeCompleto: formatarNomePessoa(String(valor)),
      }));
      return;
    }
    if (nome === "cpf") valor = mascararCpf(String(valor));
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
        "/api/public/treinamento-poc-sep-007/participante",
        {
          params: { identificador: valor },
        },
      );
      const participante = response.data?.participante;
      if (!participante) return;

      setForm((atual) => ({
        ...atual,
        nomeCompleto: formatarNomePessoa(
          participante.nomeCompleto || atual.nomeCompleto,
        ),
        cpf: mascararCpf(participante.cpf || atual.cpf),
        email: participante.email || atual.email,
        unidade: participante.unidade || atual.unidade,
      }));
      setMensagem(
        "Cadastro localizado no MoveSecurity. Confira os dados e inicie o treinamento.",
      );
    } catch {
      return;
    } finally {
      setBuscandoCadastro(false);
    }
  }

  async function iniciar(event: FormEvent) {
    event.preventDefault();
    if (!nomePessoaValido(form.nomeCompleto)) {
      setMensagem(
        "Informe nome completo válido, sem e-mail, com nome e sobrenome.",
      );
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
        "/api/public/treinamento-poc-sep-007/iniciar",
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
        `/api/public/treinamento-poc-sep-007/${treinamento.token}/etapa`,
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
      const response = await axios.post(
        `/api/public/treinamento-poc-sep-007/${treinamento.token}/quiz`,
        {
          respostas,
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
        `/api/public/treinamento-poc-sep-007/${treinamento.token}/concluir`,
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
              POC-SEP-007
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Controle de Acesso de Pessoas e Veículos não Atrelados à Carga
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
              Acesso ao treinamento
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Identifique-se para iniciar
            </h2>
            <p className="mt-2 text-sm font-extrabold leading-6 text-slate-950">
              Este treinamento é destinado a colaboradores Movecta e terceiros
              autorizados. Preencha seus dados para iniciar ou continuar.
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
                {form.terceirizado ? "E-mail pessoal" : "E-mail corporativo"}
                <input
                  value={form.email}
                  onChange={(event) => alterar("email", event.target.value)}
                  onBlur={(event) => buscarCadastro(event.target.value)}
                  type="email"
                  required
                  placeholder={
                    form.terceirizado
                      ? "seuemail@exemplo.com"
                      : "nome.sobrenome@movecta.com.br"
                  }
                  className="terminal-input mt-2.5 w-full rounded-2xl border px-4 py-3.5 text-[15px] font-semibold outline-none transition"
                />
              </label>
              <label className="md:col-span-2 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/90 p-4 text-sm font-extrabold text-slate-900 shadow-sm">
                <input
                  type="checkbox"
                  checked={form.terceirizado}
                  onChange={(event) =>
                    alterar("terceirizado", event.target.checked)
                  }
                  className="mt-1 h-5 w-5 rounded border-blue-300 text-blue-600 accent-blue-600"
                />
                <span>
                  Sou colaborador terceirizado autorizado
                  <span className="mt-1 block text-xs font-bold text-slate-700">
                    Marque esta opção para usar e-mail pessoal. Colaboradores
                    Movecta devem manter o e-mail corporativo.
                  </span>
                </span>
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
                Consultando cadastro no MoveSecurity...
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
              {ocultarCpf(treinamento.cpf) || "-"} | {treinamento.email}
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
              POC-SEP-007
            </button>
            <button
              type="button"
              disabled={(treinamento?.etapaAtual || 1) < 16}
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
                  POC-SEP-007
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  {secaoAtual.titulo}
                </h2>
              </div>
              <div className="terminal-info-card rounded-xl border px-4 py-3 text-sm font-black shadow-sm">
                Leitura {indiceSecao + 1} de {secoes.length}
              </div>
            </div>

            <p className="terminal-info-card mt-5 rounded-xl border p-4 text-base font-bold leading-7 shadow-sm">
              {secaoAtual.resumo}
            </p>

            <div className="mt-5 grid gap-3">
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
                <h2 className="mt-2 text-2xl font-black">Quiz POC-SEP-007</h2>
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
