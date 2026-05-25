import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const unidadeAtiva = sessionStorage.getItem("unidadeAtiva");
  if (unidadeAtiva) {
    config.headers["X-Unidade-Ativa"] = unidadeAtiva;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 && error.response?.data?.code === "TROCA_SENHA_OBRIGATORIA") {
      if (window.location.pathname !== "/alterar-senha") {
        window.location.href = "/alterar-senha";
      }
    }

    if (error.response?.status === 401 && window.location.pathname !== "/login") {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      sessionStorage.removeItem("loginInicio");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

