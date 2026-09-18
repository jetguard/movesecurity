import { useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  LockKeyhole,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UnlockKeyhole,
  UserRound,
} from "lucide-react";
import { api } from "../services/api";
import { cpfVisivelPorPerfil } from "../utils/cpf";
import {
  MODULOS_ACESSO,
  type AcaoAcesso,
  type PermissaoModulo,
  podeSuperAdmin,
} from "../utils/permissoes";

type Usuario = {
  id: number;
  nome: string;
  email: string;
  cpf?: string;
  re?: string;
  setor?: string;
  cargo?: string;
  equipe?: string;
  unidade?: string;
  unidadesPermitidas?: string[];
  empresa?: string;
  terceirizado?: boolean;
  somenteCadastro?: boolean;
  gruposTreinamento?: string[];
  perfilAcesso: string;
  validadorOperacional?: boolean;
  mediadorOperacional?: boolean;
  manutencaoCftv?: boolean;
  statusUsuario: string;
  possuiPinOperacional?: boolean;
  ultimoAcesso?: string | null;
};

type PerfilAcesso = {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string | null;
  permissoes: string[];
  permissoesDetalhadas?: PermissaoModulo[];
  sistema: boolean;
  status: string;
};

const unidades = [
  "GJA-T1",
  "GJA-T2",
  "ITAJAÍ-SC",
  "SUAPE-T1",
  "SUAPE-T2",
  "ANHANGUERA",
];
const equipes = [
  "Equipe A",
  "Equipe B",
  "Equipe C",
  "Equipe D",
  "Administrativo",
];
const gruposTreinamento = [
  "CCOS",
  "Liderança",
  "Balança",
  "Portaria",
  "Terceirizado",
];

const vazio = {
  nome: "",
  email: "",
  cpf: "",
  re: "",
  setor: "",
  cargo: "",
  equipe: "",
  unidade: "GJA-T1",
  unidadesPermitidas: ["GJA-T1"],
  empresa: "Movecta S/A",
  terceirizado: false,
  somenteCadastro: false,
  gruposTreinamento: [] as string[],
  perfilAcesso: "",
  validadorOperacional: false,
  mediadorOperacional: false,
  manutencaoCftv: false,
  statusUsuario: "ATIVO",
  senha: "",
  confirmarSenha: "",
};

const perfilVazio = {
  nome: "",
  descricao: "",
  permissoes: [] as string[],
  permissoesDetalhadas: [] as PermissaoModulo[],
  status: "ATIVO",
};

const acoesPerfil: { chave: AcaoAcesso; label: string }[] = [
  { chave: "leitura", label: "Leitura" },
  { chave: "indicadores", label: "Indicadores" },
  { chave: "criar", label: "Criar" },
  { chave: "editar", label: "Editar" },
  { chave: "excluir", label: "Excluir" },
];

function apenasDigitos(valor: string) {
  return String(valor || "").replace(/\D/g, "");
}

function mascararCpf(valor: string) {
  const digitos = apenasDigitos(valor).slice(0, 11);
  return digitos
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function normalizarBusca(valor: unknown) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizarGrupo(valor: string) {
  const chave = String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  const mapa: Record<string, string> = {
    CCOS: "CCOS",
    LIDERANCA: "LIDERANCA",
    BALANCA: "BALANCA",
    PORTARIA: "PORTARIA",
    TERCEIRIZADO: "TERCEIRIZADO",
  };

  return mapa[chave] || chave;
}

function grupoLabel(valor: string) {
  const normalizado = normalizarGrupo(valor);
  return (
    gruposTreinamento.find((grupo) => normalizarGrupo(grupo) === normalizado) ||
    valor
  );
}

function statusClasse(status: string) {
  if (status === "ATIVO") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (status === "BLOQUEADO") {
    return "bg-red-50 text-red-700 ring-red-200";
  }
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function IconButton({
  title,
  onClick,
  children,
  className = "",
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-950 ${className}`}
    >
      {children}
    </button>
  );
}
export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [perfisAcesso, setPerfisAcesso] = useState<PerfilAcesso[]>([]);
  const [formulario, setFormulario] = useState({ ...vazio });
  const [formPerfil, setFormPerfil] = useState({ ...perfilVazio });
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [perfilEditando, setPerfilEditando] = useState<PerfilAcesso | null>(
    null,
  );
  const [abrirFormulario, setAbrirFormulario] = useState(false);
  const [aba, setAba] = useState<"usuarios" | "perfis">("usuarios");
  const [busca, setBusca] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState("");
  const [senhaReset, setSenhaReset] = useState("");
  const [confirmarReset, setConfirmarReset] = useState("");
  const superAdmin = podeSuperAdmin();
  const perfisDisponiveis = useMemo(() => {
    return perfisAcesso
      .filter((perfil) => perfil.status === "ATIVO")
      .map((perfil) => ({ label: perfil.nome, value: perfil.codigo }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [perfisAcesso]);

  async function carregarUsuarios() {
    const response = await api.get("/usuarios");
    setUsuarios(response.data);
  }

  async function carregarPerfisAcesso() {
    const response = await api.get("/usuarios/perfis-acesso");
    setPerfisAcesso(response.data);
  }

  useEffect(() => {
    carregarUsuarios();
    carregarPerfisAcesso();
  }, [superAdmin]);

  const usuariosFiltrados = useMemo(() => {
    const texto = normalizarBusca(busca);
    const numerosBusca = apenasDigitos(busca);
    return usuarios.filter((usuario) => {
      const grupos = (usuario.gruposTreinamento || []).join(" ");
      const bateBusca =
        !texto ||
        normalizarBusca(usuario.nome).includes(texto) ||
        normalizarBusca(usuario.email).includes(texto) ||
        normalizarBusca(usuario.re).includes(texto) ||
        normalizarBusca(grupos).includes(texto) ||
        (numerosBusca.length > 0 &&
          apenasDigitos(usuario.cpf || "").includes(numerosBusca));

      return (
        bateBusca &&
        (!filtroPerfil || usuario.perfilAcesso === filtroPerfil) &&
        (!filtroStatus || usuario.statusUsuario === filtroStatus) &&
        (!filtroGrupo ||
          (usuario.gruposTreinamento || []).some(
            (grupo) => normalizarGrupo(grupo) === normalizarGrupo(filtroGrupo),
          ))
      );
    });
  }, [busca, filtroGrupo, filtroPerfil, filtroStatus, usuarios]);

  function atualizarCampo(campo: string, valor: string | string[] | boolean) {
    if (campo === "cpf" && typeof valor === "string")
      valor = mascararCpf(valor);
    setFormulario((atual) => {
      if (campo === "terceirizado") {
        const grupos = valor
          ? Array.from(new Set([...atual.gruposTreinamento, "Terceirizado"]))
          : atual.gruposTreinamento.filter(
              (item) =>
                normalizarGrupo(item) !== normalizarGrupo("Terceirizado"),
            );
        return {
          ...atual,
          terceirizado: Boolean(valor),
          gruposTreinamento: grupos,
        };
      }
      if (campo === "somenteCadastro" && valor) {
        return {
          ...atual,
          somenteCadastro: true,
          perfilAcesso: "CADASTRO",
          statusUsuario: "INATIVO",
          senha: "",
          confirmarSenha: "",
        };
      }
      if (campo === "somenteCadastro") {
        return { ...atual, somenteCadastro: false, statusUsuario: "ATIVO" };
      }
      return { ...atual, [campo]: valor };
    });
  }

  function alternarGrupoTreinamento(grupo: string) {
    setFormulario((atual) => {
      const grupoNormalizado = normalizarGrupo(grupo);
      const jaSelecionado = atual.gruposTreinamento.some(
        (item) => normalizarGrupo(item) === grupoNormalizado,
      );
      const selecionados = jaSelecionado
        ? atual.gruposTreinamento.filter(
            (item) => normalizarGrupo(item) !== grupoNormalizado,
          )
        : [...atual.gruposTreinamento, grupo];
      return {
        ...atual,
        gruposTreinamento: selecionados,
        terceirizado:
          grupoNormalizado === normalizarGrupo("Terceirizado")
            ? selecionados.some(
                (item) =>
                  normalizarGrupo(item) === normalizarGrupo("Terceirizado"),
              )
            : atual.terceirizado,
      };
    });
  }

  function alternarUnidadePermitida(unidade: string) {
    setFormulario((atual) => {
      const selecionadas = atual.unidadesPermitidas.includes(unidade)
        ? atual.unidadesPermitidas.filter((item) => item !== unidade)
        : [...atual.unidadesPermitidas, unidade];
      const unidadesValidas =
        selecionadas.length > 0 ? selecionadas : [unidade];
      return {
        ...atual,
        unidadesPermitidas: unidadesValidas,
        unidade: unidadesValidas.includes(atual.unidade)
          ? atual.unidade
          : unidadesValidas[0],
      };
    });
  }

  function novoUsuario() {
    setFormulario({ ...vazio });
    setEditando(null);
    setSenhaReset("");
    setConfirmarReset("");
    setAbrirFormulario(true);
  }

  function editarUsuario(usuario: Usuario) {
    setEditando(usuario);
    setFormulario({
      ...vazio,
      nome: usuario.nome,
      email: usuario.email,
      cpf: mascararCpf(usuario.cpf || ""),
      re: usuario.re || "",
      setor: usuario.setor || "",
      cargo: usuario.cargo || "",
      equipe: usuario.equipe || "",
      unidade: usuario.unidade || "GJA-T1",
      unidadesPermitidas: usuario.unidadesPermitidas?.length
        ? usuario.unidadesPermitidas
        : [usuario.unidade || "GJA-T1"],
      empresa: usuario.empresa || "Movecta S/A",
      terceirizado: Boolean(usuario.terceirizado),
      somenteCadastro: Boolean(usuario.somenteCadastro),
      gruposTreinamento: usuario.gruposTreinamento || [],
      perfilAcesso: usuario.perfilAcesso,
      validadorOperacional: Boolean(usuario.validadorOperacional),
      mediadorOperacional: Boolean(usuario.mediadorOperacional),
      manutencaoCftv: Boolean(usuario.manutencaoCftv),
      statusUsuario: usuario.statusUsuario,
      senha: "",
      confirmarSenha: "",
    });
    setSenhaReset("");
    setConfirmarReset("");
    setAbrirFormulario(true);
  }

  async function salvarUsuario(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (!formulario.somenteCadastro && !formulario.perfilAcesso) {
        alert("Selecione o perfil de acesso do usuário.");
        return;
      }

      if (!formulario.re && !apenasDigitos(formulario.cpf)) {
        alert("Informe o R.E ou o CPF do usuário.");
        return;
      }

      if (!formulario.unidadesPermitidas.length) {
        alert("Selecione ao menos uma unidade permitida.");
        return;
      }

      if (
        !formulario.unidade ||
        !formulario.unidadesPermitidas.includes(formulario.unidade)
      ) {
        alert("Selecione uma unidade preferencial entre as unidades permitidas.");
        return;
      }

      const payload = {
        ...formulario,
        unidade: formulario.unidade,
      };

      if (
        !editando &&
        !formulario.somenteCadastro &&
        formulario.senha &&
        formulario.senha !== formulario.confirmarSenha
      ) {
        alert("As senhas não coincidem.");
        return;
      }

      if (editando) {
        await api.put(`/usuarios/${editando.id}`, payload);
      } else {
        await api.post("/usuarios", payload);
      }

      setAbrirFormulario(false);
      carregarUsuarios();
    } catch (error: any) {
      alert(
        error?.response?.data?.error ||
          "Não foi possível salvar o usuário. Confira os campos e tente novamente.",
      );
    }
  }

  async function alterarStatus(usuario: Usuario, statusUsuario: string) {
    await api.put(`/usuarios/${usuario.id}/status`, { statusUsuario });
    carregarUsuarios();
  }

  async function redefinirSenha() {
    if (!editando) return;
    if (!senhaReset || senhaReset !== confirmarReset) {
      alert("As senhas não coincidem.");
      return;
    }

    await api.put(`/usuarios/${editando.id}/senha`, {
      senha: senhaReset,
      confirmarSenha: confirmarReset,
    });
    setSenhaReset("");
    setConfirmarReset("");
    alert("Senha redefinida com sucesso");
  }

  async function resetarDispositivo() {
    if (!editando) return;
    const motivo = prompt(
      "Informe o motivo do reset de dispositivo:",
      "Troca de computador ou limpeza de navegador",
    );
    if (motivo === null) return;

    await api.put(`/usuarios/${editando.id}/dispositivo/reset`, { motivo });
    alert(
      "Dispositivo resetado. O próximo login do usuário vinculará o novo computador.",
    );
  }

  async function resetarPin(usuario?: Usuario | null) {
    const alvo = usuario || editando;
    if (!alvo) return;
    if (
      !confirm(
        `Deseja restaurar o PIN operacional de ${alvo.nome} para 1234? O usuário deverá alterar o PIN no perfil depois do acesso.`,
      )
    )
      return;

    await api.put(`/usuarios/${alvo.id}/pin/reset`);
    alert("PIN operacional restaurado para 1234.");
    carregarUsuarios();
  }

  async function excluirUsuario(usuario: Usuario) {
    if (!confirm(`Deseja excluir o usuário ${usuario.nome}?`)) return;
    await api.delete(`/usuarios/${usuario.id}`);
    carregarUsuarios();
  }

  function novoPerfil() {
    setPerfilEditando(null);
    setFormPerfil({ ...perfilVazio });
  }

  function editarPerfil(perfil: PerfilAcesso) {
    setPerfilEditando(perfil);
    setFormPerfil({
      nome: perfil.nome,
      descricao: perfil.descricao || "",
      permissoes: perfil.permissoes || [],
      permissoesDetalhadas:
        perfil.permissoesDetalhadas ||
        (perfil.permissoes || []).map((modulo) => ({
          modulo,
          leitura: true,
          indicadores: true,
          criar: true,
          editar: true,
          excluir: true,
        })),
      status: perfil.status || "ATIVO",
    });
  }

  function permissaoDoModulo(modulo: string) {
    return formPerfil.permissoesDetalhadas.find(
      (permissao) => permissao.modulo === modulo,
    );
  }

  function alternarPermissaoPerfil(modulo: string, acao: AcaoAcesso) {
    setFormPerfil((atual) => ({
      ...atual,
      permissoesDetalhadas: (() => {
        const existente = atual.permissoesDetalhadas.find(
          (permissao) => permissao.modulo === modulo,
        ) || {
          modulo,
          leitura: false,
          indicadores: false,
          criar: false,
          editar: false,
          excluir: false,
        };
        const atualizado = {
          ...existente,
          [acao]: !existente[acao],
        };
        if (
          atualizado.indicadores ||
          atualizado.criar ||
          atualizado.editar ||
          atualizado.excluir
        ) {
          atualizado.leitura = true;
        }
        const aindaPossuiPermissao = acoesPerfil.some(
          (item) => atualizado[item.chave],
        );
        const demais = atual.permissoesDetalhadas.filter(
          (permissao) => permissao.modulo !== modulo,
        );
        return aindaPossuiPermissao ? [...demais, atualizado] : demais;
      })(),
    }));
  }

  async function salvarPerfil(e: React.FormEvent) {
    e.preventDefault();
    if (!formPerfil.nome.trim()) {
      alert("Informe o nome do perfil.");
      return;
    }
    if (!formPerfil.permissoesDetalhadas.length) {
      alert("Selecione ao menos um módulo.");
      return;
    }

    const payload = {
      ...formPerfil,
      permissoes: formPerfil.permissoesDetalhadas.map(
        (permissao) => permissao.modulo,
      ),
    };

    if (perfilEditando) {
      await api.put(`/usuarios/perfis-acesso/${perfilEditando.id}`, payload);
    } else {
      await api.post("/usuarios/perfis-acesso", payload);
    }

    await carregarPerfisAcesso();
    setPerfilEditando(null);
    setFormPerfil({ ...perfilVazio });
  }

  async function excluirPerfil(perfil: PerfilAcesso) {
    if (!confirm(`Deseja excluir o perfil ${perfil.nome}?`)) return;
    await api.delete(`/usuarios/perfis-acesso/${perfil.id}`);
    await carregarPerfisAcesso();
    if (perfilEditando?.id === perfil.id) {
      setPerfilEditando(null);
      setFormPerfil({ ...perfilVazio });
    }
  }

  function nomePerfil(valor: string) {
    if (valor === "SUPER_ADMIN") return "Super Admin";
    return (
      perfisAcesso.find((perfil) => perfil.codigo === valor)?.nome ||
      valor ||
      "-"
    );
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-950 dark:text-white">
            Usuários
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
            Cadastro, permissões e status de acesso.
          </p>
        </div>

        {aba === "usuarios" ? (
          <button
            onClick={novoUsuario}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
          >
            <Plus size={18} />
            Novo Usuário
          </button>
        ) : (
          <button
            onClick={novoPerfil}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
          >
            <Plus size={18} />
            Novo Perfil
          </button>
        )}
      </div>

      {superAdmin && (
        <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {[
            ["usuarios", "Usuários"],
            ["perfis", "Perfis de acesso"],
          ].map(([valor, label]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setAba(valor as "usuarios" | "perfis")}
              className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                aba === valor
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {aba === "usuarios" && <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px_190px_180px] dark:border-slate-800 dark:bg-slate-900">
        <label className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            placeholder="Pesquisar nome, e-mail, CPF, R.E ou grupo"
          />
        </label>
        <select
          value={filtroPerfil}
          onChange={(e) => setFiltroPerfil(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        >
          <option value="">Todos os perfis</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          {perfisDisponiveis.map((perfil) => (
            <option key={perfil.value} value={perfil.value}>
              {perfil.label}
            </option>
          ))}
        </select>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        >
          <option value="">Todos os status</option>
          <option value="ATIVO">Ativo</option>
          <option value="INATIVO">Inativo</option>
          <option value="BLOQUEADO">Bloqueado</option>
        </select>
        <select
          value={filtroGrupo}
          onChange={(e) => setFiltroGrupo(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        >
          <option value="">Todos os grupos</option>
          {gruposTreinamento.map((grupo) => (
            <option key={grupo} value={grupo}>
              {grupo}
            </option>
          ))}
        </select>
      </div>}
      {aba === "usuarios" && abrirFormulario && (
        <form
          onSubmit={salvarUsuario}
          className="rounded-xl bg-white p-6 shadow space-y-5"
        >
          <h2 className="text-xl font-bold">
            {editando ? "Editar usuário" : "Novo usuário"}
          </h2>
          <div className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={!formulario.somenteCadastro}
                onChange={(e) =>
                  atualizarCampo("somenteCadastro", !e.target.checked)
                }
              />
              Habilitar acesso à plataforma
            </label>
            <label className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={formulario.terceirizado}
                onChange={(e) =>
                  atualizarCampo("terceirizado", e.target.checked)
                }
              />
              Colaborador terceirizado
            </label>
            <p className="md:col-span-2 text-sm text-slate-600">
              Use somente cadastro para registrar pessoas que farão
              treinamentos, sem liberar login no MoveSecurity.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="rounded-lg border p-3"
              placeholder="Nome completo"
              value={formulario.nome}
              onChange={(e) => atualizarCampo("nome", e.target.value)}
              required
            />
            <input
              className="rounded-lg border p-3"
              placeholder={
                formulario.terceirizado
                  ? "E-mail pessoal"
                  : "E-mail corporativo"
              }
              type="email"
              value={formulario.email}
              onChange={(e) => atualizarCampo("email", e.target.value)}
              required
            />
            <input
              className="rounded-lg border p-3"
              placeholder="CPF"
              value={formulario.cpf}
              onChange={(e) => atualizarCampo("cpf", e.target.value)}
              inputMode="numeric"
              maxLength={14}
            />
            <input
              className="rounded-lg border p-3"
              placeholder="R.E"
              value={formulario.re}
              onChange={(e) => atualizarCampo("re", e.target.value)}
            />
            <input
              className="rounded-lg border p-3"
              placeholder="Setor"
              value={formulario.setor}
              onChange={(e) => atualizarCampo("setor", e.target.value)}
              required
            />
            <input
              className="rounded-lg border p-3"
              placeholder="Cargo"
              value={formulario.cargo}
              onChange={(e) => atualizarCampo("cargo", e.target.value)}
              required
            />
            <select
              className="rounded-lg border p-3"
              value={formulario.equipe}
              onChange={(e) => atualizarCampo("equipe", e.target.value)}
            >
              <option value="">Selecione a equipe operacional</option>
              {equipes.map((equipe) => (
                <option key={equipe} value={equipe}>
                  {equipe}
                </option>
              ))}
            </select>
            <div className="rounded-lg border p-3 md:col-span-2">
              <p className="mb-3 text-sm font-semibold text-slate-700">
                Unidades permitidas para acesso
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {unidades.map((unidade) => (
                  <label
                    key={unidade}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={formulario.unidadesPermitidas.includes(unidade)}
                      onChange={() => alternarUnidadePermitida(unidade)}
                    />
                    {unidade}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Selecione todos os ambientes que este usuário poderá acessar.
              </p>
            </div>
            <select
              className="rounded-lg border p-3"
              value={formulario.unidade}
              onChange={(e) => atualizarCampo("unidade", e.target.value)}
              required
            >
              <option value="">Selecione a unidade preferencial</option>
              {formulario.unidadesPermitidas.map((unidade) => (
                <option key={unidade} value={unidade}>
                  {unidade}
                </option>
              ))}
            </select>
            <input
              className="rounded-lg border bg-gray-100 p-3 text-gray-600"
              value="Movecta S/A"
              readOnly
            />
            <div className="rounded-lg border p-3 md:col-span-2">
              <p className="mb-3 text-sm font-semibold text-slate-700">
                Atribuição grupo de treinamento
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {gruposTreinamento.map((grupo) => (
                  <label
                    key={grupo}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={formulario.gruposTreinamento.some(
                        (selecionado) =>
                          normalizarGrupo(selecionado) ===
                          normalizarGrupo(grupo),
                      )}
                      onChange={() => alternarGrupoTreinamento(grupo)}
                    />
                    {grupo}
                  </label>
                ))}
              </div>
            </div>
            {!formulario.somenteCadastro && (
              <>
                <select
                  className="rounded-lg border p-3"
                  value={formulario.perfilAcesso}
                  onChange={(e) =>
                    atualizarCampo("perfilAcesso", e.target.value)
                  }
                  required
                  disabled={editando?.perfilAcesso === "SUPER_ADMIN"}
                >
                  {!editando && (
                    <option value="">Selecione o perfil de acesso</option>
                  )}
                  {editando?.perfilAcesso === "SUPER_ADMIN" && (
                    <option value="SUPER_ADMIN">Super Admin</option>
                  )}
                  {perfisDisponiveis.map((perfil) => (
                    <option key={perfil.value} value={perfil.value}>
                      {perfil.label}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-lg border p-3"
                  value={formulario.statusUsuario}
                  onChange={(e) =>
                    atualizarCampo("statusUsuario", e.target.value)
                  }
                  disabled={editando?.perfilAcesso === "SUPER_ADMIN"}
                >
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                  <option value="BLOQUEADO">Bloqueado</option>
                </select>
                {superAdmin && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 md:col-span-2">
                    <p className="mb-3 text-sm font-semibold text-slate-700">
                      Funções operacionais
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="flex items-start gap-3 rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={Boolean(formulario.validadorOperacional)}
                          onChange={(e) =>
                            atualizarCampo(
                              "validadorOperacional",
                              e.target.checked,
                            )
                          }
                        />
                        <span>
                          <strong className="block text-slate-900">
                            Validador
                          </strong>
                          Visualiza os cards sem pendência e pode criar/editar
                          formulários operacionais sem limite diário.
                        </span>
                      </label>
                      <label className="flex items-start gap-3 rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={Boolean(formulario.manutencaoCftv)}
                          onChange={(e) =>
                            atualizarCampo("manutencaoCftv", e.target.checked)
                          }
                        />
                        <span>
                          <strong className="block text-slate-900">
                            Manutenção/CFTV
                          </strong>
                          Recebe por e-mail os alertas de câmeras desconectadas
                          nas unidades permitidas.
                        </span>
                      </label>
                      <label className="flex items-start gap-3 rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={Boolean(formulario.mediadorOperacional)}
                          onChange={(e) =>
                            atualizarCampo(
                              "mediadorOperacional",
                              e.target.checked,
                            )
                          }
                        />
                        <span>
                          <strong className="block text-slate-900">
                            Mediador
                          </strong>
                          Marca o usuário para mediação operacional e fluxos de
                          acompanhamento.
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </>
            )}
            {!editando && !formulario.somenteCadastro && (
              <>
                <input
                  className="rounded-lg border p-3"
                  placeholder="Senha provisória (opcional para SSO)"
                  type="password"
                  value={formulario.senha}
                  onChange={(e) => atualizarCampo("senha", e.target.value)}
                />
                <input
                  className="rounded-lg border p-3"
                  placeholder="Confirmação de senha provisória"
                  type="password"
                  value={formulario.confirmarSenha}
                  onChange={(e) =>
                    atualizarCampo("confirmarSenha", e.target.value)
                  }
                />
              </>
            )}
          </div>

          {editando && (
            <div className="rounded-lg border bg-gray-50 p-4">
              <p className="font-semibold mb-3">Redefinir senha</p>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
                <input
                  className="rounded-lg border p-3"
                  placeholder="Nova senha"
                  type="password"
                  value={senhaReset}
                  onChange={(e) => setSenhaReset(e.target.value)}
                />
                <input
                  className="rounded-lg border p-3"
                  placeholder="Confirmar senha"
                  type="password"
                  value={confirmarReset}
                  onChange={(e) => setConfirmarReset(e.target.value)}
                />
                <button
                  type="button"
                  onClick={redefinirSenha}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-white"
                >
                  Redefinir
                </button>
              </div>
            </div>
          )}

          {editando && superAdmin && (
            <div className="rounded-lg border bg-amber-50 p-4">
              <p className="font-semibold mb-2">PIN operacional</p>
              <p className="mb-3 text-sm text-slate-600">
                Status atual:{" "}
                {editando.possuiPinOperacional
                  ? "PIN cadastrado"
                  : "PIN pendente"}
                . A restauração define o PIN temporário 1234 para recuperação de
                acesso.
              </p>
              <button
                type="button"
                onClick={() => resetarPin(editando)}
                className="rounded-lg bg-amber-700 px-4 py-2 text-white"
              >
                Restaurar PIN para 1234
              </button>
            </div>
          )}

          {editando &&
            [
              "OPERADOR",
              "ANALISTA",
              "PORTARIA",
              "CADASTRO",
              "TECNICO_MANUTENCAO",
            ].includes(editando.perfilAcesso) && (
              <div className="rounded-lg border bg-blue-50 p-4">
                <p className="font-semibold mb-2">Dispositivo autorizado</p>
                <p className="mb-3 text-sm text-slate-600">
                  Operadores e analistas acessam por dispositivo vinculado no
                  primeiro login. Use o reset quando houver troca de computador
                  ou limpeza dos dados do navegador.
                </p>
                <button
                  type="button"
                  onClick={resetarDispositivo}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-white"
                >
                  Resetar dispositivo
                </button>
              </div>
            )}

          <div className="flex gap-3">
            <button className="rounded-lg bg-green-600 px-4 py-2 text-white">
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setAbrirFormulario(false)}
              className="rounded-lg bg-gray-300 px-4 py-2"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {aba === "perfis" && superAdmin && (
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(360px,420px)_minmax(0,1fr)]">
          <form
            onSubmit={salvarPerfil}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                Perfis de acesso
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                {perfilEditando ? "Editar perfil" : "Novo perfil"}
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
                Selecione os módulos liberados para este perfil.
              </p>
            </div>

            <div className="space-y-3">
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="Nome do perfil"
                value={formPerfil.nome}
                onChange={(e) =>
                  setFormPerfil((atual) => ({
                    ...atual,
                    nome: e.target.value,
                  }))
                }
                required
              />
              <textarea
                className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="Descrição do perfil"
                value={formPerfil.descricao}
                onChange={(e) =>
                  setFormPerfil((atual) => ({
                    ...atual,
                    descricao: e.target.value,
                  }))
                }
              />
              {perfilEditando && (
                <select
                  value={formPerfil.status}
                  onChange={(e) =>
                    setFormPerfil((atual) => ({
                      ...atual,
                      status: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  disabled={perfilEditando.codigo === "SUPER_ADMIN"}
                >
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              )}
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  Permissões por módulo
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">
                  Leitura libera visualização. Indicadores, criar, editar ou
                  excluir também habilitam leitura automaticamente.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] table-fixed text-left text-xs">
                  <colgroup>
                    <col className="w-[40%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                  </colgroup>
                  <thead className="bg-white text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                    <tr>
                      <th className="px-4 py-3">Módulo</th>
                      {acoesPerfil.map((acao) => (
                        <th key={acao.chave} className="px-2 py-3 text-center">
                          {acao.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {MODULOS_ACESSO.map((modulo) => {
                      const permissao = permissaoDoModulo(modulo.chave);
                      return (
                        <tr key={modulo.chave}>
                          <td className="px-4 py-2 font-black text-slate-800 dark:text-slate-100">
                            {modulo.nome}
                          </td>
                          {acoesPerfil.map((acao) => (
                            <td key={acao.chave} className="px-2 py-2 text-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-blue-600"
                                checked={Boolean(permissao?.[acao.chave])}
                                onChange={() =>
                                  alternarPermissaoPerfil(
                                    modulo.chave,
                                    acao.chave,
                                  )
                                }
                                disabled={perfilEditando?.codigo === "SUPER_ADMIN"}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button className="rounded-xl bg-green-600 px-4 py-2 text-sm font-black text-white hover:bg-green-700">
                Salvar perfil
              </button>
              {perfilEditando && (
                <button
                  type="button"
                  onClick={novoPerfil}
                  className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100"
                >
                  Cancelar edição
                </button>
              )}
            </div>
          </form>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                Perfis cadastrados
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
                {perfisAcesso.length} perfil(is) disponível(is)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] table-fixed text-left text-xs">
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[52%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-950 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Perfil</th>
                    <th className="px-3 py-3">Módulos</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {perfisAcesso.map((perfil) => (
                    <tr
                      key={perfil.id}
                      className="align-top hover:bg-blue-50/50 dark:hover:bg-slate-800/70"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-black text-slate-950 dark:text-white">
                          {perfil.nome}
                        </p>
                        <p className="mt-1 font-mono text-[11px] font-black text-blue-600">
                          {perfil.codigo}
                        </p>
                        <p className="mt-1 max-w-full text-xs font-semibold text-slate-500 dark:text-slate-300">
                          {perfil.descricao || "Sem descrição"}
                        </p>
                        {perfil.sistema && (
                          <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            Sistema
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex max-w-full flex-wrap gap-1.5">
                          {(perfil.permissoesDetalhadas || []).map((permissao) => (
                            <span
                              key={permissao.modulo}
                              className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-200 dark:ring-blue-500/20"
                            >
                              {MODULOS_ACESSO.find(
                                (modulo) => modulo.chave === permissao.modulo,
                              )?.nome || permissao.modulo}
                              :{" "}
                              {acoesPerfil
                                .filter((acao) => permissao[acao.chave])
                                .map((acao) => acao.label.toLowerCase())
                                .join(", ")}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${statusClasse(perfil.status)}`}
                        >
                          {perfil.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <IconButton
                            title="Editar perfil"
                            onClick={() => editarPerfil(perfil)}
                            className="border-blue-200 text-blue-700 hover:bg-blue-50"
                          >
                            <Pencil size={16} />
                          </IconButton>
                          {!perfil.sistema && (
                            <IconButton
                              title="Excluir perfil"
                              onClick={() => excluirPerfil(perfil)}
                              className="border-red-200 text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={16} />
                            </IconButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!perfisAcesso.length && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-12 text-center text-sm font-bold text-slate-500"
                      >
                        Nenhum perfil encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {aba === "usuarios" && <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              Cadastro de acessos
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
              {usuariosFiltrados.length} de {usuarios.length} usuário(s)
              exibido(s)
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-300">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Ativos
            <span className="ml-2 inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            Bloqueados
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1580px] table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[9%]" />
              <col className="w-[13%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[7%]" />
              <col className="w-[6%]" />
              <col className="w-[6%]" />
              <col className="w-[11%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-950 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-3 py-3">Identificação</th>
                <th className="px-3 py-3">Lotação</th>
                <th className="px-3 py-3">Unidades</th>
                <th className="px-3 py-3">Grupos</th>
                <th className="px-3 py-3">Perfil</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">PIN</th>
                <th className="px-3 py-3">Último acesso</th>
                <th className="sticky right-0 bg-slate-50 px-4 py-3 text-right dark:bg-slate-950">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {usuariosFiltrados.map((usuario) => (
                <tr
                  key={usuario.id}
                  className="align-top transition hover:bg-blue-50/50 dark:hover:bg-slate-800/70"
                >
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-200 dark:ring-blue-500/20">
                        <UserRound size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                          {usuario.nome}
                        </p>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-300">
                          {usuario.email}
                        </p>
                        <p className="mt-1 text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">
                          {usuario.terceirizado
                            ? "Terceirizado"
                            : usuario.somenteCadastro
                              ? "Somente cadastro"
                              : "Colaborador"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="space-y-1 font-semibold text-slate-700 dark:text-slate-200">
                      <p>R.E: {usuario.re || "-"}</p>
                      <p>CPF: {cpfVisivelPorPerfil(usuario.cpf) || "-"}</p>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="max-w-full space-y-1">
                      <p className="font-black text-slate-900 dark:text-white">
                        {usuario.setor || "-"}
                      </p>
                      <p className="text-slate-500 dark:text-slate-300">
                        {usuario.cargo || "-"}
                      </p>
                      <p className="text-slate-400">
                        {usuario.equipe || "Sem equipe"}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex max-w-full flex-wrap gap-1.5">
                      {(usuario.unidadesPermitidas?.length
                        ? usuario.unidadesPermitidas
                        : [usuario.unidade || "-"]
                      ).map((unidade) => (
                        <span
                          key={unidade}
                          className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"
                        >
                          {unidade}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex max-w-full flex-wrap gap-1.5">
                      {usuario.gruposTreinamento?.length ? (
                        usuario.gruposTreinamento.map((grupo) => (
                          <span
                            key={grupo}
                            className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-200 dark:ring-blue-500/20"
                          >
                            {grupoLabel(grupo)}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">
                          Sem grupo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-black text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-200 dark:ring-indigo-500/20">
                      {nomePerfil(usuario.perfilAcesso)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${statusClasse(usuario.statusUsuario)}`}
                    >
                      {usuario.statusUsuario}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${
                        usuario.possuiPinOperacional
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-amber-50 text-amber-700 ring-amber-200"
                      }`}
                    >
                      <ShieldCheck size={13} />
                      {usuario.possuiPinOperacional ? "OK" : "Pendente"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-300">
                    {usuario.ultimoAcesso
                      ? new Date(usuario.ultimoAcesso).toLocaleString("pt-BR")
                      : "Nunca"}
                  </td>
                  <td className="sticky right-0 bg-white px-4 py-3 dark:bg-slate-900">
                    <div className="flex justify-end gap-1.5">
                      <IconButton
                        title="Editar usuário"
                        onClick={() => editarUsuario(usuario)}
                        className="border-blue-200 text-blue-700 hover:bg-blue-50"
                      >
                        <Pencil size={16} />
                      </IconButton>
                      {superAdmin && (
                        <IconButton
                          title="Restaurar PIN para 1234"
                          onClick={() => resetarPin(usuario)}
                          className="border-slate-200 text-slate-700"
                        >
                          <KeyRound size={16} />
                        </IconButton>
                      )}
                      {usuario.perfilAcesso !== "SUPER_ADMIN" && (
                        <>
                          <IconButton
                            title={
                              usuario.statusUsuario === "ATIVO"
                                ? "Bloquear usuário"
                                : "Ativar usuário"
                            }
                            onClick={() =>
                              alterarStatus(
                                usuario,
                                usuario.statusUsuario === "ATIVO"
                                  ? "BLOQUEADO"
                                  : "ATIVO",
                              )
                            }
                            className="border-amber-200 text-amber-700 hover:bg-amber-50"
                          >
                            {usuario.statusUsuario === "ATIVO" ? (
                              <LockKeyhole size={16} />
                            ) : (
                              <UnlockKeyhole size={16} />
                            )}
                          </IconButton>
                          <IconButton
                            title="Excluir usuário"
                            onClick={() => excluirUsuario(usuario)}
                            className="border-red-200 text-red-700 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!usuariosFiltrados.length && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-12 text-center text-sm font-bold text-slate-500"
                  >
                    Nenhum usuário encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>}
    </div>
  );
}
