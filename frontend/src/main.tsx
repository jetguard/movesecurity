import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

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

