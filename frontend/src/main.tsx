import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const CHUNK_RELOAD_KEY = "jetguard:chunk-reload";

function ehErroDeBuildAntigo(error: unknown) {
  const mensagem = error instanceof Error ? error.message : String(error || "");
  return /Failed to fetch dynamically imported module|Importing a module script failed|module script|MIME type|Loading chunk/i.test(mensagem);
}

function recarregarUmaVezPorBuildAntigo(error: unknown) {
  if (!ehErroDeBuildAntigo(error)) return;
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") return;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  window.location.reload();
}

window.addEventListener("error", (event) => {
  recarregarUmaVezPorBuildAntigo(event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  recarregarUmaVezPorBuildAntigo(event.reason);
});

const temaSalvo = localStorage.getItem("tema");
const temaInicial =
  temaSalvo === "dark" ||
  (!temaSalvo && window.matchMedia("(prefers-color-scheme: dark)").matches);

document.documentElement.classList.toggle("dark", temaInicial);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

