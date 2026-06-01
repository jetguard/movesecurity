import { AlertTriangle, CheckCircle2, Clock, RefreshCw } from "lucide-react";

type Props = {
  status: "idle" | "loading" | "saving" | "saved" | "error";
  ultima?: string | null;
};

function formatarHora(data?: string | null) {
  if (!data) return "";
  return new Date(data).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AutoSaveStatus({ status, ultima }: Props) {
  if (status === "idle" && !ultima) return null;

  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
        <AlertTriangle size={14} />
        Falha ao salvar rascunho
      </span>
    );
  }

  if (status === "loading") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <Clock size={14} />
        Verificando rascunho...
      </span>
    );
  }

  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
        <RefreshCw size={14} className="animate-spin" />
        Salvando rascunho...
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
      <CheckCircle2 size={14} />
      Rascunho salvo{ultima ? ` às ${formatarHora(ultima)}` : ""}
    </span>
  );
}
