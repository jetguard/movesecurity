export function solicitarPinOperacional(mensagem: string) {
  return new Promise<string | null>((resolve) => {
    const container = document.createElement("div");
    container.className = "fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm";
    container.innerHTML = `
      <div class="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/20 text-xl font-bold text-blue-200 ring-1 ring-blue-400/30">
          PIN
        </div>
        <h2 class="mt-4 text-center text-xl font-bold">PIN operacional</h2>
        <p class="mt-2 text-center text-sm leading-6 text-slate-300">${mensagem}</p>
        <label class="mt-5 block">
          <span class="mb-2 block text-sm font-semibold text-slate-200">Digite os 4 dígitos</span>
          <input
            id="jetguard-pin-operacional"
            type="password"
            value=""
            inputmode="numeric"
            maxlength="4"
            autocomplete="new-password"
            name="jetguard-pin-${Date.now()}"
            class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-xl font-bold tracking-[0.5em] text-white outline-none transition placeholder:tracking-normal placeholder:text-sm placeholder:font-normal placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
            placeholder=""
          />
        </label>
        <div class="mt-5 grid grid-cols-2 gap-3">
          <button id="jetguard-pin-cancelar" type="button" class="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200 transition hover:bg-slate-900">
            Cancelar
          </button>
          <button id="jetguard-pin-confirmar" type="button" class="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500">
            Confirmar
          </button>
        </div>
      </div>
    `;

    function fechar(valor: string | null) {
      container.remove();
      resolve(valor);
    }

    document.body.appendChild(container);
    const input = container.querySelector<HTMLInputElement>("#jetguard-pin-operacional");
    const confirmar = container.querySelector<HTMLButtonElement>("#jetguard-pin-confirmar");
    const cancelar = container.querySelector<HTMLButtonElement>("#jetguard-pin-cancelar");

    input?.focus();
    input?.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(0, 4);
    });
    input?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") fechar(input.value || null);
      if (event.key === "Escape") fechar(null);
    });
    confirmar?.addEventListener("click", () => fechar(input?.value || null));
    cancelar?.addEventListener("click", () => fechar(null));
    container.addEventListener("click", (event) => {
      if (event.target === container) fechar(null);
    });
  });
}
