import { describe, expect, it } from "vitest";
import { diagnose } from "./diagnose";
import type { ComponentParams, ComponentType, NodeMetrics } from "./types";

function metrics(over: Partial<NodeMetrics>): NodeMetrics {
  return {
    incomingRps: 0,
    processedRps: 0,
    successRps: 0,
    errorRps: 0,
    utilization: 0,
    effectiveLatencyMs: 0,
    state: "healthy",
    overloadTicks: 0,
    restartTicks: 0,
    scaleDownTicks: 0,
    desiredReplicas: 1,
    readyReplicas: 1,
    totalReplicas: 1,
    flows: {
      incoming: { read: 0, write: 0 },
      success: { read: 0, write: 0 },
      error: { read: 0, write: 0 },
    },
    ...over,
  };
}

function params(over: Partial<ComponentParams> = {}): ComponentParams {
  return { capacity: 500, baseLatencyMs: 20, errorRate: 0, ...over };
}

function diag(type: ComponentType, m: Partial<NodeMetrics>, p?: Partial<ComponentParams>) {
  return diagnose(type, metrics(m), params(p));
}

describe("diagnose", () => {
  it("AC1: retorna null para no saudavel com replicas completas", () => {
    expect(diag("service", { state: "healthy", utilization: 0.4 })).toBeNull();
  });

  it("AC2: down produz causa de fora do ar independente do tipo", () => {
    const d = diag("service", { state: "down", readyReplicas: 0, totalReplicas: 3 });
    expect(d?.cause).toContain("Fora do ar");
    expect(d?.action).toContain("reiniciam sozinhas");
  });

  it("AC3: SQL com escrita saturada cita a primaria", () => {
    const d = diag("sql", {
      state: "overloaded",
      utilization: 1.5,
      readUtilization: 0.3,
      writeUtilization: 1.5,
    });
    expect(d?.cause).toContain("Escrita saturou a primária");
    expect(d?.cause).toContain("150%");
    expect(d?.action).toContain("Réplicas não escalam escrita");
  });

  it("AC3: NoSQL com escrita saturada cita shards", () => {
    const d = diag("nosql", {
      state: "overloaded",
      utilization: 2,
      readUtilization: 0.5,
      writeUtilization: 2,
    });
    expect(d?.cause).toContain("Escrita saturou os shards");
    expect(d?.action).toContain("Adicione shards");
  });

  it("AC4: SQL com leitura saturada sugere replicas e cache", () => {
    const d = diag("sql", {
      state: "overloaded",
      utilization: 1.3,
      readUtilization: 1.3,
      writeUtilization: 0.2,
    });
    expect(d?.cause).toContain("Leitura saturou");
    expect(d?.action).toContain("réplicas");
    expect(d?.action).toContain("cache");
  });

  it("AC4: NoSQL com leitura saturada sugere replicas ou shards", () => {
    const d = diag("nosql", {
      state: "overloaded",
      utilization: 1.3,
      readUtilization: 1.3,
      writeUtilization: 0.2,
    });
    expect(d?.cause).toContain("Leitura saturou");
    expect(d?.action).toContain("shards");
  });

  it("AC5: fila sobrecarregada cita vazao e workers a jusante", () => {
    const d = diag(
      "queue",
      { state: "overloaded", utilization: 1.2, incomingRps: 12_000 },
      { capacity: 10_000 }
    );
    expect(d?.cause).toContain("Fila sem vazão");
    expect(d?.cause).toContain("12000");
    expect(d?.cause).toContain("10000");
    expect(d?.action).toContain("workers");
  });

  it("AC6: generico sobrecarregado mostra RPS de entrada e capacidade efetiva", () => {
    const d = diag(
      "service",
      { state: "overloaded", utilization: 2, incomingRps: 4_000, readyReplicas: 4, totalReplicas: 4 },
      { capacity: 500 }
    );
    expect(d?.cause).toContain("Sobrecarga");
    expect(d?.cause).toContain("4000");
    expect(d?.cause).toContain("2000");
    expect(d?.action).toContain("réplicas");
  });

  it("AC6: borda sobrecarregada sugere aumentar capacidade", () => {
    const d = diag(
      "gateway",
      { state: "overloaded", utilization: 1.5, incomingRps: 30_000, readyReplicas: 1, totalReplicas: 1 },
      { capacity: 20_000 }
    );
    expect(d?.cause).toContain("Sobrecarga");
    expect(d?.action).toContain("Aumente a capacidade");
    expect(d?.action).not.toContain("réplicas");
  });

  it("AC7: degraded usa texto perto do limite", () => {
    const d = diag("service", { state: "degraded", utilization: 0.85 });
    expect(d?.cause).toContain("Perto do limite");
    expect(d?.cause).toContain("85%");
    expect(d?.action).toContain("antes do pico");
  });

  it("AC7: overloaded com replicas caidas avisa que o reinicio e por tempo fixo", () => {
    const d = diag("service", {
      state: "overloaded",
      utilization: 2,
      incomingRps: 4_000,
      readyReplicas: 2,
      totalReplicas: 4,
    });
    expect(d?.cause).toContain("Sobrecarga com réplicas caídas");
    expect(d?.cause).toContain("2/4");
    expect(d?.action).toContain("sem depender da utilização");
  });

  it("AC10: degraded com replicas caidas avisa que o reinicio e por tempo fixo", () => {
    const d = diag("service", {
      state: "degraded",
      utilization: 0.9,
      readyReplicas: 10,
      totalReplicas: 20,
    });
    expect(d?.cause).toContain("Perto do limite com réplicas caídas");
    expect(d?.cause).toContain("10/20");
    expect(d?.action).toContain("sem depender da utilização");
  });

  it("AC10: overloaded com replicas completas mantem mensagem generica", () => {
    const d = diag(
      "service",
      { state: "overloaded", utilization: 2, incomingRps: 4_000, readyReplicas: 4, totalReplicas: 4 },
      { capacity: 500 }
    );
    expect(d?.cause).toContain("Sobrecarga: chegam");
    expect(d?.cause).not.toContain("réplicas caídas");
  });

  it("AC8: replicas parciais sem sobrecarga mostram A de B prontas", () => {
    const d = diag("service", {
      state: "healthy",
      utilization: 0.5,
      readyReplicas: 2,
      totalReplicas: 4,
    });
    expect(d?.cause).toContain("Recuperando");
    expect(d?.cause).toContain("2 de 4");
    expect(d?.action).toContain("uma a uma");
  });
});
