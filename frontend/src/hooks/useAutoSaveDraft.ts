import { useEffect, useRef, useState } from "react";
import { api } from "../services/api";

type AutoSaveStatus = "idle" | "loading" | "saving" | "saved" | "error";

type UseAutoSaveDraftOptions<T> = {
  modulo: string;
  chave: string;
  dados: T;
  ativo?: boolean;
  delay?: number;
  onRestore: (dados: T) => void;
};

export function useAutoSaveDraft<T>({
  modulo,
  chave,
  dados,
  ativo = true,
  delay = 1200,
  onRestore,
}: UseAutoSaveDraftOptions<T>) {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [ultima, setUltima] = useState<string | null>(null);
  const [rascunhoId, setRascunhoId] = useState<number | null>(null);
  const carregou = useRef(false);
  const ultimoJson = useRef("");
  const ignorarProximo = useRef(false);
  const dadosAtuais = useRef(dados);
  const onRestoreRef = useRef(onRestore);

  useEffect(() => {
    dadosAtuais.current = dados;
  }, [dados]);

  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  useEffect(() => {
    carregou.current = false;
    ultimoJson.current = "";
    setRascunhoId(null);
    setUltima(null);

    if (!ativo || !modulo || !chave) return;

    let cancelado = false;
    setStatus("loading");

    api
      .get("/rascunhos", { params: { modulo, chave } })
      .then((response) => {
        if (cancelado) return;
        const rascunho = response.data;
        if (rascunho?.id && rascunho?.dados) {
          setRascunhoId(rascunho.id);
          setUltima(rascunho.ultimaAlteracao || rascunho.updatedAt || null);
          const restaurar = window.confirm("Existe um rascunho salvo para este formulário. Deseja continuar de onde parou?");
          if (restaurar) {
            ignorarProximo.current = true;
            ultimoJson.current = JSON.stringify(rascunho.dados);
            onRestoreRef.current(rascunho.dados as T);
          }
        } else {
          ultimoJson.current = JSON.stringify(dadosAtuais.current || {});
        }
        carregou.current = true;
        setStatus("idle");
      })
      .catch(() => {
        if (!cancelado) {
          carregou.current = true;
          setStatus("idle");
        }
      });

    return () => {
      cancelado = true;
    };
  }, [ativo, modulo, chave]);

  useEffect(() => {
    if (!ativo || !carregou.current || !modulo || !chave) return;

    const json = JSON.stringify(dados || {});
    if (ignorarProximo.current) {
      ignorarProximo.current = false;
      return;
    }

    if (json === ultimoJson.current || json.length < 8) return;

    setStatus("saving");
    const timer = window.setTimeout(async () => {
      try {
        const response = await api.post("/rascunhos", { modulo, chave, dados });
        ultimoJson.current = json;
        setRascunhoId(response.data?.id || null);
        setUltima(response.data?.ultimaAlteracao || new Date().toISOString());
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [ativo, modulo, chave, dados, delay]);

  async function descartar() {
    if (!rascunhoId) return;
    await api.delete(`/rascunhos/${rascunhoId}`);
    setRascunhoId(null);
    setUltima(null);
    ultimoJson.current = "";
    setStatus("idle");
  }

  return { status, ultima, rascunhoId, descartar };
}
