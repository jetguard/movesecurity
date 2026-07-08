import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

type Usuario = {
  id: number;
  nome: string;
  email: string;
  re?: string;
  setor?: string;
  cargo?: string;
  equipe?: string;
  unidade?: string;
  unidadesPermitidas?: string[];
  empresa?: string;
  perfilAcesso: string;
  statusUsuario: string;
  ultimoAcesso?: string | null;
};

const unidades = ["GJA-T1", "GJA-T2", "ITAJAÍ-SC", "SUAPE-T1", "SUAPE-T2", "ANHANGUERA"];
const equipes = ["Equipe A", "Equipe B", "Equipe C", "Equipe D", "Administrativo"];
const perfis = [
  { label: "Administrador", value: "ADMINISTRADOR" },
  { label: "Analista", value: "ANALISTA" },
  { label: "Operador", value: "OPERADOR" },
  { label: "Técnico/Manutenção", value: "TECNICO_MANUTENCAO" },
];

const vazio = {
  nome: "",
  email: "",
  re: "",
  setor: "",
  cargo: "",
  equipe: "",
  unidade: "GJA-T1",
  unidadesPermitidas: ["GJA-T1"],
  empresa: "Movecta S/A",
  perfilAcesso: "",
  statusUsuario: "ATIVO",
  senha: "",
  confirmarSenha: "",
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [formulario, setFormulario] = useState({ ...vazio });
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [abrirFormulario, setAbrirFormulario] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [senhaReset, setSenhaReset] = useState("");
  const [confirmarReset, setConfirmarReset] = useState("");

  async function carregarUsuarios() {
    const response = await api.get("/usuarios");
    setUsuarios(response.data);
  }

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const usuariosFiltrados = useMemo(() => {
    const texto = busca.toLowerCase();
    return usuarios.filter((usuario) => {
      const bateBusca =
        usuario.nome.toLowerCase().includes(texto) ||
        usuario.email.toLowerCase().includes(texto) ||
        (usuario.re || "").toLowerCase().includes(texto);

      return (
        bateBusca &&
        (!filtroPerfil || usuario.perfilAcesso === filtroPerfil) &&
        (!filtroStatus || usuario.statusUsuario === filtroStatus)
      );
    });
  }, [busca, filtroPerfil, filtroStatus, usuarios]);

  function atualizarCampo(campo: string, valor: string | string[]) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
  }

  function alternarUnidadePermitida(unidade: string) {
    setFormulario((atual) => {
      const selecionadas = atual.unidadesPermitidas.includes(unidade)
        ? atual.unidadesPermitidas.filter((item) => item !== unidade)
        : [...atual.unidadesPermitidas, unidade];
      const unidadesValidas = selecionadas.length > 0 ? selecionadas : [unidade];
      return {
        ...atual,
        unidadesPermitidas: unidadesValidas,
        unidade: unidadesValidas.includes(atual.unidade) ? atual.unidade : unidadesValidas[0],
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
      re: usuario.re || "",
      setor: usuario.setor || "",
      cargo: usuario.cargo || "",
      equipe: usuario.equipe || "",
      unidade: usuario.unidade || "GJA-T1",
      unidadesPermitidas: usuario.unidadesPermitidas?.length ? usuario.unidadesPermitidas : [usuario.unidade || "GJA-T1"],
      empresa: usuario.empresa || "Movecta S/A",
      perfilAcesso: usuario.perfilAcesso,
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

    if (!formulario.perfilAcesso) {
      alert("Selecione o perfil de acesso do usuário.");
      return;
    }

    if (!formulario.unidadesPermitidas.length) {
      alert("Selecione ao menos uma unidade permitida.");
      return;
    }

    if (!formulario.unidade || !formulario.unidadesPermitidas.includes(formulario.unidade)) {
      alert("Selecione uma unidade preferencial entre as unidades permitidas.");
      return;
    }

    const payload = {
      ...formulario,
      unidade: formulario.unidade,
    };

    if (!editando && formulario.senha !== formulario.confirmarSenha) {
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
    const motivo = prompt("Informe o motivo do reset de dispositivo:", "Troca de computador ou limpeza de navegador");
    if (motivo === null) return;

    await api.put(`/usuarios/${editando.id}/dispositivo/reset`, { motivo });
    alert("Dispositivo resetado. O próximo login do usuário vinculará o novo computador.");
  }

  async function excluirUsuario(usuario: Usuario) {
    if (!confirm(`Deseja excluir o usuário ${usuario.nome}?`)) return;
    await api.delete(`/usuarios/${usuario.id}`);
    carregarUsuarios();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Usuários</h1>
          <p className="text-gray-500 mt-1">Cadastro, permissões e status de acesso.</p>
        </div>

        <button onClick={novoUsuario} className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Novo Usuário
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-xl bg-white p-4 shadow">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="rounded-lg border p-3"
          placeholder="Pesquisar nome, email ou R.E"
        />
        <select value={filtroPerfil} onChange={(e) => setFiltroPerfil(e.target.value)} className="rounded-lg border p-3">
          <option value="">Todos os perfis</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          {perfis.map((perfil) => (
            <option key={perfil.value} value={perfil.value}>{perfil.label}</option>
          ))}
        </select>
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="rounded-lg border p-3">
          <option value="">Todos os status</option>
          <option value="ATIVO">Ativo</option>
          <option value="INATIVO">Inativo</option>
          <option value="BLOQUEADO">Bloqueado</option>
        </select>
      </div>

      {abrirFormulario && (
        <form onSubmit={salvarUsuario} className="rounded-xl bg-white p-6 shadow space-y-5">
          <h2 className="text-xl font-bold">{editando ? "Editar usuário" : "Novo usuário"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="rounded-lg border p-3" placeholder="Nome completo" value={formulario.nome} onChange={(e) => atualizarCampo("nome", e.target.value)} required />
            <input className="rounded-lg border p-3" placeholder="E-mail" type="email" value={formulario.email} onChange={(e) => atualizarCampo("email", e.target.value)} required />
            <input className="rounded-lg border p-3" placeholder="R.E" value={formulario.re} onChange={(e) => atualizarCampo("re", e.target.value)} required />
            <input className="rounded-lg border p-3" placeholder="Setor" value={formulario.setor} onChange={(e) => atualizarCampo("setor", e.target.value)} required />
            <input className="rounded-lg border p-3" placeholder="Cargo" value={formulario.cargo} onChange={(e) => atualizarCampo("cargo", e.target.value)} required />
            <select className="rounded-lg border p-3" value={formulario.equipe} onChange={(e) => atualizarCampo("equipe", e.target.value)}>
              <option value="">Selecione a equipe operacional</option>
              {equipes.map((equipe) => <option key={equipe} value={equipe}>{equipe}</option>)}
            </select>
            <div className="rounded-lg border p-3 md:col-span-2">
              <p className="mb-3 text-sm font-semibold text-slate-700">Unidades permitidas para acesso</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {unidades.map((unidade) => (
                  <label key={unidade} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
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
            <select className="rounded-lg border p-3" value={formulario.unidade} onChange={(e) => atualizarCampo("unidade", e.target.value)} required>
              <option value="">Selecione a unidade preferencial</option>
              {formulario.unidadesPermitidas.map((unidade) => <option key={unidade} value={unidade}>{unidade}</option>)}
            </select>
            <input className="rounded-lg border bg-gray-100 p-3 text-gray-600" value="Movecta S/A" readOnly />
            <select className="rounded-lg border p-3" value={formulario.perfilAcesso} onChange={(e) => atualizarCampo("perfilAcesso", e.target.value)} required disabled={editando?.perfilAcesso === "SUPER_ADMIN"}>
              {!editando && <option value="">Selecione o perfil de acesso</option>}
              {editando?.perfilAcesso === "SUPER_ADMIN" && <option value="SUPER_ADMIN">Super Admin</option>}
              {perfis.map((perfil) => <option key={perfil.value} value={perfil.value}>{perfil.label}</option>)}
            </select>
            <select className="rounded-lg border p-3" value={formulario.statusUsuario} onChange={(e) => atualizarCampo("statusUsuario", e.target.value)} disabled={editando?.perfilAcesso === "SUPER_ADMIN"}>
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
              <option value="BLOQUEADO">Bloqueado</option>
            </select>
            {!editando && (
              <>
                <input className="rounded-lg border p-3" placeholder="Senha provisória" type="password" value={formulario.senha} onChange={(e) => atualizarCampo("senha", e.target.value)} required />
                <input className="rounded-lg border p-3" placeholder="Confirmação de senha" type="password" value={formulario.confirmarSenha} onChange={(e) => atualizarCampo("confirmarSenha", e.target.value)} required />
              </>
            )}
          </div>

          {editando && (
            <div className="rounded-lg border bg-gray-50 p-4">
              <p className="font-semibold mb-3">Redefinir senha</p>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
                <input className="rounded-lg border p-3" placeholder="Nova senha" type="password" value={senhaReset} onChange={(e) => setSenhaReset(e.target.value)} />
                <input className="rounded-lg border p-3" placeholder="Confirmar senha" type="password" value={confirmarReset} onChange={(e) => setConfirmarReset(e.target.value)} />
                <button type="button" onClick={redefinirSenha} className="rounded-lg bg-slate-900 px-4 py-2 text-white">Redefinir</button>
              </div>
            </div>
          )}

          {editando && ["OPERADOR", "ANALISTA", "TECNICO_MANUTENCAO"].includes(editando.perfilAcesso) && (
            <div className="rounded-lg border bg-blue-50 p-4">
              <p className="font-semibold mb-2">Dispositivo autorizado</p>
              <p className="mb-3 text-sm text-slate-600">
                Operadores e analistas acessam por dispositivo vinculado no primeiro login. Use o reset quando houver troca de computador ou limpeza dos dados do navegador.
              </p>
              <button type="button" onClick={resetarDispositivo} className="rounded-lg bg-blue-700 px-4 py-2 text-white">
                Resetar dispositivo
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <button className="rounded-lg bg-green-600 px-4 py-2 text-white">Salvar</button>
            <button type="button" onClick={() => setAbrirFormulario(false)} className="rounded-lg bg-gray-300 px-4 py-2">Cancelar</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl bg-white shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-slate-600">
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">E-mail</th>
              <th className="p-3">R.E</th>
              <th className="p-3">Cargo</th>
              <th className="p-3">Setor</th>
              <th className="p-3">Equipe</th>
              <th className="p-3">Unidade</th>
              <th className="p-3">Perfil</th>
              <th className="p-3">Status</th>
              <th className="p-3">Último acesso</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.map((usuario) => (
              <tr key={usuario.id} className="border-t">
                <td className="p-3 font-semibold">{usuario.nome}</td>
                <td className="p-3">{usuario.email}</td>
                <td className="p-3">{usuario.re}</td>
                <td className="p-3">{usuario.cargo}</td>
                <td className="p-3">{usuario.setor}</td>
                <td className="p-3">{usuario.equipe || "-"}</td>
                <td className="p-3">{usuario.unidadesPermitidas?.join(", ") || usuario.unidade}</td>
                <td className="p-3">{usuario.perfilAcesso}</td>
                <td className="p-3">{usuario.statusUsuario}</td>
                <td className="p-3">{usuario.ultimoAcesso ? new Date(usuario.ultimoAcesso).toLocaleString() : "Nunca"}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => editarUsuario(usuario)} className="rounded bg-blue-600 px-3 py-1 text-white">Editar</button>
                    {usuario.perfilAcesso !== "SUPER_ADMIN" && (
                      <>
                        <button onClick={() => alterarStatus(usuario, usuario.statusUsuario === "ATIVO" ? "BLOQUEADO" : "ATIVO")} className="rounded bg-amber-600 px-3 py-1 text-white">
                          {usuario.statusUsuario === "ATIVO" ? "Bloquear" : "Ativar"}
                        </button>
                        <button onClick={() => excluirUsuario(usuario)} className="rounded bg-red-600 px-3 py-1 text-white">Excluir</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

