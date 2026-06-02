import { lazy } from "react";

const CHUNK_RELOAD_KEY = "jetguard:chunk-reload";

function erroDeChunkAntigo(error: unknown) {
  const mensagem = error instanceof Error ? error.message : String(error || "");
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|MIME type/i.test(mensagem);
}

export function lazyWithReload<T extends { default: React.ComponentType<unknown> }>(
  importer: () => Promise<T>
) {
  return lazy(async () => {
    try {
      const modulo = await importer();
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      return modulo;
    } catch (error) {
      if (erroDeChunkAntigo(error) && sessionStorage.getItem(CHUNK_RELOAD_KEY) !== "1") {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
        window.location.reload();
      }
      throw error;
    }
  });
}
