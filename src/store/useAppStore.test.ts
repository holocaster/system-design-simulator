import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_AUTOSCALING, DEFAULT_PARAMS } from "../engine/catalog";
import { CHALLENGES } from "../evaluation/challenges";
import type { SimState } from "../engine/types";
import {
  AUTOSCALING_ERROR,
  AUTOSCALING_RANGE_ERROR,
  AUTOSCALING_TYPE_ERROR,
  START_SIM_ERROR,
  currentDesign,
  useAppStore,
} from "./useAppStore";

const initialState = useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(initialState, true);
});

function addNodeOfType(type: Parameters<typeof initialState.addNode>[0]) {
  useAppStore.getState().addNode(type, { x: 0, y: 0 });
  const nodes = useAppStore.getState().nodes;
  return nodes[nodes.length - 1];
}

describe("addNode", () => {
  it("cria nó com params default e id único", () => {
    const a = addNodeOfType("service");
    const b = addNodeOfType("service");
    expect(useAppStore.getState().nodes).toHaveLength(2);
    expect(a.id).not.toBe(b.id);
    expect(a.type).toBe("service");
    expect(a.data.params).toEqual(DEFAULT_PARAMS.service);
    expect(a.data.params).not.toBe(DEFAULT_PARAMS.service);
  });

  it("gera nomes auto-numerados por tipo", () => {
    const s1 = addNodeOfType("service");
    const s2 = addNodeOfType("service");
    const c1 = addNodeOfType("cache");
    expect(s1.data.name).toBe("Service 1");
    expect(s2.data.name).toBe("Service 2");
    expect(c1.data.name).toBe("Cache 1");
  });

  it("não repete nome após deleção de instância anterior", () => {
    addNodeOfType("service");
    const s2 = addNodeOfType("service");
    useAppStore.getState().removeNode(useAppStore.getState().nodes[0].id);
    const s3 = addNodeOfType("service");
    expect(s2.data.name).toBe("Service 2");
    expect(s3.data.name).toBe("Service 3");
  });
});

describe("renameNode", () => {
  it("aplica nome válido com trim", () => {
    const node = addNodeOfType("service");
    const error = useAppStore.getState().renameNode(node.id, "  Serviço de ingestão  ");
    expect(error).toBeNull();
    expect(useAppStore.getState().nodes[0].data.name).toBe("Serviço de ingestão");
  });

  it("rejeita nome vazio", () => {
    const node = addNodeOfType("service");
    const error = useAppStore.getState().renameNode(node.id, "   ");
    expect(error).toBe("Nome não pode ser vazio");
    expect(useAppStore.getState().nodes[0].data.name).toBe("Service 1");
  });

  it("rejeita nome com mais de 40 caracteres", () => {
    const node = addNodeOfType("service");
    const error = useAppStore.getState().renameNode(node.id, "a".repeat(41));
    expect(error).toBe("Nome deve ter no máximo 40 caracteres");
    expect(useAppStore.getState().nodes[0].data.name).toBe("Service 1");
  });

  it("auto-numeração continua a partir de nome renomeado com sufixo numérico", () => {
    const node = addNodeOfType("service");
    useAppStore.getState().renameNode(node.id, "Ingestão 7");
    const next = addNodeOfType("service");
    expect(next.data.name).toBe("Service 8");
  });
});

describe("updateParams (AC5)", () => {
  it("aplica valor dentro dos limites preservando o nome", () => {
    const node = addNodeOfType("service");
    const error = useAppStore.getState().updateParams(node.id, { capacity: 3000 });
    expect(error).toBeNull();
    expect(useAppStore.getState().nodes[0].data.params.capacity).toBe(3000);
    expect(useAppStore.getState().nodes[0].data.name).toBe("Service 1");
  });

  it("rejeita capacidade abaixo do mínimo com mensagem do limite", () => {
    const node = addNodeOfType("service");
    const error = useAppStore.getState().updateParams(node.id, { capacity: 0 });
    expect(error).toBe("Valor deve estar entre 1 e 1000000");
    expect(useAppStore.getState().nodes[0].data.params.capacity).toBe(DEFAULT_PARAMS.service.capacity);
  });

  it("rejeita capacidade acima do máximo", () => {
    const node = addNodeOfType("service");
    const error = useAppStore.getState().updateParams(node.id, { capacity: 2_000_000 });
    expect(error).toBe("Valor deve estar entre 1 e 1000000");
    expect(useAppStore.getState().nodes[0].data.params.capacity).toBe(DEFAULT_PARAMS.service.capacity);
  });

  it("rejeita errorRate acima de 1 e hitRatio negativo", () => {
    const service = addNodeOfType("service");
    const cache = addNodeOfType("cache");
    expect(useAppStore.getState().updateParams(service.id, { errorRate: 1.5 })).toBe(
      "Valor deve estar entre 0 e 1"
    );
    expect(useAppStore.getState().updateParams(cache.id, { hitRatio: -0.1 })).toBe(
      "Valor deve estar entre 0 e 1"
    );
    expect(useAppStore.getState().nodes[0].data.params.errorRate).toBe(0);
    expect(useAppStore.getState().nodes[1].data.params.hitRatio).toBe(0.8);
  });

  it("rejeita NaN", () => {
    const node = addNodeOfType("service");
    const error = useAppStore.getState().updateParams(node.id, { capacity: Number.NaN });
    expect(error).toBe("Valor deve estar entre 1 e 1000000");
  });

  it("rejeita réplicas e shards fracionários sem alterar os parâmetros", () => {
    const service = addNodeOfType("service");
    const nosql = addNodeOfType("nosql");
    expect(useAppStore.getState().updateParams(service.id, { replicas: 2.5 })).toBe(
      "Valor deve ser um número inteiro"
    );
    expect(useAppStore.getState().updateParams(nosql.id, { shards: 3.5 })).toBe(
      "Valor deve ser um número inteiro"
    );
    expect(useAppStore.getState().nodes[0].data.params.replicas).toBe(1);
    expect(useAppStore.getState().nodes[1].data.params.shards).toBe(1);
  });

  it("aceita réplicas e shards inteiros dentro dos limites", () => {
    const service = addNodeOfType("service");
    const nosql = addNodeOfType("nosql");
    expect(useAppStore.getState().updateParams(service.id, { replicas: 5 })).toBeNull();
    expect(useAppStore.getState().updateParams(nosql.id, { shards: 4 })).toBeNull();
    expect(useAppStore.getState().nodes[0].data.params.replicas).toBe(5);
    expect(useAppStore.getState().nodes[1].data.params.shards).toBe(4);
  });
});

describe("autoscaling nos parâmetros (AD-029, AD-031, AD-054)", () => {
  it("não vem configurado em componente novo", () => {
    const node = addNodeOfType("service");
    expect(node.data.params.autoscaling).toBeUndefined();
  });

  it("liga com os defaults e desliga removendo o campo", () => {
    const node = addNodeOfType("service");
    expect(
      useAppStore.getState().updateParams(node.id, { autoscaling: { ...DEFAULT_AUTOSCALING } })
    ).toBeNull();
    expect(useAppStore.getState().nodes[0].data.params.autoscaling).toEqual({
      minReplicas: 1,
      maxReplicas: 10,
      targetUtilization: 0.6,
    });

    expect(useAppStore.getState().updateParams(node.id, { autoscaling: undefined })).toBeNull();
    expect("autoscaling" in useAppStore.getState().nodes[0].data.params).toBe(false);
  });

  it("rejeita autoscaling em tipos que não escalam por réplica (AD-054)", () => {
    const client = addNodeOfType("client");
    expect(
      useAppStore.getState().updateParams(client.id, { autoscaling: { ...DEFAULT_AUTOSCALING } })
    ).toBe(AUTOSCALING_TYPE_ERROR);
    expect(useAppStore.getState().nodes[0].data.params.autoscaling).toBeUndefined();
  });

  it("permite configurar autoscaling nos tipos replicáveis (service, worker, cache, sql, nosql)", () => {
    for (const type of ["service", "worker", "cache", "sql", "nosql"] as const) {
      const node = addNodeOfType(type);
      expect(
        useAppStore.getState().updateParams(node.id, { autoscaling: { ...DEFAULT_AUTOSCALING } })
      ).toBeNull();
    }
  });

  it("mantém as réplicas iniciais ao ligar autoscaling", () => {
    const node = addNodeOfType("service");
    useAppStore.getState().updateParams(node.id, { replicas: 4 });
    useAppStore.getState().updateParams(node.id, { autoscaling: { ...DEFAULT_AUTOSCALING } });
    expect(useAppStore.getState().nodes[0].data.params.replicas).toBe(4);
  });

  it("rejeita piso maior que o teto", () => {
    const node = addNodeOfType("service");
    expect(
      useAppStore.getState().updateParams(node.id, {
        autoscaling: { ...DEFAULT_AUTOSCALING, minReplicas: 5, maxReplicas: 3 },
      })
    ).toBe(AUTOSCALING_RANGE_ERROR);
    expect(useAppStore.getState().nodes[0].data.params.autoscaling).toBeUndefined();
  });

  it("rejeita campos fora de faixa, fracionários ou ausentes", () => {
    const node = addNodeOfType("service");
    const invalid = [
      { ...DEFAULT_AUTOSCALING, minReplicas: 0 },
      { ...DEFAULT_AUTOSCALING, maxReplicas: 21 },
      { ...DEFAULT_AUTOSCALING, maxReplicas: 2.5 },
      { ...DEFAULT_AUTOSCALING, targetUtilization: 0.05 },
      { ...DEFAULT_AUTOSCALING, targetUtilization: 1.5 },
      { minReplicas: 1, maxReplicas: 10 },
    ];
    for (const autoscaling of invalid) {
      expect(
        useAppStore.getState().updateParams(node.id, {
          autoscaling: autoscaling as typeof DEFAULT_AUTOSCALING,
        })
      ).toBe(AUTOSCALING_ERROR);
    }
    expect(useAppStore.getState().nodes[0].data.params.autoscaling).toBeUndefined();
  });

  it("leva a configuração para o design corrente", () => {
    const node = addNodeOfType("service");
    useAppStore.getState().updateParams(node.id, {
      autoscaling: { minReplicas: 2, maxReplicas: 8, targetUtilization: 0.8 },
    });
    expect(currentDesign().nodes[0].params.autoscaling).toEqual({
      minReplicas: 2,
      maxReplicas: 8,
      targetUtilization: 0.8,
    });
  });
});

describe("startSim (AC7)", () => {
  it("retorna erro sem nó Cliente", () => {
    addNodeOfType("service");
    const error = useAppStore.getState().startSim();
    expect(error).toBe(START_SIM_ERROR);
    expect(useAppStore.getState().running).toBe(false);
  });

  it("retorna erro com Cliente sem conexão", () => {
    addNodeOfType("client");
    const error = useAppStore.getState().startSim();
    expect(error).toBe(START_SIM_ERROR);
    expect(useAppStore.getState().running).toBe(false);
  });

  it("inicia com Cliente conectado", () => {
    const client = addNodeOfType("client");
    const service = addNodeOfType("service");
    useAppStore.getState().setEdges([{ id: "e1", source: client.id, target: service.id }]);
    const error = useAppStore.getState().startSim();
    expect(error).toBeNull();
    expect(useAppStore.getState().running).toBe(true);
  });
});

describe("stopSim (AC6)", () => {
  it("para e zera as métricas", () => {
    const client = addNodeOfType("client");
    const service = addNodeOfType("service");
    useAppStore.getState().setEdges([{ id: "e1", source: client.id, target: service.id }]);
    useAppStore.getState().startSim();
    const sim: SimState = {
      perNode: {},
      global: { successRatio: 0.9, e2eLatencyMs: 25, totalRps: 100 },
    };
    useAppStore.getState().applyTick(sim);
    expect(useAppStore.getState().simState).toBe(sim);
    useAppStore.getState().stopSim();
    expect(useAppStore.getState().running).toBe(false);
    expect(useAppStore.getState().simState).toBeNull();
  });
});

describe("removeNode (AC6 do P1)", () => {
  it("remove o nó e todas as suas conexões, mantendo as demais", () => {
    const client = addNodeOfType("client");
    const lb = addNodeOfType("loadbalancer");
    const service = addNodeOfType("service");
    useAppStore.getState().setEdges([
      { id: "e1", source: client.id, target: lb.id },
      { id: "e2", source: lb.id, target: service.id },
      { id: "e3", source: client.id, target: service.id },
    ]);
    useAppStore.getState().removeNode(lb.id);
    const state = useAppStore.getState();
    expect(state.nodes.map((n) => n.id)).toEqual([client.id, service.id]);
    expect(state.edges).toHaveLength(1);
    expect(state.edges[0].id).toBe("e3");
  });
});

describe("setRps", () => {
  it("aplica valor no intervalo e limita fora dele", () => {
    useAppStore.getState().setRps(500);
    expect(useAppStore.getState().rps).toBe(500);
    useAppStore.getState().setRps(0);
    expect(useAppStore.getState().rps).toBe(1);
    useAppStore.getState().setRps(200_000);
    expect(useAppStore.getState().rps).toBe(100_000);
  });
});

describe("setWritePercent", () => {
  it("inicia em 20 e limita o percentual ao intervalo de 0 a 100", () => {
    expect(useAppStore.getState().writePercent).toBe(20);
    useAppStore.getState().setWritePercent(35);
    expect(useAppStore.getState().writePercent).toBe(35);
    useAppStore.getState().setWritePercent(-1);
    expect(useAppStore.getState().writePercent).toBe(0);
    useAppStore.getState().setWritePercent(101);
    expect(useAppStore.getState().writePercent).toBe(100);
  });
});

describe("setBrief", () => {
  it("inicia vazio e altera o estado", () => {
    expect(useAppStore.getState().brief).toBe("");
    useAppStore.getState().setBrief("Sistema de encurtador de URLs");
    expect(useAppStore.getState().brief).toBe("Sistema de encurtador de URLs");
  });
});

describe("setChallengeId", () => {
  it("inicia com o primeiro preset e altera o estado", () => {
    expect(useAppStore.getState().challengeId).toBe(CHALLENGES[0].id);
    useAppStore.getState().setChallengeId("news-feed");
    expect(useAppStore.getState().challengeId).toBe("news-feed");
  });
});

describe("currentDesign", () => {
  it("mantém a identidade criada antes do primeiro salvamento", () => {
    const initialId = useAppStore.getState().designId;
    expect(initialId).not.toBe("");
    expect(currentDesign()).toMatchObject({ schema: 1, id: initialId, name: undefined });
    addNodeOfType("service");
    expect(currentDesign().id).toBe(initialId);
  });

  it("inclui brief e challengeId do estado atual", () => {
    useAppStore.getState().setBrief("Descrição do desafio");
    useAppStore.getState().setChallengeId("news-feed");
    const design = currentDesign();
    expect(design.brief).toBe("Descrição do desafio");
    expect(design.challengeId).toBe("news-feed");
  });

  it("inclui a tecnologia escolhida em cada nó", () => {
    const queue = addNodeOfType("queue");
    useAppStore.getState().applyTech(queue.id, "kafka");
    expect(currentDesign().nodes[0].tech).toBe("kafka");
  });

  it("inclui o histórico de avaliações do estado atual", () => {
    useAppStore.getState().addEvaluation("Crítica do design.", "openai/gpt-5.2", {
      successRatio: 0.9,
      e2eLatencyMs: 25,
      totalRps: 100,
    });
    expect(currentDesign().evaluations).toEqual(useAppStore.getState().evaluations);
    expect(currentDesign().evaluations).toHaveLength(1);
  });
});

describe("alterações do design", () => {
  it("ignora controles temporários e detecta mudanças persistíveis", () => {
    const state = useAppStore.getState();
    expect(state.hasUnsavedChanges()).toBe(false);
    state.setRps(5_000);
    state.setWritePercent(70);
    expect(state.hasUnsavedChanges()).toBe(false);
    addNodeOfType("service");
    expect(useAppStore.getState().hasUnsavedChanges()).toBe(true);
    useAppStore.getState().markSaved();
    expect(useAppStore.getState().hasUnsavedChanges()).toBe(false);
  });

  it("cria outra identidade e restaura os defaults", () => {
    const originalId = useAppStore.getState().designId;
    addNodeOfType("service");
    useAppStore.getState().setBrief("brief");
    useAppStore.getState().setRps(9_000);
    useAppStore.getState().setWritePercent(90);
    useAppStore.getState().createNewDesign();

    const state = useAppStore.getState();
    expect(state.designId).not.toBe(originalId);
    expect(state.nodes).toEqual([]);
    expect(state.brief).toBe("");
    expect(state.evaluations).toEqual([]);
    expect(state.rps).toBe(100);
    expect(state.writePercent).toBe(20);
    expect(state.hasUnsavedChanges()).toBe(false);
  });

  it("mantém a entidade aberta e a marca como não salva após excluir sua cópia", () => {
    const state = useAppStore.getState();
    state.setDesignName("Persistido");
    state.markSaved();
    const id = state.designId;
    addNodeOfType("service");
    state.markUnpersisted();
    expect(useAppStore.getState().designId).toBe(id);
    expect(useAppStore.getState().designName).toBe("Persistido");
    expect(useAppStore.getState().nodes).toHaveLength(1);
    expect(useAppStore.getState().hasUnsavedChanges()).toBe(true);
  });
});

describe("addEvaluation (AD-020, AD-021)", () => {
  it("anexa a entrada no topo do histórico", () => {
    useAppStore.getState().addEvaluation("Primeira crítica.", "openai/gpt-5.2");
    useAppStore.getState().addEvaluation("Segunda crítica.", "openai/gpt-5.2");
    const evaluations = useAppStore.getState().evaluations;
    expect(evaluations).toHaveLength(2);
    expect(evaluations[0].text).toBe("Segunda crítica.");
    expect(evaluations[1].text).toBe("Primeira crítica.");
  });

  it("registra carga e modelo usados na rodada", () => {
    useAppStore.getState().setRps(1_500);
    useAppStore.getState().setWritePercent(35);
    useAppStore.getState().addEvaluation("Crítica.", "anthropic/claude-4");
    const entry = useAppStore.getState().evaluations[0];
    expect(entry.rps).toBe(1_500);
    expect(entry.writePercent).toBe(35);
    expect(entry.model).toBe("anthropic/claude-4");
    expect(typeof entry.createdAt).toBe("string");
  });

  it("grava a entrada sem métricas quando a avaliação ocorre sem simulação, nunca com zeros", () => {
    useAppStore.getState().addEvaluation("Crítica sem simulação.", "openai/gpt-5.2");
    const entry = useAppStore.getState().evaluations[0];
    expect(entry.metrics).toBeUndefined();
  });

  it("grava as métricas quando a avaliação ocorre com simulação", () => {
    useAppStore.getState().addEvaluation("Crítica com simulação.", "openai/gpt-5.2", {
      successRatio: 0.62,
      e2eLatencyMs: 40,
      totalRps: 5_000,
    });
    expect(useAppStore.getState().evaluations[0].metrics).toEqual({
      successRatio: 0.62,
      e2eLatencyMs: 40,
      totalRps: 5_000,
    });
  });

  it("aplica o teto de dez descartando a mais antiga", () => {
    for (let i = 1; i <= 11; i += 1) {
      useAppStore.getState().addEvaluation(`Crítica ${i}.`, "openai/gpt-5.2");
    }
    const evaluations = useAppStore.getState().evaluations;
    expect(evaluations).toHaveLength(10);
    expect(evaluations[0].text).toBe("Crítica 11.");
    expect(evaluations[9].text).toBe("Crítica 2.");
    expect(evaluations.some((entry) => entry.text === "Crítica 1.")).toBe(false);
  });
});

describe("applyTech", () => {
  it("semeia capacity e latência do preset e registra a tecnologia", () => {
    const queue = addNodeOfType("queue");
    useAppStore.getState().applyTech(queue.id, "kafka");
    const node = useAppStore.getState().nodes[0];
    expect(node.data.tech).toBe("kafka");
    expect(node.data.params.capacity).toBe(200_000);
    expect(node.data.params.baseLatencyMs).toBe(5);
  });

  it("preserva os demais params ao aplicar a tecnologia", () => {
    const queue = addNodeOfType("queue");
    useAppStore.getState().updateParams(queue.id, { bufferSize: 500 });
    useAppStore.getState().applyTech(queue.id, "kafka");
    expect(useAppStore.getState().nodes[0].data.params.bufferSize).toBe(500);
  });

  it("aplicar Personalizado (undefined) limpa a tecnologia sem tocar nos números", () => {
    const queue = addNodeOfType("queue");
    useAppStore.getState().applyTech(queue.id, "kafka");
    useAppStore.getState().applyTech(queue.id, undefined);
    const node = useAppStore.getState().nodes[0];
    expect(node.data.tech).toBeUndefined();
    expect(node.data.params.capacity).toBe(200_000);
  });

  it("ignora tecnologia desconhecida", () => {
    const queue = addNodeOfType("queue");
    const before = useAppStore.getState().nodes[0].data.params.capacity;
    useAppStore.getState().applyTech(queue.id, "inexistente");
    const node = useAppStore.getState().nodes[0];
    expect(node.data.tech).toBeUndefined();
    expect(node.data.params.capacity).toBe(before);
  });

  it("funciona para tipos não-queue: sql aplica Aurora", () => {
    const sql = addNodeOfType("sql");
    useAppStore.getState().applyTech(sql.id, "aurora");
    const node = useAppStore.getState().nodes[0];
    expect(node.data.tech).toBe("aurora");
    expect(node.data.params.capacity).toBe(5_000);
    expect(node.data.params.baseLatencyMs).toBe(8);
  });

  it("rejeita preset de outro tipo: kafka não se aplica a um service", () => {
    const service = addNodeOfType("service");
    useAppStore.getState().applyTech(service.id, "kafka");
    expect(useAppStore.getState().nodes[0].data.tech).toBeUndefined();
  });
});

describe("updateParams e tecnologia", () => {
  it("editar capacity zera a tecnologia para Personalizado", () => {
    const queue = addNodeOfType("queue");
    useAppStore.getState().applyTech(queue.id, "kafka");
    useAppStore.getState().updateParams(queue.id, { capacity: 50_000 });
    expect(useAppStore.getState().nodes[0].data.tech).toBeUndefined();
  });

  it("editar baseLatencyMs zera a tecnologia para Personalizado", () => {
    const queue = addNodeOfType("queue");
    useAppStore.getState().applyTech(queue.id, "kafka");
    useAppStore.getState().updateParams(queue.id, { baseLatencyMs: 40 });
    expect(useAppStore.getState().nodes[0].data.tech).toBeUndefined();
  });

  it("editar bufferSize preserva a tecnologia", () => {
    const queue = addNodeOfType("queue");
    useAppStore.getState().applyTech(queue.id, "kafka");
    useAppStore.getState().updateParams(queue.id, { bufferSize: 999 });
    expect(useAppStore.getState().nodes[0].data.tech).toBe("kafka");
  });
});

describe("loadDesign", () => {
  it("substitui nodes e edges e reseta a simulação", () => {
    addNodeOfType("service");
    useAppStore.getState().startSim();
    useAppStore.getState().loadDesign({
      schema: 1,
      id: "loaded-1",
      nodes: [
        {
          id: "c1",
          type: "client",
          position: { x: 5, y: 6 },
          params: { ...DEFAULT_PARAMS.client },
        },
        {
          id: "s1",
          type: "sql",
          name: "Banco principal",
          position: { x: 50, y: 60 },
          params: { capacity: 500, baseLatencyMs: 10, errorRate: 0.01 },
        },
      ],
      edges: [{ id: "e1", source: "c1", target: "s1" }],
    });
    const state = useAppStore.getState();
    expect(state.nodes.map((n) => n.id)).toEqual(["c1", "s1"]);
    expect(state.nodes[1].data.params.errorRate).toBe(0.01);
    expect(state.edges).toEqual([{ id: "e1", source: "c1", target: "s1" }]);
    expect(state.running).toBe(false);
    expect(state.simState).toBeNull();
  });

  it("preserva carga e escritas ao trocar a entidade", () => {
    useAppStore.getState().setRps(8_000);
    useAppStore.getState().setWritePercent(65);
    useAppStore.getState().loadDesign({ id: "other", name: "Outro", schema: 1, nodes: [], edges: [] });
    expect(useAppStore.getState().rps).toBe(8_000);
    expect(useAppStore.getState().writePercent).toBe(65);
    expect(useAppStore.getState().designName).toBe("Outro");
  });

  it("abre importação como revisão não salva preservando a identidade", () => {
    useAppStore.getState().importDesign({ id: "importado", name: "Backup", schema: 1, nodes: [], edges: [] });
    expect(useAppStore.getState().designId).toBe("importado");
    expect(useAppStore.getState().designName).toBe("Backup");
    expect(useAppStore.getState().hasUnsavedChanges()).toBe(true);
  });

  it("mantém nome persistido e gera fallback auto-numerado quando ausente", () => {
    useAppStore.getState().loadDesign({
      schema: 1,
      id: "loaded-2",
      nodes: [
        {
          id: "s1",
          type: "service",
          name: "Ingestão",
          position: { x: 0, y: 0 },
          params: { ...DEFAULT_PARAMS.service },
        },
        {
          id: "s2",
          type: "service",
          position: { x: 10, y: 0 },
          params: { ...DEFAULT_PARAMS.service },
        },
        {
          id: "s3",
          type: "service",
          position: { x: 20, y: 0 },
          params: { ...DEFAULT_PARAMS.service },
        },
      ],
      edges: [],
    });
    const names = useAppStore.getState().nodes.map((n) => n.data.name);
    expect(names).toEqual(["Ingestão", "Service 1", "Service 2"]);
  });

  it("restaura brief e challengeId quando presentes", () => {
    useAppStore.getState().loadDesign({
      schema: 1,
      id: "loaded-3",
      brief: "Encurtar URLs com alta disponibilidade",
      challengeId: "news-feed",
      nodes: [],
      edges: [],
    });
    const state = useAppStore.getState();
    expect(state.brief).toBe("Encurtar URLs com alta disponibilidade");
    expect(state.challengeId).toBe("news-feed");
  });

  it("usa brief vazio e primeiro preset quando design legado não traz os campos", () => {
    useAppStore.getState().setBrief("valor anterior");
    useAppStore.getState().setChallengeId("news-feed");
    useAppStore.getState().loadDesign({
      schema: 1,
      id: "loaded-4",
      nodes: [],
      edges: [],
    });
    const state = useAppStore.getState();
    expect(state.brief).toBe("");
    expect(state.challengeId).toBe(CHALLENGES[0].id);
  });

  it("preserva challengeId desconhecido sem normalizar contra CHALLENGES", () => {
    useAppStore.getState().loadDesign({
      schema: 1,
      id: "loaded-5",
      challengeId: "id-desconhecido",
      nodes: [],
      edges: [],
    });
    expect(useAppStore.getState().challengeId).toBe("id-desconhecido");
  });

  it("re-semeia capacity/latência da tecnologia conhecida, ignorando os números do arquivo", () => {
    useAppStore.getState().loadDesign({
      schema: 1,
      id: "loaded-6",
      nodes: [
        {
          id: "q1",
          type: "queue",
          tech: "kafka",
          position: { x: 0, y: 0 },
          params: { capacity: 300, baseLatencyMs: 99, errorRate: 0, bufferSize: 7 },
        },
      ],
      edges: [],
    });
    const node = useAppStore.getState().nodes[0];
    expect(node.data.tech).toBe("kafka");
    expect(node.data.params.capacity).toBe(200_000);
    expect(node.data.params.baseLatencyMs).toBe(5);
    expect(node.data.params.bufferSize).toBe(7);
  });

  it("rebaixa tecnologia desconhecida para Personalizado preservando os números do arquivo", () => {
    useAppStore.getState().loadDesign({
      schema: 1,
      id: "loaded-7",
      nodes: [
        {
          id: "q1",
          type: "queue",
          tech: "foobar",
          position: { x: 0, y: 0 },
          params: { capacity: 9_000, baseLatencyMs: 7, errorRate: 0 },
        },
      ],
      edges: [],
    });
    const node = useAppStore.getState().nodes[0];
    expect(node.data.tech).toBeUndefined();
    expect(node.data.params.capacity).toBe(9_000);
  });

  it("substitui o histórico em memória pelo do arquivo", () => {
    useAppStore.getState().addEvaluation("Crítica anterior em memória.", "openai/gpt-5.2");
    useAppStore.getState().loadDesign({
      schema: 1,
      id: "loaded-8",
      nodes: [],
      edges: [],
      evaluations: [
        {
          text: "Crítica do arquivo.",
          createdAt: "2026-07-20T10:00:00.000Z",
          rps: 200,
          writePercent: 10,
          model: "openai/gpt-5.2",
        },
      ],
    });
    const evaluations = useAppStore.getState().evaluations;
    expect(evaluations).toHaveLength(1);
    expect(evaluations[0].text).toBe("Crítica do arquivo.");
  });

  it("resulta em histórico vazio quando o design não traz o campo, nunca em erro", () => {
    useAppStore.getState().addEvaluation("Crítica anterior.", "openai/gpt-5.2");
    useAppStore.getState().loadDesign({
      schema: 1,
      id: "loaded-9",
      nodes: [],
      edges: [],
    });
    expect(useAppStore.getState().evaluations).toEqual([]);
  });

  it("carrega design antigo sem tecnologia como Personalizado", () => {
    useAppStore.getState().loadDesign({
      schema: 1,
      id: "loaded-10",
      nodes: [
        {
          id: "q1",
          type: "queue",
          position: { x: 0, y: 0 },
          params: { ...DEFAULT_PARAMS.queue },
        },
      ],
      edges: [],
    });
    expect(useAppStore.getState().nodes[0].data.tech).toBeUndefined();
  });
});
