import { useEffect, useState } from "react";
import { api } from "../services/api";

type UsuarioPerfil = {
  id: number;
  nome: string;
  email: string;
  apelido?: string;
  fotoPerfil?: string;
  re?: string;
  setor?: string;
  cargo?: string;
  empresa?: string;
  unidade?: string;
  perfilAcesso?: string;
  statusUsuario?: string;
  possuiPinOperacional?: boolean;
  pinOperacionalCriadoEm?: string;
  pinOperacionalAtualizadoEm?: string;
  doisFatoresAtivo?: boolean;
};

export default function Perfil() {
  const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null);
  const [apelido, setApelido] = useState("");
  const [fotoPerfil, setFotoPerfil] = useState<File | null>(null);
  const [previewFoto, setPreviewFoto] = useState("");
  const [removerFoto, setRemoverFoto] = useState(false);
  const [pinAtual, setPinAtual] = useState("");
  const [senhaAtualPin, setSenhaAtualPin] = useState("");
  const [novoPin, setNovoPin] = useState("");
  const [confirmarNovoPin, setConfirmarNovoPin] = useState("");
  const [salvandoPin, setSalvandoPin] = useState(false);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [senhaAtual2fa, setSenhaAtual2fa] = useState("");
  const [salvando2fa, setSalvando2fa] = useState(false);

  function normalizarPin(valor: string) {
    return valor.replace(/\D/g, "").slice(0, 4);
  }

  async function carregarPerfil() {
    const response = await api.get("/usuarios/me");

    setPerfil(response.data);
    setApelido(response.data.apelido || "");
    setPreviewFoto(response.data.fotoPerfil || "");
    setRemoverFoto(false);
  }

  function selecionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];

    if (!arquivo) return;

    const formatosPermitidos = ["image/jpeg", "image/png", "image/webp"];

    if (!formatosPermitidos.includes(arquivo.type)) {
      alert("Use uma imagem JPG, PNG ou WEBP.");
      e.target.value = "";
      return;
    }

    setFotoPerfil(arquivo);
    setPreviewFoto(URL.createObjectURL(arquivo));
    setRemoverFoto(false);
  }

  function removerFotoAtual() {
    setFotoPerfil(null);
    setPreviewFoto("");
    setRemoverFoto(true);
  }

  async function salvarPerfil(e: React.FormEvent) {
    e.preventDefault();

    const formData = new FormData();

    formData.append("apelido", apelido);
    formData.append("removerFoto", String(removerFoto));

    if (fotoPerfil) {
      formData.append("fotoPerfil", fotoPerfil);
    }

    try {
      setSalvandoPerfil(true);
      const response = await api.put("/usuarios/me", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      localStorage.setItem("usuario", JSON.stringify(response.data));
      setPerfil(response.data);
      setFotoPerfil(null);
      setRemoverFoto(false);
      setPreviewFoto(response.data.fotoPerfil || "");
      alert("Perfil atualizado com sucesso");
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } } };
      alert(apiError.response?.data?.error || "Erro ao atualizar perfil.");
    } finally {
      setSalvandoPerfil(false);
    }
  }

  async function salvarPin(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSalvandoPin(true);
      const response = await api.put("/usuarios/me/pin", {
        pinAtual,
        senhaAtual: senhaAtualPin,
        novoPin,
        confirmarNovoPin,
      });

      setPerfil(response.data);
      setPinAtual("");
      setSenhaAtualPin("");
      setNovoPin("");
      setConfirmarNovoPin("");
      alert(
        perfil?.possuiPinOperacional
          ? "PIN atualizado com sucesso."
          : "PIN criado com sucesso.",
      );
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } } };
      alert(apiError.response?.data?.error || "Erro ao atualizar PIN.");
    } finally {
      setSalvandoPin(false);
    }
  }

  async function alterar2fa(ativo: boolean) {
    if (!senhaAtual2fa) {
      alert("Informe sua senha atual para alterar o 2FA.");
      return;
    }

    try {
      setSalvando2fa(true);
      const response = await api.put("/usuarios/me/2fa", {
        ativo,
        senhaAtual: senhaAtual2fa,
      });
      setPerfil(response.data);
      setSenhaAtual2fa("");
      const usuarioLocal = localStorage.getItem("usuario");
      if (usuarioLocal) {
        localStorage.setItem(
          "usuario",
          JSON.stringify({
            ...JSON.parse(usuarioLocal),
            doisFatoresAtivo: response.data.doisFatoresAtivo,
          }),
        );
      }
      alert(
        ativo
          ? "Autenticação em 2 etapas ativada."
          : "Autenticação em 2 etapas desativada.",
      );
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } } };
      alert(apiError.response?.data?.error || "Erro ao atualizar 2FA.");
    } finally {
      setSalvando2fa(false);
    }
  }

  useEffect(() => {
    carregarPerfil();
  }, []);

  if (!perfil) {
    return (
      <div className="bg-white rounded-xl p-8 shadow text-center text-gray-500">
        Carregando perfil...
      </div>
    );
  }

  const fotoUrl = previewFoto.startsWith("blob:")
    ? previewFoto
    : previewFoto || "";

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Perfil do Usuário</h1>
        <p className="text-gray-500 mt-1">
          Edite sua foto de perfil e seu apelido de exibição.
        </p>
      </div>

      <form
        onSubmit={salvarPerfil}
        className="bg-white rounded-xl shadow p-6 space-y-6"
      >
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex flex-col items-center gap-4 md:w-56">
            <div className="w-36 h-36 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-4xl font-bold text-slate-500">
              {fotoUrl ? (
                <img
                  src={fotoUrl}
                  alt="Foto do perfil"
                  className="w-full h-full object-cover"
                />
              ) : (
                (perfil.apelido || perfil.nome).charAt(0).toUpperCase()
              )}
            </div>

            <div className="text-center">
              <p className="font-bold text-slate-900">
                {perfil.apelido || perfil.nome}
              </p>
              <p className="text-sm text-slate-500">{perfil.email}</p>
            </div>

            <label className="w-full text-center bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg cursor-pointer">
              Alterar Foto
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={selecionarFoto}
                className="hidden"
              />
            </label>

            {fotoUrl && (
              <button
                type="button"
                onClick={removerFotoAtual}
                className="w-full text-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
              >
                Remover Foto
              </button>
            )}
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">
                Apelido
              </span>
              <input
                className="w-full border rounded-lg p-3"
                value={apelido}
                onChange={(e) => setApelido(e.target.value)}
                placeholder="Como prefere ser chamado"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">
                Nome completo
              </span>
              <input
                className="w-full border rounded-lg p-3 bg-gray-100 text-gray-600"
                value={perfil.nome || ""}
                readOnly
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">
                Perfil de acesso
              </span>
              <input
                className="w-full border rounded-lg p-3 bg-gray-100 text-gray-600"
                value={perfil.perfilAcesso || "USUARIO"}
                readOnly
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">R.E</span>
              <input
                className="w-full border rounded-lg p-3 bg-gray-100 text-gray-600"
                value={perfil.re || ""}
                readOnly
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">Setor</span>
              <input
                className="w-full border rounded-lg p-3 bg-gray-100 text-gray-600"
                value={perfil.setor || ""}
                readOnly
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">Cargo</span>
              <input
                className="w-full border rounded-lg p-3 bg-gray-100 text-gray-600"
                value={perfil.cargo || ""}
                readOnly
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">
                Unidade
              </span>
              <input
                className="w-full border rounded-lg p-3 bg-gray-100 text-gray-600"
                value={perfil.unidade || ""}
                readOnly
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">
                Empresa
              </span>
              <input
                className="w-full border rounded-lg p-3 bg-gray-100 text-gray-600"
                value={perfil.empresa || ""}
                readOnly
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">Email</span>
              <input
                className="w-full border rounded-lg p-3 bg-gray-100 text-gray-600"
                value={perfil.email || ""}
                readOnly
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">
                Status do usuário
              </span>
              <input
                className="w-full border rounded-lg p-3 bg-gray-100 text-gray-600"
                value={perfil.statusUsuario || ""}
                readOnly
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={salvandoPerfil}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {salvandoPerfil ? "Salvando..." : "Salvar Perfil"}
          </button>
        </div>
      </form>

      <form
        onSubmit={salvarPin}
        className="mt-6 rounded-xl bg-white p-6 shadow dark:border dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              PIN de Segurança
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              Use um PIN de 4 dígitos para desbloquear sessão, enviar
              relatórios, concluir análises, aprovar e consolidar ações
              sensíveis.
            </p>
          </div>
          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
              perfil.possuiPinOperacional
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
            }`}
          >
            {perfil.possuiPinOperacional ? "PIN cadastrado" : "PIN pendente"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {perfil.possuiPinOperacional ? (
            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                PIN atual
              </span>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={pinAtual}
                onChange={(e) => setPinAtual(normalizarPin(e.target.value))}
                className="w-full rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="4 dígitos"
                required
              />
            </label>
          ) : (
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                Senha atual
              </span>
              <input
                type="password"
                value={senhaAtualPin}
                onChange={(e) => setSenhaAtualPin(e.target.value)}
                className="w-full rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="Digite sua senha para criar o PIN"
                required
              />
            </label>
          )}

          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
              Novo PIN
            </span>
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={novoPin}
              onChange={(e) => setNovoPin(normalizarPin(e.target.value))}
              className="w-full rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="4 dígitos"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
              Confirmar PIN
            </span>
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={confirmarNovoPin}
              onChange={(e) =>
                setConfirmarNovoPin(normalizarPin(e.target.value))
              }
              className="w-full rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="Repita o PIN"
              required
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={salvandoPin}
            className="rounded-lg bg-slate-900 px-5 py-2 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            {salvandoPin
              ? "Salvando..."
              : perfil.possuiPinOperacional
                ? "Atualizar PIN"
                : "Criar PIN"}
          </button>
        </div>
      </form>

      {perfil.perfilAcesso === "SUPER_ADMIN" && (
        <section className="mt-6 rounded-xl bg-white p-6 shadow dark:border dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Autenticação em 2 etapas
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                Quando estiver ativa, o login do Super Admin exige senha e um
                código temporário enviado por e-mail.
              </p>
            </div>
            <span
              className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                perfil.doisFatoresAtivo
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {perfil.doisFatoresAtivo ? "2FA ativo" : "2FA inativo"}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                Senha atual
              </span>
              <input
                type="password"
                value={senhaAtual2fa}
                onChange={(e) => setSenhaAtual2fa(e.target.value)}
                className="w-full rounded-lg border p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="Confirme sua senha para alterar o 2FA"
              />
            </label>

            <button
              type="button"
              disabled={salvando2fa}
              onClick={() => alterar2fa(!perfil.doisFatoresAtivo)}
              className={`rounded-lg px-5 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-500 ${
                perfil.doisFatoresAtivo
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {salvando2fa
                ? "Salvando..."
                : perfil.doisFatoresAtivo
                  ? "Desativar 2FA"
                  : "Ativar 2FA"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
