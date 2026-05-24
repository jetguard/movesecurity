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

