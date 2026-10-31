import type { EvaluationEntry } from "../engine/types";

export const NOT_SIMULATED_LABEL = "Não simulado";

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString("pt-BR");
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${day} ${time}`;
}

export function formatEvaluationSummary(entry: EvaluationEntry): string {
  const dateTime = formatDateTime(entry.createdAt);
  const rps = entry.rps.toLocaleString("pt-BR");
  const outcome = entry.metrics
    ? `${Math.round(entry.metrics.successRatio * 100)}% sucesso`
    : NOT_SIMULATED_LABEL;
  return `${dateTime} · ${rps} RPS · ${entry.writePercent}% escritas · ${outcome}`;
}

export function formatEvaluationDetail(entry: EvaluationEntry): string {
  if (!entry.metrics) return `${entry.model} · ${NOT_SIMULATED_LABEL}`;

  const success = `${Math.round(entry.metrics.successRatio * 100)}% sucesso`;
  const latency = `${Math.round(entry.metrics.e2eLatencyMs)} ms`;
  const total = `${Math.round(entry.metrics.totalRps).toLocaleString("pt-BR")} RPS totais`;
  return `${entry.model} · ${success} · ${latency} · ${total}`;
}
