import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const unidadeAtiva = sessionStorage.getItem("unidadeAtiva");
  if (unidadeAtiva) {
    config.headers["X-Unidade-Ativa"] = unidadeAtiva;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 403 && error.response?.data?.code === "TROCA_SENHA_OBRIGATORIA") {
      if (window.location.pathname !== "/alterar-senha") {
        window.location.href = "/alterar-senha";
      }
    }

    if (error.response?.status === 401 && window.location.pathname !== "/login") {
      const originalRequest = error.config;
      if (!originalRequest?._retry && !String(originalRequest?.url || "").includes("/auth/refresh")) {
        originalRequest._retry = true;
        try {
          const refresh = await api.post("/auth/refresh");
          if (refresh.data?.usuario) {
            localStorage.setItem("usuario", JSON.stringify(refresh.data.usuario));
          }
          return api(originalRequest);
        } catch {
          // segue para encerramento local da sessão
        }
      }

      localStorage.removeItem("usuario");
      localStorage.removeItem("sistemaBloqueado");
      sessionStorage.removeItem("loginInicio");
      if (error.response?.data?.code === "SESSAO_ENCERRADA") {
        alert("Sua sessão foi encerrada pelo administrador. Faça login novamente.");
      }
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

