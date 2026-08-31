import { CheckCircle2, KeyRound, LockKeyhole, Save, Settings2, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { PERFIS, perfilAtual, podeNoModulo } from "../utils/permissoes";

type Configuracao = {
  nomeEmpresa: string;
  slaCameras: number;
  tempoMaximoOffline: number;
  checklistCameraDias: number;
  corsPermitido?: string;
  logoUrl?: string;
  rodapePdf?: string;
  ssoAtivo?: boolean;
  ssoProvider?: string;
  ssoNomeBotao?: string;
  ssoDominioPermitido?: string;
  ssoClientId?: string;
  ssoClientSecret?: string;
  ssoClientSecretConfigurado?: boolean;
  ssoTenantId?: string;
  ssoCallbackUrl?: string;
  ssoFrontendUrl?: string;
  ssoAuthorizationUrl?: string;
  ssoTokenUrl?: string;
  ssoUserInfoUrl?: string;
  ssoLogoutUrl?: string;
  ssoMetadataUrl?: string;
  ssoCertificado?: string;
  ssoModoPermissao?: string;
  ssoLoginLocalEmergencia?: boolean;
  removerSsoClientSecret?: boolean;
};

const inicial: Configuracao = {
  nomeEmpresa: "Movecta S/A",
  slaCameras: 98,
  tempoMaximoOffline: 60,
  checklistCameraDias: 7,
  corsPermitido: "",
  logoUrl: "/images/movecta-logo.png",
  rodapePdf: "Documento validado e elaborado pelo sistema MoveSecurity.",
  ssoAtivo: false,
  ssoProvider: "azure-ad",
  ssoNomeBotao: "Entrar com conta corporativa",
  ssoDominioPermitido: "movecta.com.br",
  ssoClientId: "",
  ssoClientSecret: "",
  ssoClientSecretConfigurado: false,
  ssoTenantId: "",
  ssoCallbackUrl: "https://movecta.jetguard.com.br/api/auth/sso/callback",
  ssoFrontendUrl: "https://movecta.jetguard.com.br",
  ssoAuthorizationUrl: "",
  ssoTokenUrl: "",
  ssoUserInfoUrl: "",
  ssoLogoutUrl: "",
  ssoMetadataUrl: "",
  ssoCertificado: "",
  ssoModoPermissao: "perfil_manual",
  ssoLoginLocalEmergencia: true,
  removerSsoClientSecret: false,
};

const inputBase =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-blue-500/20";

function normalizarPerfilAcesso(perfil?: string | null) {
  return String(perfil || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function Label({
  titulo,
  ajuda,
  children,
  className = "",
}: {
  titulo: string;
  ajuda?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {titulo}
      </span>
      {children}
      {ajuda && (
        <span className="mt-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
          {ajuda}
        </span>
      )}
    </label>
  );
}

export default function Configuracoes() {
  const [form, setForm] = useState<Configuracao>(inicial);
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba] = useState<"geral" | "acesso">("geral");
  const [mensagemSso, setMensagemSso] = useState("");
  const perfilNormalizado = normalizarPerfilAcesso(perfilAtual());
  const podeConfigurarAcesso =
    [PERFIS.SUPER_ADMIN, PERFIS.TI, "TI"].includes(perfilNormalizado) ||
    podeNoModulo("configuracoes", "editar");

  useEffect(() => {
    api
      .get("/configuracoes")
      .then((response) => setForm({ ...inicial, ...response.data }));
  }, []);

  const ssoCompleto = useMemo(() => {
    return Boolean(
      form.ssoProvider &&
        form.ssoClientId &&
        form.ssoCallbackUrl &&
        form.ssoFrontendUrl &&
        (form.ssoProvider !== "azure-ad" || form.ssoTenantId),
    );
  }, [form]);

  function campo(nome: keyof Configuracao, valor: string | boolean) {
    setForm((atual) => ({
      ...atual,
      [nome]: [
        "slaCameras",
        "tempoMaximoOffline",
        "checklistCameraDias",
      ].includes(nome)
        ? Number(valor)
        : valor,
    }));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const response = await api.put("/configuracoes", form);
      setForm({
        ...inicial,
        ...response.data,
        removerSsoClientSecret: false,
      });
      alert("Configurações salvas com sucesso.");
    } finally {
      setSalvando(false);
    }
  }

  function testarConfiguracaoSso() {
    if (!podeConfigurarAcesso) return;
    if (!ssoCompleto) {
      setMensagemSso(
        "Preencha provedor, Client ID, URL do sistema, callback e Tenant ID quando usar Microsoft Entra ID.",
      );
      return;
    }
    setMensagemSso(
      "Configuração básica preenchida. A validação real do login depende dos dados liberados pelo T.I no provedor corporativo.",
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 dark:text-blue-300">
              Administração
            </p>
            <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              Configurações do Sistema
            </h1>
            <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500 dark:text-slate-400">
              Parâmetros administrativos para operação, segurança, PDFs,
              identidade visual e autenticação corporativa do MoveSecurity.
            </p>
          </div>

          <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setAba("geral")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${
                aba === "geral"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              <Settings2 size={16} />
              Geral
            </button>
            {podeConfigurarAcesso && (
              <button
                type="button"
                onClick={() => setAba("acesso")}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${
                  aba === "acesso"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                <ShieldCheck size={16} />
                Configurações de Acesso
              </button>
            )}
          </div>
        </div>
      </div>

      <form
        onSubmit={salvar}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
      >
        {aba === "geral" && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Label titulo="Nome da empresa">
                <input
                  className={inputBase}
                  placeholder="Informe o nome da empresa exibido no sistema"
                  value={form.nomeEmpresa}
                  onChange={(e) => campo("nomeEmpresa", e.target.value)}
                />
              </Label>
              <Label titulo="URL da logo">
                <input
                  className={inputBase}
                  placeholder="Exemplo: /images/movecta-logo.png"
                  value={form.logoUrl || ""}
                  onChange={(e) => campo("logoUrl", e.target.value)}
                />
              </Label>
              <Label titulo="SLA de câmeras (%)">
                <input
                  type="number"
                  className={inputBase}
                  placeholder="Percentual mínimo esperado"
                  value={form.slaCameras}
                  onChange={(e) => campo("slaCameras", e.target.value)}
                />
              </Label>
              <Label titulo="Tempo máximo offline">
                <input
                  type="number"
                  className={inputBase}
                  placeholder="Tempo limite em minutos"
                  value={form.tempoMaximoOffline}
                  onChange={(e) =>
                    campo("tempoMaximoOffline", e.target.value)
                  }
                />
              </Label>
              <Label titulo="Checklist CFTV">
                <input
                  type="number"
                  className={inputBase}
                  placeholder="Periodicidade em dias"
                  value={form.checklistCameraDias}
                  onChange={(e) =>
                    campo("checklistCameraDias", e.target.value)
                  }
                />
              </Label>
              <Label titulo="CORS permitido">
                <input
                  className={inputBase}
                  placeholder="Domínio autorizado para acessar a API"
                  value={form.corsPermitido || ""}
                  onChange={(e) => campo("corsPermitido", e.target.value)}
                />
              </Label>
            </div>

            <Label titulo="Rodapé padrão dos PDFs">
              <textarea
                className={`${inputBase} min-h-24 resize-y`}
                placeholder="Texto padrão exibido no rodapé dos PDFs"
                value={form.rodapePdf || ""}
                onChange={(e) => campo("rodapePdf", e.target.value)}
              />
            </Label>
          </>
        )}

        {aba === "acesso" && podeConfigurarAcesso && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <span className="rounded-2xl bg-blue-600 p-2 text-white">
                    <LockKeyhole size={20} />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-slate-950 dark:text-white">
                      Login corporativo via SSO
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                      Configure a autenticação pela conta corporativa. O Client
                      Secret é salvo no backend e exibido apenas como
                      configurado.
                    </p>
                  </div>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-3 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-sm dark:border-blue-500/30 dark:bg-slate-950 dark:text-white">
                  <input
                    type="checkbox"
                    checked={Boolean(form.ssoAtivo)}
                    onChange={(e) => campo("ssoAtivo", e.target.checked)}
                    className="h-5 w-5 accent-blue-600"
                  />
                  SSO ativo
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Label titulo="Provedor">
                <select
                  className={inputBase}
                  value={form.ssoProvider || "azure-ad"}
                  onChange={(e) => campo("ssoProvider", e.target.value)}
                >
                  <option value="azure-ad">Microsoft Entra ID / Azure AD</option>
                  <option value="oidc">OIDC / OAuth2 genérico</option>
                  <option value="saml">SAML 2.0</option>
                  <option value="google">Google Workspace</option>
                </select>
              </Label>
              <Label titulo="Nome do botão">
                <input
                  className={inputBase}
                  value={form.ssoNomeBotao || ""}
                  onChange={(e) => campo("ssoNomeBotao", e.target.value)}
                />
              </Label>
              <Label titulo="Domínio permitido">
                <input
                  className={inputBase}
                  placeholder="movecta.com.br"
                  value={form.ssoDominioPermitido || ""}
                  onChange={(e) =>
                    campo("ssoDominioPermitido", e.target.value)
                  }
                />
              </Label>
              <Label titulo="Client ID">
                <input
                  className={inputBase}
                  placeholder="ID da aplicação no provedor"
                  value={form.ssoClientId || ""}
                  onChange={(e) => campo("ssoClientId", e.target.value)}
                />
              </Label>
              <Label
                titulo="Client Secret"
                ajuda={
                  form.ssoClientSecretConfigurado
                    ? "Já existe um segredo salvo. Digite outro somente se desejar substituir."
                    : "Será salvo no backend e não ficará visível novamente."
                }
              >
                <div className="flex gap-2">
                  <input
                    type="password"
                    className={inputBase}
                    placeholder={
                      form.ssoClientSecretConfigurado
                        ? "********"
                        : "Informe o segredo fornecido pelo T.I"
                    }
                    value={
                      form.ssoClientSecret === "********"
                        ? ""
                        : form.ssoClientSecret || ""
                    }
                    onChange={(e) =>
                      setForm((atual) => ({
                        ...atual,
                        ssoClientSecret: e.target.value,
                        removerSsoClientSecret: false,
                      }))
                    }
                  />
                  {form.ssoClientSecretConfigurado && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm((atual) => ({
                          ...atual,
                          ssoClientSecret: "",
                          removerSsoClientSecret: true,
                          ssoClientSecretConfigurado: false,
                        }))
                      }
                      className="rounded-xl border border-rose-200 px-3 text-xs font-black text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </Label>
              <Label titulo="Tenant ID">
                <input
                  className={inputBase}
                  placeholder="Obrigatório para Microsoft Entra ID"
                  value={form.ssoTenantId || ""}
                  onChange={(e) => campo("ssoTenantId", e.target.value)}
                />
              </Label>
              <Label titulo="URL do sistema">
                <input
                  className={inputBase}
                  placeholder="https://movecta.jetguard.com.br"
                  value={form.ssoFrontendUrl || ""}
                  onChange={(e) => campo("ssoFrontendUrl", e.target.value)}
                />
              </Label>
              <Label titulo="URL de callback" className="xl:col-span-2">
                <input
                  className={inputBase}
                  placeholder="https://movecta.jetguard.com.br/api/auth/sso/callback"
                  value={form.ssoCallbackUrl || ""}
                  onChange={(e) => campo("ssoCallbackUrl", e.target.value)}
                />
              </Label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Label titulo="URL de autorização">
                <input
                  className={inputBase}
                  placeholder="Opcional para OIDC genérico"
                  value={form.ssoAuthorizationUrl || ""}
                  onChange={(e) =>
                    campo("ssoAuthorizationUrl", e.target.value)
                  }
                />
              </Label>
              <Label titulo="URL de token">
                <input
                  className={inputBase}
                  placeholder="Opcional para OIDC genérico"
                  value={form.ssoTokenUrl || ""}
                  onChange={(e) => campo("ssoTokenUrl", e.target.value)}
                />
              </Label>
              <Label titulo="URL userinfo">
                <input
                  className={inputBase}
                  placeholder="Opcional para OIDC genérico"
                  value={form.ssoUserInfoUrl || ""}
                  onChange={(e) => campo("ssoUserInfoUrl", e.target.value)}
                />
              </Label>
              <Label titulo="URL de logout">
                <input
                  className={inputBase}
                  placeholder="Opcional"
                  value={form.ssoLogoutUrl || ""}
                  onChange={(e) => campo("ssoLogoutUrl", e.target.value)}
                />
              </Label>
              <Label titulo="Metadados SAML">
                <input
                  className={inputBase}
                  placeholder="URL de metadata, se usar SAML"
                  value={form.ssoMetadataUrl || ""}
                  onChange={(e) => campo("ssoMetadataUrl", e.target.value)}
                />
              </Label>
              <Label titulo="Modo de permissões">
                <select
                  className={inputBase}
                  value={form.ssoModoPermissao || "perfil_manual"}
                  onChange={(e) => campo("ssoModoPermissao", e.target.value)}
                >
                  <option value="perfil_manual">
                    Perfil manual no MoveSecurity
                  </option>
                  <option value="grupos_corporativos">
                    Grupos corporativos
                  </option>
                  <option value="hibrido">Híbrido</option>
                </select>
              </Label>
            </div>

            <Label titulo="Certificado SAML" ajuda="Use apenas se o T.I escolher SAML 2.0.">
              <textarea
                className={`${inputBase} min-h-28 resize-y font-mono text-xs`}
                placeholder="Cole o certificado público ou deixe vazio para OIDC/OAuth2"
                value={form.ssoCertificado || ""}
                onChange={(e) => campo("ssoCertificado", e.target.value)}
              />
            </Label>

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60 lg:flex-row lg:items-center lg:justify-between">
              <label className="inline-flex cursor-pointer items-center gap-3 text-sm font-black text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={form.ssoLoginLocalEmergencia !== false}
                  onChange={(e) =>
                    campo("ssoLoginLocalEmergencia", e.target.checked)
                  }
                  className="h-5 w-5 accent-blue-600"
                />
                Manter login local administrativo de emergência
              </label>
              <button
                type="button"
                onClick={testarConfiguracaoSso}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-50 dark:border-blue-500/30 dark:bg-slate-950 dark:text-blue-200 dark:hover:bg-blue-500/10"
              >
                <KeyRound size={16} />
                Testar configuração
              </button>
            </div>

            {(mensagemSso || ssoCompleto) && (
              <div
                className={`flex items-start gap-3 rounded-2xl border p-4 text-sm font-bold ${
                  ssoCompleto
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                    : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
                }`}
              >
                <CheckCircle2 size={18} />
                <span>
                  {mensagemSso ||
                    "Os campos principais do SSO estão preenchidos."}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
          <button
            disabled={salvando}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:bg-slate-400"
          >
            <Save size={17} />
            {salvando ? "Salvando..." : "Salvar configurações"}
          </button>
        </div>
      </form>
    </div>
  );
}
