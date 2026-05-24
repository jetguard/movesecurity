import { describe, expect, it } from "vitest";
import { estaAprovado, STATUS_WORKFLOW } from "./status";

describe("status workflow", () => {
  it("identifica registros aprovados", () => {
    expect(estaAprovado({ fluxoStatus: STATUS_WORKFLOW.APROVADO })).toBe(true);
  });

  it("não considera registros pendentes como aprovados", () => {
    expect(estaAprovado({ fluxoStatus: STATUS_WORKFLOW.AGUARDANDO_REVISAO })).toBe(false);
    expect(estaAprovado({ fluxoStatus: null })).toBe(false);
    expect(estaAprovado({})).toBe(false);
  });
});
