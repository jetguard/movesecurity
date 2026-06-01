import { Download, FileText, X } from "lucide-react";

type PdfLightboxProps = {
  url: string;
  titulo: string;
  nomeArquivo?: string;
  onClose: () => void;
};

export function PdfLightbox({ url, titulo, nomeArquivo = "documento.pdf", onClose }: PdfLightboxProps) {
  function baixarPdf() {
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-md sm:p-6">
      <div className="flex h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-200 ring-1 ring-blue-400/30">
              <FileText size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Visualização PDF</p>
              <h2 className="truncate text-lg font-bold text-white sm:text-xl">{titulo}</h2>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={baixarPdf}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-500"
            >
              <Download size={16} />
              Salvar PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-100 transition hover:bg-white/10"
            >
              <X size={16} />
              Fechar
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-slate-900 p-2 sm:p-4">
          <iframe
            src={url}
            title={titulo}
            className="h-full w-full rounded-xl border border-white/10 bg-white"
          />
        </div>
      </div>
    </div>
  );
}
