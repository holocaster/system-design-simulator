import { describe, expect, it } from "vitest";
import {
  COMPONENT_CATEGORIES,
  COMPONENT_META,
  COMPONENT_TYPES,
  DEFAULT_PARAMS,
  PARAM_LIMITS,
  REPLICABLE_TYPES,
  canConnect,
  findTechPreset,
  seedTechParams,
  techPresetsFor,
} from "./catalog";
import type { ComponentType } from "./types";

describe("catálogo de componentes", () => {
  it("tem exatamente os 11 tipos", () => {
    expect(COMPONENT_TYPES).toEqual([
      "client",
      "cdn",
      "loadbalancer",
      "gateway",
      "service",
      "cache",
      "sql",
      "nosql",
      "queue",
      "worker",
      "storage",
    ]);
  });

  it("defaults exatos do design por tipo", () => {
    expect(DEFAULT_PARAMS.client).toEqual({ capacity: 1_000_000, baseLatencyMs: 0, errorRate: 0 });
    expect(DEFAULT_PARAMS.cdn).toEqual({ capacity: 100_000, baseLatencyMs: 10, errorRate: 0, hitRatio: 0.9 });
    expect(DEFAULT_PARAMS.loadbalancer).toEqual({ capacity: 50_000, baseLatencyMs: 2, errorRate: 0 });
    expect(DEFAULT_PARAMS.gateway).toEqual({ capacity: 20_000, baseLatencyMs: 5, errorRate: 0 });
    expect(DEFAULT_PARAMS.service).toEqual({ capacity: 500, baseLatencyMs: 20, errorRate: 0, replicas: 1 });
    expect(DEFAULT_PARAMS.cache).toEqual({ capacity: 50_000, baseLatencyMs: 1, errorRate: 0, hitRatio: 0.8, replicas: 1 });
    expect(DEFAULT_PARAMS.sql).toEqual({ capacity: 1_500, baseLatencyMs: 10, errorRate: 0, replicas: 1 });
    expect(DEFAULT_PARAMS.nosql).toEqual({ capacity: 10_000, baseLatencyMs: 5, errorRate: 0, replicas: 1, shards: 1 });
    expect(DEFAULT_PARAMS.queue).toEqual({ capacity: 10_000, baseLatencyMs: 1, errorRate: 0, bufferSize: 100_000 });
    expect(DEFAULT_PARAMS.worker).toEqual({ capacity: 500, baseLatencyMs: 20, errorRate: 0, replicas: 1 });
    expect(DEFAULT_PARAMS.storage).toEqual({ capacity: 5_000, baseLatencyMs: 30, errorRate: 0 });
  });

  it("limites de parâmetros do design", () => {
    expect(PARAM_LIMITS.capacity).toEqual({ min: 1, max: 1_000_000 });
    expect(PARAM_LIMITS.baseLatencyMs).toEqual({ min: 0, max: 10_000 });
    expect(PARAM_LIMITS.errorRate).toEqual({ min: 0, max: 1 });
    expect(PARAM_LIMITS.hitRatio).toEqual({ min: 0, max: 1 });
    expect(PARAM_LIMITS.bufferSize).toEqual({ min: 1, max: 1_000_000 });
    expect(PARAM_LIMITS.replicas).toEqual({ min: 1, max: 20 });
    expect(PARAM_LIMITS.shards).toEqual({ min: 1, max: 20 });
  });

  it("tipos replicáveis são service, worker, cache, sql e nosql", () => {
    expect(REPLICABLE_TYPES).toEqual(["service", "worker", "cache", "sql", "nosql"]);
  });
});

describe("taxonomia da paleta (COMPONENT_META.category)", () => {
  it("agrupa fila e worker como componentes assíncronos", () => {
    expect(COMPONENT_META.queue.category).toBe("Assíncrono");
    expect(COMPONENT_META.worker.category).toBe("Assíncrono");
  });

  it("todo tipo em COMPONENT_TYPES pertence a exatamente uma categoria declarada", () => {
    for (const type of COMPONENT_TYPES) {
      expect(COMPONENT_CATEGORIES, `${type} tem categoria fora de COMPONENT_CATEGORIES`).toContain(
        COMPONENT_META[type].category,
      );
    }
  });

  it("toda categoria declarada contém ao menos um tipo", () => {
    for (const category of COMPONENT_CATEGORIES) {
      const typesInCategory = COMPONENT_TYPES.filter((type) => COMPONENT_META[type].category === category);
      expect(typesInCategory.length, `categoria "${category}" está vazia`).toBeGreaterThan(0);
    }
  });
});

describe("presets de tecnologia", () => {
  it("queue oferece SQS FIFO, SQS Standard, RabbitMQ e Kafka com capacity e latência exatos", () => {
    expect(techPresetsFor("queue")).toEqual([
      { id: "sqs-fifo", label: "SQS FIFO", capacity: 3_000, baseLatencyMs: 30 },
      { id: "sqs-standard", label: "SQS Standard", capacity: 30_000, baseLatencyMs: 20 },
      { id: "rabbitmq", label: "RabbitMQ", capacity: 40_000, baseLatencyMs: 5 },
      { id: "kafka", label: "Kafka", capacity: 200_000, baseLatencyMs: 5 },
    ]);
  });

  it("nosql, sql, service e worker oferecem seus presets", () => {
    expect(techPresetsFor("nosql").map((p) => p.id)).toEqual(["dynamodb", "mongodb", "cassandra"]);
    expect(techPresetsFor("sql").map((p) => p.id)).toEqual(["postgresql", "mysql", "aurora"]);
    const compute = ["spring-mvc", "dotnet", "quarkus-native", "quarkus-jvm", "nodejs", "spring-webflux", "go"];
    expect(techPresetsFor("service").map((p) => p.id)).toEqual(compute);
    expect(techPresetsFor("worker").map((p) => p.id)).toEqual(compute);
  });

  it("service e worker compartilham a mesma lista de compute", () => {
    expect(techPresetsFor("worker")).toEqual(techPresetsFor("service"));
  });

  it("capacity e latência exatos de alguns presets representativos", () => {
    expect(findTechPreset("nosql", "cassandra")).toMatchObject({ capacity: 30_000, baseLatencyMs: 5 });
    expect(findTechPreset("sql", "aurora")).toMatchObject({ capacity: 5_000, baseLatencyMs: 8 });
    expect(findTechPreset("service", "go")).toMatchObject({ capacity: 3_000, baseLatencyMs: 10 });
    expect(findTechPreset("service", "dotnet")).toMatchObject({ capacity: 500, baseLatencyMs: 20 });
    expect(findTechPreset("service", "quarkus-jvm")).toMatchObject({ capacity: 650, baseLatencyMs: 17 });
    expect(findTechPreset("service", "quarkus-native")).toMatchObject({ capacity: 520, baseLatencyMs: 19 });
  });

  it("tipos sem seletor não têm presets", () => {
    expect(techPresetsFor("cache")).toEqual([]);
    expect(techPresetsFor("gateway")).toEqual([]);
    expect(techPresetsFor("storage")).toEqual([]);
  });

  it("findTechPreset localiza por id e ignora id desconhecido", () => {
    expect(findTechPreset("queue", "kafka")?.capacity).toBe(200_000);
    expect(findTechPreset("queue", "inexistente")).toBeUndefined();
  });

  it("seedTechParams semeia capacity/latência de tech conhecida e preserva os demais params", () => {
    const result = seedTechParams("queue", "kafka", {
      capacity: 10_000,
      baseLatencyMs: 1,
      errorRate: 0.1,
      bufferSize: 500,
    });
    expect(result).toEqual({
      tech: "kafka",
      params: { capacity: 200_000, baseLatencyMs: 5, errorRate: 0.1, bufferSize: 500 },
    });
  });

  it("seedTechParams rebaixa tech desconhecida ou ausente para Personalizado preservando números", () => {
    const params = { capacity: 9_000, baseLatencyMs: 7, errorRate: 0 };
    expect(seedTechParams("queue", "foobar", params)).toEqual({ tech: undefined, params });
    expect(seedTechParams("queue", undefined, params)).toEqual({ tech: undefined, params });
  });
});

describe("matriz de conexões canConnect", () => {
  const validPairs: [ComponentType, ComponentType][] = [
    ["client", "cdn"],
    ["client", "loadbalancer"],
    ["client", "gateway"],
    ["client", "service"],
    ["cdn", "loadbalancer"],
    ["cdn", "gateway"],
    ["cdn", "service"],
    ["loadbalancer", "gateway"],
    ["loadbalancer", "service"],
    ["gateway", "loadbalancer"],
    ["gateway", "service"],
    ["service", "service"],
    ["service", "cache"],
    ["service", "sql"],
    ["service", "nosql"],
    ["service", "queue"],
    ["service", "storage"],
    ["cache", "sql"],
    ["cache", "nosql"],
    ["cache", "storage"],
    ["queue", "worker"],
    ["worker", "service"],
    ["worker", "cache"],
    ["worker", "sql"],
    ["worker", "nosql"],
    ["worker", "queue"],
    ["worker", "storage"],
  ];

  it("cobre toda a matriz: válidos aceitos e todos os demais rejeitados", () => {
    const validSet = new Set(validPairs.map(([s, t]) => `${s}->${t}`));
    for (const source of COMPONENT_TYPES) {
      for (const target of COMPONENT_TYPES) {
        expect(canConnect(source, target), `${source}->${target}`).toBe(
          validSet.has(`${source}->${target}`),
        );
      }
    }
  });

  it("Service conecta direto a SQL, NoSQL e S3", () => {
    expect(canConnect("service", "sql")).toBe(true);
    expect(canConnect("service", "nosql")).toBe(true);
    expect(canConnect("service", "storage")).toBe(true);
  });

  it("Cliente não aceita entrada de nenhum tipo", () => {
    for (const source of COMPONENT_TYPES) {
      expect(canConnect(source, "client")).toBe(false);
    }
  });

  it("worker só recebe entrada de fila", () => {
    for (const source of COMPONENT_TYPES) {
      expect(canConnect(source, "worker"), `${source}->worker`).toBe(source === "queue");
    }
  });

  it("fila só conecta a worker", () => {
    for (const target of COMPONENT_TYPES) {
      expect(canConnect("queue", target), `queue->${target}`).toBe(target === "worker");
    }
  });

  it("sinks SQL, NoSQL e S3 não tem saída", () => {
    for (const sink of ["sql", "nosql", "storage"] as ComponentType[]) {
      for (const target of COMPONENT_TYPES) {
        expect(canConnect(sink, target)).toBe(false);
      }
    }
  });
});
