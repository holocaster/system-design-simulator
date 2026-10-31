import { describe, expect, it } from "vitest";
import type { EvaluationEntry } from "../engine/types";
import {
  formatEvaluationDetail,
  formatEvaluationSummary,
  NOT_SIMULATED_LABEL,
} from "./evaluationSummary";

function makeEntry(overrides: Partial<EvaluationEntry> = {}): EvaluationEntry {
  return {
    text: "Crítica.",
    createdAt: "2026-07-21T14:32:00.000Z",
    rps: 5_000,
    writePercent: 35,
    model: "openai/gpt-5.2",
    ...overrides,
  };
}

describe("formatEvaluationSummary", () => {
  it("inclui data, hora, RPS, percentual de escritas e taxa de sucesso", () => {
    const summary = formatEvaluationSummary(
      makeEntry({ metrics: { successRatio: 0.62, e2eLatencyMs: 40, totalRps: 5_000 } }),
    );
    expect(summary).toContain("5.000 RPS");
    expect(summary).toContain("35% escritas");
    expect(summary).toContain("62% sucesso");
  });

  it("marca a rodada sem métricas como não simulada, nunca com zero", () => {
    const summary = formatEvaluationSummary(makeEntry({ metrics: undefined }));
    expect(summary).toContain(NOT_SIMULATED_LABEL);
    expect(summary).not.toContain("0% sucesso");
  });

  it("arredonda a taxa de sucesso para o inteiro mais próximo", () => {
    const summary = formatEvaluationSummary(
      makeEntry({ metrics: { successRatio: 0.995, e2eLatencyMs: 10, totalRps: 100 } }),
    );
    expect(summary).toContain("100% sucesso");
  });
});

describe("formatEvaluationDetail", () => {
  it("mostra o modelo, para que críticas de modelos diferentes não sejam comparadas como a mesma régua", () => {
    const detail = formatEvaluationDetail(
      makeEntry({ metrics: { successRatio: 0.62, e2eLatencyMs: 40, totalRps: 5_000 } }),
    );
    expect(detail).toContain("openai/gpt-5.2");
  });

  it("mostra latência ponta a ponta e RPS total, que a linha do item omite", () => {
    const detail = formatEvaluationDetail(
      makeEntry({ metrics: { successRatio: 0.99, e2eLatencyMs: 40.4, totalRps: 4_980.6 } }),
    );
    expect(detail).toContain("40 ms");
    expect(detail).toContain("4.981 RPS totais");
  });

  it("sem métricas mostra o modelo e a marca de não simulado, sem números inventados", () => {
    const detail = formatEvaluationDetail(makeEntry({ metrics: undefined }));
    expect(detail).toContain("openai/gpt-5.2");
    expect(detail).toContain(NOT_SIMULATED_LABEL);
    expect(detail).not.toContain("ms");
  });
});
