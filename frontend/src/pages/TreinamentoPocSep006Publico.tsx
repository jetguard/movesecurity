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
import { formatarNomePessoa, nomePessoaValido } from "../utils/nomePessoa";

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
  terceirizado: false,
};

const secoesBase: SecaoTreinamento[] = [
  {
    numero: "1",
    titulo: "Atuação do CCOS",
    objetivo: "Apresentar a atuação do Centro de Controle Operacional de Segurança.",
    resumo:
      "O CCOS acompanha as instalações por meio do CFTV, alarmes, sensores e demais recursos eletrônicos, funcionando continuamente 24 horas por dia e 7 dias por semana.",
    responsabilidades: [
      "Apoiar as equipes de campo.",
      "Contribuir para prevenção de riscos e identificação de situações suspeitas.",
      "Comunicar eventos, acompanhar ocorrências e preservar evidências.",
    ],
    pontos: [
      "O monitoramento deve ser feito com atenção constante.",
      "As ações executadas precisam ter resposta rápida e rastreabilidade.",
      "O CCOS também presta suporte às investigações.",
    ],
    atencao: "O CCOS é uma área crítica de monitoramento e suporte às operações de segurança.",
  },
  {
    numero: "2",
    titulo: "Passagem de posto",
    objetivo: "Garantir continuidade do monitoramento entre turnos.",
    resumo:
      "Ao assumir o turno, o Assistente de Segurança - CFTV deve realizar rendição formal com o profissional do turno anterior, preservando informações importantes.",
    responsabilidades: [
      "Ler relatórios anteriores e conhecer ocorrências em andamento.",
      "Verificar câmeras, equipamentos de monitoramento, rádios HT, telefones e sistemas internos.",
      "Comunicar falhas ou pendências identificadas.",
    ],
    pontos: [
      "A passagem de posto evita perda de informações operacionais.",
      "A troca de turno deve ser formal e rastreável.",
      "Pendências precisam ser conhecidas antes do início das atividades.",
    ],
    atencao: "Falhas na passagem de posto podem comprometer a continuidade da segurança.",
  },
  {
    numero: "3",
    titulo: "Monitoramento operacional",
    objetivo: "Orientar o acompanhamento contínuo do sistema de CFTV.",
    resumo:
      "Durante o turno, o operador deve acompanhar o CFTV, realizar varreduras periódicas, observar áreas críticas, identificar situações suspeitas e manter comunicação com as equipes.",
    responsabilidades: [
      "Verificar falhas ou interrupções de câmeras.",
      "Manter a câmera focada ao identificar evento relevante.",
      "Comunicar a equipe responsável e registrar o evento adequadamente.",
    ],
    pontos: [
      "Câmeras adjacentes devem ser utilizadas para ampliar a visão.",
      "O desenvolvimento da situação deve ser acompanhado.",
      "Eventos relevantes exigem comunicação imediata.",
    ],
    atencao: "Ao identificar um evento relevante, a primeira ação é manter a câmera focada.",
  },
  {
    numero: "4",
    titulo: "Ronda eletrônica e apoio às rondas físicas",
    objetivo: "Padronizar a ronda eletrônica e o apoio às equipes em campo.",
    resumo:
      "As rondas eletrônicas são realizadas por CFTV com caráter preventivo. O CCOS também acompanha rondas físicas, observa riscos no trajeto e registra irregularidades.",
    responsabilidades: [
      "Observar muros, cercas, portões, áreas restritas e iluminação de pontos críticos.",
      "Identificar veículos suspeitos, objetos abandonados e sinais de incidentes ou sinistros.",
      "Manter comunicação com os agentes durante as rondas físicas.",
    ],
    pontos: [
      "A ronda eletrônica complementa a ronda física.",
      "O acompanhamento aumenta a capacidade de prevenção.",
      "Irregularidades identificadas devem ser registradas.",
    ],
    atencao: "Ronda eletrônica não substitui integralmente a ronda física; ela complementa a prevenção.",
  },
  {
    numero: "5",
    titulo: "Gestão de ocorrências",
    objetivo: "Definir a atuação do CCOS ao identificar uma ocorrência.",
    resumo:
      "Ao identificar uma ocorrência, o Assistente de Segurança - CFTV deve registrar o fato, informar a liderança, acionar a equipe responsável, acompanhar por câmeras e preservar evidências.",
    responsabilidades: [
      "Registrar, comunicar e acompanhar a ocorrência.",
      "Preservar e registrar evidências disponíveis.",
      "Acionar gestores ou órgãos competentes conforme gravidade e natureza da ocorrência.",
    ],
    pontos: [
      "Podem ser acionados Brigada de Incêndio, Polícia Militar, Polícia Federal, Bombeiros, Guarda Portuária ou outros órgãos competentes.",
      "O acionamento deve seguir a gravidade da ocorrência.",
      "A comunicação à liderança deve ser imediata.",
    ],
    atencao: "Ocorrências exigem registro, comunicação, acompanhamento e preservação de evidências.",
  },
  {
    numero: "6",
    titulo: "Registro das ocorrências",
    objetivo: "Garantir registros completos e rastreáveis.",
    resumo:
      "Todos os registros devem permitir rastreabilidade das ações realizadas, contendo dados essenciais sobre a ocorrência, evidências, câmeras utilizadas e ações adotadas.",
    responsabilidades: [
      "Registrar data, horário, local e descrição detalhada.",
      "Registrar evidências disponíveis e identificação das câmeras utilizadas.",
      "Informar ações adotadas pelo CCOS e pela equipe de segurança.",
    ],
    pontos: [
      "A classificação da criticidade deve constar no relatório.",
      "Registros completos apoiam investigações e auditorias.",
      "Registros incompletos prejudicam análises posteriores.",
    ],
    atencao: "Um registro incompleto pode comprometer investigações, auditorias e análises.",
  },
  {
    numero: "7",
    titulo: "Quadra de Segurança",
    objetivo: "Apresentar os controles relacionados à Quadra de Segurança.",
    resumo:
      "O controle da Quadra de Segurança inclui relatório semanal, acompanhamento dos contêineres armazenados, controles de armazenamento, rondas aleatórias quando necessárias e monitoramento por CFTV.",
    responsabilidades: [
      "Preencher relatório semanal.",
      "Acompanhar contêineres armazenados e controles de armazenamento.",
      "Preservar a rastreabilidade operacional.",
    ],
    pontos: [
      "Nem todas as unidades possuem Quadra de Segurança.",
      "O conteúdo faz parte do procedimento corporativo.",
      "O tema deve ser conhecido por todos os participantes do treinamento.",
    ],
    atencao: "A Quadra de Segurança exige controle, monitoramento e rastreabilidade.",
  },
  {
    numero: "8",
    titulo: "Controle e gestão de lacres",
    objetivo: "Orientar a vistoria e lacração de contêineres vazios.",
    resumo:
      "Os contêineres vazios são vistoriados e lacrados tanto na entrada quanto na saída.",
    responsabilidades: [
      "Contribuir para segurança das operações.",
      "Controlar acesso, integridade e rastreabilidade dos contêineres.",
      "Permitir a identificação do lacre utilizado e da etapa em que foi aplicado.",
    ],
    pontos: [
      "A lacração apoia a prevenção de violações.",
      "O controle deve permitir rastreabilidade.",
      "A vistoria e a lacração são etapas de segurança operacional.",
    ],
    atencao: "A finalidade da lacração é garantir segurança, integridade e rastreabilidade.",
  },
  {
    numero: "9",
    titulo: "Controle de lacres",
    objetivo: "Padronizar a retirada e o registro de lacres.",
    resumo:
      "A retirada de lacres ocorre mediante solicitação formal da área operacional.",
    responsabilidades: [
      "Receber solicitação com quantidade necessária, tipo de lacre e operação relacionada.",
      "Registrar a numeração na planilha F-2020.",
      "Identificar lacres disponibilizados e coletar assinatura da pessoa responsável pelo recebimento.",
    ],
    pontos: [
      "A sequência numérica crescente deve ser mantida preferencialmente.",
      "O controle garante organização e rastreabilidade.",
      "A retirada de lacres não deve ocorrer apenas por comunicação verbal.",
    ],
    atencao: "Antes da retirada de lacres deve existir solicitação formal da área operacional.",
  },
  {
    numero: "10",
    titulo: "Conferência de lacres",
    objetivo: "Orientar a conferência de lacres em operações de saída.",
    resumo:
      "O controle é realizado quando um contêiner carregado deixa a operação. A documentação deve ser conferida e a numeração do lacre verificada.",
    responsabilidades: [
      "Solicitar ao motorista a documentação para conferência.",
      "Verificar a numeração do lacre e identificar possíveis divergências.",
      "Impedir a liberação até a correção quando houver erro.",
    ],
    pontos: [
      "Havendo divergência, o motorista deve retornar à balança para correção.",
      "Quando o contêiner retorna vazio após entrega, deve ser aplicado novo lacre quando aplicável.",
      "O objetivo é garantir rastreabilidade e controle operacional.",
    ],
    atencao: "Divergências de lacre devem ser corrigidas antes da liberação.",
  },
  {
    numero: "11",
    titulo: "Controle de acesso ao CCOS",
    objetivo: "Definir regras de acesso ao CCOS.",
    resumo:
      "O acesso ao CCOS é restrito aos profissionais autorizados da Segurança Patrimonial e demais pessoas autorizadas pela gestão.",
    responsabilidades: [
      "Autorizar e registrar acessos ao CCOS.",
      "Permitir acesso de manutenção, auditores, órgãos reguladores ou visitantes autorizados quando aprovado.",
      "Impedir entrada sem autorização e registro.",
    ],
    pontos: [
      "Todo acesso deve ser registrado em relatório operacional.",
      "Nenhuma pessoa deve entrar no CCOS sem autorização.",
      "O controle de acesso protege a operação e as informações monitoradas.",
    ],
    atencao: "Somente pessoas autorizadas e com acesso registrado podem entrar no CCOS.",
  },
  {
    numero: "12",
    titulo: "Disponibilização de imagens e particularidades regionais",
    objetivo: "Orientar a disponibilização de imagens do CFTV.",
    resumo:
      "As imagens do CFTV somente podem ser disponibilizadas mediante autorização da gestão de Segurança Patrimonial. Solicitações formais devem ser apresentadas por documento oficial quando aplicável.",
    responsabilidades: [
      "Disponibilizar imagens apenas com autorização da gestão.",
      "Exigir documento oficial para órgãos públicos ou investigações formais.",
      "Observar particularidades regionais reconhecidas pelo procedimento.",
    ],
    pontos: [
      "No Sul, algumas atribuições podem ser exercidas pelo Líder de Segurança.",
      "No Sudeste, devem ser observadas as instruções locais do CCOS.",
      "No Nordeste, podem existir adaptações relacionadas à infraestrutura.",
    ],
    atencao: "Imagens de CFTV não devem ser disponibilizadas livremente por solicitação verbal.",
  },
];

const secoes = [...secoesBase].sort(
  (a, b) => Number(a.numero) - Number(b.numero),
);

const quizBase: PerguntaQuiz[] = [
  {
    pergunta: "Qual é uma das principais atribuições do CCOS?",
    opcoes: [
      "Monitorar as instalações e apoiar as equipes de segurança.",
      "Administrar contratos comerciais.",
      "Controlar pagamentos de fornecedores.",
      "Emitir documentos fiscais.",
    ],
    correta: 0,
  },
  {
    pergunta: "Qual é o objetivo principal da passagem de posto?",
    opcoes: [
      "Garantir a continuidade do monitoramento e das informações operacionais.",
      "Encerrar todas as ocorrências abertas.",
      "Desligar os equipamentos do turno anterior.",
      "Liberar o acesso de visitantes.",
    ],
    correta: 0,
  },
  {
    pergunta: "Ao identificar um evento relevante, qual deve ser a primeira ação do operador?",
    opcoes: [
      "Manter a câmera focada no evento.",
      "Desligar a câmera.",
      "Encerrar o turno.",
      "Esperar a confirmação do próximo operador.",
    ],
    correta: 0,
  },
  {
    pergunta: "Qual é a finalidade da ronda eletrônica?",
    opcoes: [
      "Complementar preventivamente as atividades de segurança.",
      "Substituir integralmente a ronda física.",
      "Controlar somente o estacionamento.",
      "Registrar apenas falhas de iluminação.",
    ],
    correta: 0,
  },
  {
    pergunta: "Ao identificar uma ocorrência, o operador deve:",
    opcoes: [
      "Registrar, comunicar a liderança, acompanhar e preservar evidências.",
      "Apenas comunicar verbalmente.",
      "Aguardar o encerramento para registrar.",
      "Acionar sempre todos os órgãos externos.",
    ],
    correta: 0,
  },
  {
    pergunta: "Qual conjunto de informações deve constar no registro de uma ocorrência?",
    opcoes: [
      "Data, horário, local, descrição, evidências, câmeras e ações adotadas.",
      "Apenas nome do operador e horário.",
      "Somente imagens.",
      "Apenas o nome das pessoas envolvidas.",
    ],
    correta: 0,
  },
  {
    pergunta: "Qual atividade está relacionada ao controle da Quadra de Segurança?",
    opcoes: [
      "Relatórios semanais, acompanhamento dos contêineres e rondas no local.",
      "Controle de folha de pagamento.",
      "Emissão de notas fiscais.",
      "Controle exclusivo de visitantes.",
    ],
    correta: 0,
  },
  {
    pergunta: "Qual é uma finalidade da lacração dos contêineres vazios?",
    opcoes: [
      "Garantir segurança, integridade e rastreabilidade.",
      "Controlar o peso da carga.",
      "Substituir a vistoria.",
      "Registrar a presença do motorista.",
    ],
    correta: 0,
  },
  {
    pergunta: "O que deve ocorrer antes da retirada dos lacres?",
    opcoes: [
      "Solicitação formal da área operacional, com quantidade e tipo de lacre.",
      "Apenas uma comunicação verbal do motorista.",
      "Autorização de qualquer colaborador.",
      "Nenhum registro é necessário.",
    ],
    correta: 0,
  },
  {
    pergunta: "O que deve acontecer quando houver divergência na numeração do lacre?",
    opcoes: [
      "O motorista deve retornar à balança para correção.",
      "O veículo deve ser liberado normalmente.",
      "O lacre deve ser ignorado.",
      "A ocorrência deve ser registrada somente no final do mês.",
    ],
    correta: 0,
  },
  {
    pergunta: "Quem pode acessar o CCOS?",
    opcoes: [
      "Somente pessoas autorizadas e com acesso registrado.",
      "Qualquer colaborador.",
      "Apenas motoristas.",
      "Qualquer fornecedor.",
    ],
    correta: 0,
  },
  {
    pergunta: "Como deve ocorrer a disponibilização de imagens do CFTV?",
    opcoes: [
      "Somente com autorização da gestão ou documento oficial quando aplicável.",
      "Livremente, mediante solicitação verbal.",
      "Para qualquer colaborador da empresa.",
      "Apenas após cinco anos.",
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
  return perguntas.map((pergunta, baseIndex) => {
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
      baseIndex,
      opcoesOriginais: opcoes.map((opcao) => opcao.originalIndex),
    };
  });
}

export default function TreinamentoPocSep006Publico() {
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
      .get("/api/public/treinamento-poc-sep-006/unidades")
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
        setMensagem("Digite apenas o nome completo. O e-mail deve ser informado somente no campo de e-mail.");
        return;
      }
      setForm((atual) => ({ ...atual, nomeCompleto: formatarNomePessoa(String(valor)) }));
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
        "/api/public/treinamento-poc-sep-006/participante",
        {
          params: { identificador: valor },
        },
      );
      const participante = response.data?.participante;
      if (!participante) return;

      setForm((atual) => ({
        ...atual,
        nomeCompleto: formatarNomePessoa(participante.nomeCompleto || atual.nomeCompleto),
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
    if (!nomePessoaValido(form.nomeCompleto)) {
      setMensagem("Informe nome completo válido, sem e-mail, com nome e sobrenome.");
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
        "/api/public/treinamento-poc-sep-006/iniciar",
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
        `/api/public/treinamento-poc-sep-006/${treinamento.token}/etapa`,
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
        `/api/public/treinamento-poc-sep-006/${treinamento.token}/quiz`,
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
        `/api/public/treinamento-poc-sep-006/${treinamento.token}/concluir`,
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
              POC-SEP-006
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              CCOS - Centro de Controle Operacional de Segurança
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
              POC-SEP-006
            </button>
            <button
              type="button"
              disabled={(treinamento?.etapaAtual || 1) <= secoes.length}
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
                  POC-SEP-006
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
                <h2 className="mt-2 text-2xl font-black">Quiz POC-SEP-006</h2>
                <p className="mt-2 text-sm font-bold text-slate-700">
                  Responda as {quiz.length} questões com base no procedimento estudado.
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
