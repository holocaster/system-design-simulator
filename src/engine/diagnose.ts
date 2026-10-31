import type { ComponentParams, ComponentType, NodeMetrics } from "./types";

export interface Diagnosis {
  cause: string;
  action: string;
}

const EDGE_TYPES: ComponentType[] = ["gateway", "loadbalancer", "cdn", "cache", "storage"];

function pct(utilization: number): string {
  return `${Math.round(utilization * 100)}%`;
}

function rps(value: number): string {
  return String(Math.round(value));
}

function databaseSaturation(
  type: "sql" | "nosql",
  readUtil: number,
  writeUtil: number
): Diagnosis {
  const writeDominates = writeUtil >= readUtil;
  if (writeDominates) {
    return type === "sql"
      ? {
          cause: `Escrita saturou a primária (${pct(writeUtil)}).`,
          action: "Réplicas não escalam escrita; particione ou reduza escrita.",
        }
      : {
          cause: `Escrita saturou os shards (${pct(writeUtil)}).`,
          action: "Adicione shards para escalar escrita.",
        };
  }
  return type === "sql"
    ? {
        cause: `Leitura saturou (${pct(readUtil)}).`,
        action: "Adicione réplicas de leitura ou um cache na frente.",
      }
    : {
        cause: `Leitura saturou (${pct(readUtil)}).`,
        action: "Adicione réplicas ou shards.",
      };
}

export function diagnose(
  type: ComponentType,
  metrics: NodeMetrics,
  params: ComponentParams
): Diagnosis | null {
  if (metrics.readyReplicas === 0) {
    return {
      cause: "Fora do ar: todas as réplicas caíram sob carga.",
      action: "Réplicas reiniciam sozinhas após um tempo fixo; se a sobrecarga continuar, caem de novo.",
    };
  }

  const partialReplicas = metrics.readyReplicas < metrics.totalReplicas;
  if (partialReplicas && (metrics.state === "overloaded" || metrics.state === "degraded")) {
    const prefix = metrics.state === "overloaded" ? "Sobrecarga" : "Perto do limite";
    return {
      cause: `${prefix} com réplicas caídas (${metrics.readyReplicas}/${metrics.totalReplicas}).`,
      action: "Réplicas caídas reiniciam sozinhas após um tempo fixo, sem depender da utilização.",
    };
  }

  const isDatabase = type === "sql" || type === "nosql";

  if (metrics.state === "overloaded") {
    if (
      isDatabase &&
      metrics.readUtilization !== undefined &&
      metrics.writeUtilization !== undefined
    ) {
      return databaseSaturation(type, metrics.readUtilization, metrics.writeUtilization);
    }
    if (type === "queue") {
      return {
        cause: `Fila sem vazão: chegam ${rps(metrics.incomingRps)}, capacidade ${rps(params.capacity)}.`,
        action: "Acelere os workers a jusante ou aumente a fila.",
      };
    }
    const capacity = params.capacity * metrics.readyReplicas;
    return {
      cause: `Sobrecarga: chegam ${rps(metrics.incomingRps)} RPS, capacidade ${rps(capacity)}.`,
      action: EDGE_TYPES.includes(type)
        ? "Aumente a capacidade."
        : "Aumente réplicas ou capacidade.",
    };
  }

  if (metrics.state === "degraded") {
    return {
      cause: `Perto do limite (${pct(metrics.utilization)}).`,
      action: "Margem baixa; reforce antes do pico.",
    };
  }

  if (metrics.readyReplicas < metrics.totalReplicas) {
    return {
      cause: `Recuperando: ${metrics.readyReplicas} de ${metrics.totalReplicas} réplicas prontas.`,
      action: "Réplicas voltam uma a uma, num tempo fixo de reinício.",
    };
  }

  return null;
}
