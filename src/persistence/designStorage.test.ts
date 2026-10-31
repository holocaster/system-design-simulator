import { describe, expect, it } from "vitest";
import { DEFAULT_AUTOSCALING, DEFAULT_PARAMS } from "../engine/catalog";
import type { AutoscalingConfig, Design, EvaluationEntry } from "../engine/types";
import {
  exportJson,
  importJson,
  listDesigns,
  loadDesign,
  saveDesign,
} from "./designStorage";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const design: Design = {
  schema: 1,
  id: "test-design",
  name: "principal",
  nodes: [
    {
      id: "service-1",
      type: "service",
      name: "Serviço de ingestão",
      position: { x: 20, y: 40 },
      params: { ...DEFAULT_PARAMS.service, capacity: 3500 },
    },
    {
      id: "sql-1",
      type: "sql",
      position: { x: 240, y: 40 },
      params: { ...DEFAULT_PARAMS.sql, errorRate: 0.02 },
    },
  ],
  edges: [{ id: "edge-1", source: "service-1", target: "sql-1" }],
};

describe("designStorage (SIM-07)", () => {
  it("atualiza a mesma entidade pelo id após renomear", () => {
    const storage = new MemoryStorage();
    const renamed = { ...design, name: "Renomeado", edges: [] };

    expect(saveDesign(design, storage)).toEqual({ ok: true, value: undefined });
    expect(saveDesign(renamed, storage)).toEqual({ ok: true, value: undefined });
    expect(listDesigns(storage)).toEqual({ ok: true, value: [{ id: "test-design", name: "Renomeado" }] });
    expect(loadDesign("test-design", storage)).toEqual({ ok: true, value: renamed });
  });

  it("renomeia somente o metadado, preservando a identidade e o conteúdo", async () => {
    const { renameDesign } = await import("./designStorage");
    const storage = new MemoryStorage();
    saveDesign(design, storage);
    expect(renameDesign(design.id, "  Renomeado  ", false, storage)).toEqual({ ok: true, value: undefined });
    expect(loadDesign(design.id, storage)).toEqual({ ok: true, value: { ...design, name: "Renomeado" } });
  });

  it("salva apenas pelo id e normaliza o nome", () => {
    const storage = new MemoryStorage();
    const updated = { ...design, name: "  Principal atualizado  ", nodes: [design.nodes[0]] };

    expect(saveDesign(design, storage)).toEqual({ ok: true, value: undefined });
    expect(saveDesign(updated, storage)).toEqual({ ok: true, value: undefined });
    expect(loadDesign(design.id, storage)).toEqual({ ok: true, value: { ...updated, name: "Principal atualizado" } });
  });

  it("detecta nomes duplicados sem diferenciar maiúsculas e permite substituição explícita", () => {
    const storage = new MemoryStorage();
    const second = { ...design, id: "segundo", name: "  PRINCIPAL  ", edges: [] };
    saveDesign(design, storage);

    expect(saveDesign(second, storage)).toEqual({ ok: false, error: "Já existe outro design com esse nome" });
    expect(saveDesign(second, true, storage)).toEqual({ ok: true, value: undefined });
    expect(listDesigns(storage)).toEqual({ ok: true, value: [{ id: "segundo", name: "PRINCIPAL" }] });
    expect(loadDesign(design.id, storage)).toEqual({ ok: true, value: null });
  });

  it("AC3 exporta JSON com schema, nós, conexões e parâmetros completos", () => {
    expect(JSON.parse(exportJson(design))).toEqual(design);
  });

  it("AC4 importa um JSON válido e restaura o design completo", () => {
    expect(importJson(JSON.stringify(design))).toEqual({ ok: true, value: design });
  });

  it("preserva réplicas e shards no round-trip de exportação e importação", () => {
    const scaled = structuredClone(design);
    scaled.nodes[0].params.replicas = 5;
    scaled.nodes[1] = {
      ...scaled.nodes[1],
      type: "nosql",
      params: { ...DEFAULT_PARAMS.nosql, replicas: 3, shards: 4 },
    };

    expect(importJson(exportJson(scaled))).toEqual({ ok: true, value: scaled });
  });

  it("importa design antigo sem réplicas e shards", () => {
    const legacy = structuredClone(design);
    for (const node of legacy.nodes) {
      delete node.params.replicas;
      delete node.params.shards;
    }

    const result = importJson(JSON.stringify(legacy));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.nodes[0].params.replicas).toBeUndefined();
      expect(result.value.nodes[1].params.shards).toBeUndefined();
    }
  });

  it("rejeita réplicas e shards fora de 1 a 20 ou fracionários", () => {
    for (const key of ["replicas", "shards"] as const) {
      for (const value of [0, 21, 2.5]) {
        const invalid = structuredClone(design);
        invalid.nodes[0].params[key] = value;
        expect(importJson(JSON.stringify(invalid))).toEqual({
          ok: false,
          error: "Parâmetro fora dos limites",
        });
      }
    }
  });

  it("preserva a configuração de autoscaling no round-trip completo (AD-029)", () => {
    const storage = new MemoryStorage();
    const scaled = structuredClone(design);
    scaled.nodes[0].params.autoscaling = {
      minReplicas: 2,
      maxReplicas: 8,
      targetUtilization: 0.8,
    };

    expect(importJson(exportJson(scaled))).toEqual({ ok: true, value: scaled });
    saveDesign(scaled, storage);
    expect(loadDesign(scaled.id, storage)).toEqual({ ok: true, value: scaled });
  });

  it("mantém o schema em 1 com autoscaling configurado", () => {
    const scaled = structuredClone(design);
    scaled.nodes[0].params.autoscaling = { ...DEFAULT_AUTOSCALING };
    expect(JSON.parse(exportJson(scaled)).schema).toBe(1);
  });

  it("rejeita autoscaling malformado na importação", () => {
    const malformed: unknown[] = [
      { minReplicas: 1, maxReplicas: 10 },
      { minReplicas: 1, maxReplicas: 10, targetUtilization: "0.6" },
      { minReplicas: 0, maxReplicas: 10, targetUtilization: 0.6 },
      { minReplicas: 1, maxReplicas: 21, targetUtilization: 0.6 },
      { minReplicas: 1, maxReplicas: 10, targetUtilization: 1.5 },
      { minReplicas: 8, maxReplicas: 3, targetUtilization: 0.6 },
    ];
    for (const autoscaling of malformed) {
      const invalid = structuredClone(design);
      invalid.nodes[0].params.autoscaling = autoscaling as AutoscalingConfig;
      expect(importJson(JSON.stringify(invalid))).toEqual({
        ok: false,
        error: "Configuração de autoscaling inválida",
      });
    }
  });

  it("saneia autoscaling malformado vindo do armazenamento local", () => {
    const storage = new MemoryStorage();
    const corrupted = structuredClone(design);
    corrupted.nodes[0].params.autoscaling = { minReplicas: 8, maxReplicas: 3 } as AutoscalingConfig;
    saveDesign(corrupted, storage);

    const result = loadDesign(corrupted.id, storage);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value?.nodes[0].params.autoscaling).toBeUndefined();
      expect(result.value?.nodes[1]).toEqual(design.nodes[1]);
    }
  });

  it("rejeita autoscaling em tipo não replicável na importação (AD-054)", () => {
    const invalid: Design = {
      schema: 1,
      id: "test-non-replicable",
      nodes: [
        {
          id: "client-1",
          type: "client",
          position: { x: 0, y: 0 },
          params: { ...DEFAULT_PARAMS.client, autoscaling: { ...DEFAULT_AUTOSCALING } },
        },
      ],
      edges: [],
    };
    expect(importJson(JSON.stringify(invalid))).toEqual({
      ok: false,
      error: "Configuração de autoscaling inválida",
    });
  });

  it("saneia autoscaling em tipo não replicável vindo do armazenamento local (AD-054)", () => {
    const storage = new MemoryStorage();
    const corrupted: Design = {
      schema: 1,
      id: "test-non-replicable-storage",
      name: "sem replicas",
      nodes: [
        {
          id: "loadbalancer-1",
          type: "loadbalancer",
          position: { x: 0, y: 0 },
          params: { ...DEFAULT_PARAMS.loadbalancer, autoscaling: { ...DEFAULT_AUTOSCALING } },
        },
      ],
      edges: [],
    };
    saveDesign(corrupted, storage);

    const result = loadDesign(corrupted.id, storage);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value?.nodes[0].params.autoscaling).toBeUndefined();
    }
  });

  it("importa design sem autoscaling sem introduzir o campo", () => {
    const result = importJson(JSON.stringify(design));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect("autoscaling" in result.value.nodes[0].params).toBe(false);
    }
  });

  it("preserva a tecnologia do nó no round-trip de exportação e importação", () => {
    const withTech = structuredClone(design);
    withTech.nodes[0] = { ...withTech.nodes[0], tech: "kafka" };

    expect(importJson(exportJson(withTech))).toEqual({ ok: true, value: withTech });
  });

  it("aceita nó sem tecnologia (design antigo)", () => {
    const result = importJson(JSON.stringify(design));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.nodes[0].tech).toBeUndefined();
  });

  it("rejeita tecnologia que não seja string", () => {
    const invalid = structuredClone(design) as unknown as { nodes: { tech?: unknown }[] };
    invalid.nodes[0].tech = 42;
    expect(importJson(JSON.stringify(invalid))).toEqual({
      ok: false,
      error: "Tecnologia inválida",
    });
  });

  it("preserva brief e challengeId no round-trip de exportação e importação", () => {
    const withMeta: Design = {
      ...structuredClone(design),
      brief: "Projetar um encurtador de URLs",
      challengeId: "url-shortener",
    };

    expect(importJson(exportJson(withMeta))).toEqual({ ok: true, value: withMeta });
  });

  it("importa design antigo sem brief e challengeId", () => {
    const result = importJson(JSON.stringify(design));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.brief).toBeUndefined();
      expect(result.value.challengeId).toBeUndefined();
    }
  });

  it("aceita challengeId desconhecido, pois a validação da lista é responsabilidade da UI", () => {
    const withUnknownChallenge = { ...structuredClone(design), challengeId: "preset-inexistente" };
    expect(importJson(JSON.stringify(withUnknownChallenge))).toEqual({
      ok: true,
      value: withUnknownChallenge,
    });
  });

  it("rejeita brief com mais de 2000 caracteres", () => {
    const invalid = { ...structuredClone(design), brief: "a".repeat(2001) };
    expect(importJson(JSON.stringify(invalid))).toEqual({
      ok: false,
      error: "Brief inválido",
    });
  });

  it("rejeita brief que não seja string", () => {
    const invalid = { ...structuredClone(design), brief: 123 };
    expect(importJson(JSON.stringify(invalid))).toEqual({
      ok: false,
      error: "Brief inválido",
    });
  });

  it("rejeita challengeId que não seja string", () => {
    const invalid = { ...structuredClone(design), challengeId: 123 };
    expect(importJson(JSON.stringify(invalid))).toEqual({
      ok: false,
      error: "Identificador de desafio inválido",
    });
  });

  it("importa design antigo sem campo name", () => {
    const legacy = {
      ...design,
      nodes: design.nodes.map(({ name: _name, ...rest }) => rest),
    };
    const result = importJson(JSON.stringify(legacy));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.nodes[0].name).toBeUndefined();
  });

  it("AC5 rejeita JSON inválido, schema desconhecido, tipos, limites e conexões inválidas", () => {
    const invalidCases = [
      { text: "{", message: "JSON inválido" },
      { text: JSON.stringify({ ...design, schema: 2 }), message: "Schema desconhecido" },
      {
        text: JSON.stringify({
          ...design,
          nodes: [{ ...design.nodes[0], type: "mystery" }],
          edges: [],
        }),
        message: "Tipo de componente inválido",
      },
      {
        text: JSON.stringify({
          ...design,
          nodes: [{ ...design.nodes[0], name: "   " }],
          edges: [],
        }),
        message: "Nome de componente inválido",
      },
      {
        text: JSON.stringify({
          ...design,
          nodes: [{ ...design.nodes[0], name: "a".repeat(41) }],
          edges: [],
        }),
        message: "Nome de componente inválido",
      },
      {
        text: JSON.stringify({
          ...design,
          nodes: [{ ...design.nodes[0], params: { ...design.nodes[0].params, capacity: 0 } }],
          edges: [],
        }),
        message: "Parâmetro fora dos limites",
      },
      {
        text: JSON.stringify({
          ...design,
          nodes: [
            { ...design.nodes[0], id: "client-1", type: "client" },
            design.nodes[1],
          ],
          edges: [{ id: "invalid-edge", source: "client-1", target: "sql-1" }],
        }),
        message: "Conexão inválida",
      },
    ];

    for (const invalidCase of invalidCases) {
      const result = importJson(invalidCase.text);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain(invalidCase.message);
    }
  });

  it("AC6 informa falha do localStorage sem perder o design em memória", () => {
    const unavailableStorage = new MemoryStorage();
    unavailableStorage.setItem = () => {
      throw new Error("quota exceeded");
    };
    const currentDesign = structuredClone(design);

    const result = saveDesign(currentDesign, unavailableStorage);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Não foi possível salvar o design");
    expect(currentDesign).toEqual(design);
  });
});

function makeEvaluation(overrides: Partial<EvaluationEntry> = {}): EvaluationEntry {
  return {
    text: "Crítica.",
    createdAt: "2026-07-21T14:32:00.000Z",
    rps: 5_000,
    writePercent: 35,
    model: "openai/gpt-5.2",
    ...overrides,
  };
}

describe("histórico de avaliações na persistência (AD-020)", () => {
  it("importa o histórico válido junto com o design", () => {
    const withHistory = { ...design, evaluations: [makeEvaluation({ text: "Primeira" })] };

    const result = importJson(exportJson(withHistory));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.evaluations).toEqual(withHistory.evaluations);
  });

  it("descarta só a entrada malformada e preserva as válidas e o resto do design", () => {
    const withHistory = {
      ...design,
      evaluations: [
        makeEvaluation({ text: "Válida" }),
        { text: 42, createdAt: "2026-07-21T14:00:00.000Z" },
        makeEvaluation({ text: "Também válida" }),
      ],
    };

    const result = importJson(JSON.stringify(withHistory));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.evaluations?.map((entry) => entry.text)).toEqual([
      "Válida",
      "Também válida",
    ]);
    expect(result.value.nodes).toHaveLength(2);
  });

  it("descarta entrada cujo metrics existe mas está incompleto, sem inventar números", () => {
    const withHistory = {
      ...design,
      evaluations: [makeEvaluation({ metrics: { successRatio: 0.9 } as never })],
    };

    const result = importJson(JSON.stringify(withHistory));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.evaluations).toBeUndefined();
  });

  it("aplica o teto de 10 a um arquivo editado à mão com excesso de entradas", () => {
    const withHistory = {
      ...design,
      evaluations: Array.from({ length: 25 }, (_, index) =>
        makeEvaluation({ text: `Rodada ${index}` }),
      ),
    };

    const result = importJson(JSON.stringify(withHistory));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.evaluations).toHaveLength(10);
    expect(result.value.evaluations?.[0].text).toBe("Rodada 0");
  });

  it("importa um arquivo antigo, sem o campo, sem erro e sem histórico", () => {
    const result = importJson(exportJson(design));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.evaluations).toBeUndefined();
  });

  it("nunca falha a importação por causa do histórico, mesmo se ele não for uma lista", () => {
    const result = importJson(JSON.stringify({ ...design, evaluations: "corrompido" }));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.evaluations).toBeUndefined();
  });

  it("round-trip exportar e importar preserva o histórico", () => {
    const withHistory = {
      ...design,
      evaluations: [
        makeEvaluation({ text: "Recente", metrics: { successRatio: 0.99, e2eLatencyMs: 40, totalRps: 4_980 } }),
        makeEvaluation({ text: "Antiga", createdAt: "2026-07-20T09:00:00.000Z" }),
      ],
    };

    const result = importJson(exportJson(withHistory));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual(withHistory);
  });

  it("carregar do armazenamento aplica a mesma normalização da importação", () => {
    const storage = new MemoryStorage();
    const withHistory = {
      ...design,
      evaluations: [makeEvaluation({ text: "Válida" }), { text: "" }],
    };
    saveDesign(withHistory as Design, storage);

    const result = loadDesign(withHistory.id, storage);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.evaluations?.map((entry) => entry.text)).toEqual(["Válida"]);
  });
});
