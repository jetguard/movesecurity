import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

function lerCookie(nome: string) {
  return document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${nome}=`))
    ?.slice(nome.length + 1);
}

const metodosComCsrf = new Set(["post", "put", "patch", "delete"]);
const rotasSemCsrf = ["/auth/login", "/auth/refresh", "/auth/csrf"];
let renovacaoEmAndamento: Promise<{ usuario?: unknown }> | null = null;

function renovarSessaoUmaVez() {
  if (!renovacaoEmAndamento) {
    renovacaoEmAndamento = axios
      .post("/api/auth/refresh", {}, { withCredentials: true })
      .then((response) => response.data)
      .finally(() => {
        renovacaoEmAndamento = null;
      });
  }

  return renovacaoEmAndamento;
}

api.interceptors.request.use(async (config) => {
  const unidadeAtiva = sessionStorage.getItem("unidadeAtiva");
  if (unidadeAtiva) {
    config.headers["X-Unidade-Ativa"] = unidadeAtiva;
  }

  const metodo = String(config.method || "get").toLowerCase();
  const url = String(config.url || "");
  if (metodosComCsrf.has(metodo) && !rotasSemCsrf.some((rota) => url.startsWith(rota))) {
    let csrf = lerCookie("jetguard_csrf");
    if (!csrf) {
      const response = await axios.get("/api/auth/csrf", { withCredentials: true });
      csrf = response.data?.csrfToken || lerCookie("jetguard_csrf");
    }
    if (csrf) {
      config.headers["X-CSRF-Token"] = csrf;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 403 && error.response?.data?.code === "TROCA_SENHA_OBRIGATORIA") {
      try {
        const usuarioCache = JSON.parse(localStorage.getItem("usuario") || "null");
        if (usuarioCache) {
          localStorage.setItem("usuario", JSON.stringify({ ...usuarioCache, deveAlterarSenha: true }));
        }
      } catch {
        // cache local corrompido: o redirecionamento abaixo ainda protege a rota
      }

      if (window.location.pathname !== "/alterar-senha") {
        window.location.href = "/alterar-senha";
      }
    }

    if (error.response?.status === 401 && window.location.pathname !== "/login") {
      const originalRequest = error.config;
      if (!originalRequest?._retry && !String(originalRequest?.url || "").includes("/auth/refresh")) {
        originalRequest._retry = true;
        try {
          const refresh = await renovarSessaoUmaVez();
          if (refresh.usuario) {
            localStorage.setItem("usuario", JSON.stringify(refresh.usuario));
          }
          return api(originalRequest);
        } catch {
          // segue para encerramento local da sessão
        }
      }

      localStorage.removeItem("usuario");
      localStorage.removeItem("sistemaBloqueado");
      localStorage.removeItem("jetguardUltimaAtividade");
      sessionStorage.removeItem("loginInicio");
      if (error.response?.data?.code === "SESSAO_ENCERRADA") {
        alert("Sua sessão foi encerrada pelo administrador. Faça login novamente.");
      }
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

