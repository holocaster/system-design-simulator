import { describe, expect, it } from "vitest";
import { DEFAULT_AUTOSCALING, DEFAULT_PARAMS } from "./catalog";
import { runTick } from "./tick";
import type { ComponentParams, ComponentType, Design, SimState } from "./types";

function tick(design: Design, rps: number, prev?: SimState): SimState {
  return runTick(design, { rps, writeRatio: 0 }, prev);
}

function makeDesign(
  nodes: [string, ComponentType, Partial<ComponentParams>?][],
  edges: [string, string][]
): Design {
  return {
    schema: 1,
    id: "test-design",
    nodes: nodes.map(([id, type, params]) => ({
      id,
      type,
      position: { x: 0, y: 0 },
      params: { ...DEFAULT_PARAMS[type], ...params },
    })),
    edges: edges.map(([source, target]) => ({ id: `${source}-${target}`, source, target })),
  };
}

function runTicks(design: Design, rps: number, ticks: number, prev?: ReturnType<typeof runTick>) {
  let state = prev;
  for (let i = 0; i < ticks; i++) state = tick(design, rps, state);
  return state!;
}

describe("forward pass", () => {
  it("propaga o exemplo da spec: 1000 RPS -> LB -> 2 Services -> Cache 80% -> SQL 200 RPS", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["lb", "loadbalancer"],
        ["s1", "service"],
        ["s2", "service"],
        ["cache", "cache", { hitRatio: 0.8 }],
        ["db", "sql"],
      ],
      [
        ["c", "lb"],
        ["lb", "s1"],
        ["lb", "s2"],
        ["s1", "cache"],
        ["s2", "cache"],
        ["cache", "db"],
      ]
    );
    const state = tick(design, 1000);
    expect(state.perNode["lb"].incomingRps).toBeCloseTo(1000);
    expect(state.perNode["s1"].incomingRps).toBeCloseTo(500);
    expect(state.perNode["s2"].incomingRps).toBeCloseTo(500);
    expect(state.perNode["cache"].incomingRps).toBeCloseTo(1000);
    expect(state.perNode["db"].incomingRps).toBeCloseTo(200);
  });

  it("aplica taxa de erro base sem sobrecarga: 1% de 200 RPS = 2 RPS de falha", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service"],
        ["db", "sql", { errorRate: 0.01 }],
      ],
      [
        ["c", "s"],
        ["s", "db"],
      ]
    );
    const state = tick(design, 200);
    expect(state.perNode["db"].incomingRps).toBeCloseTo(200);
    expect(state.perNode["db"].errorRps).toBeCloseTo(2);
    expect(state.perNode["db"].successRps).toBeCloseTo(198);
  });

  it("cache com hitRatio 0 propaga tudo e com hitRatio 1 propaga nada", () => {
    const base: [string, ComponentType, Partial<ComponentParams>?][] = [
      ["c", "client"],
      ["s", "service"],
      ["cache", "cache", { hitRatio: 0 }],
      ["db", "sql"],
    ];
    const edges: [string, string][] = [
      ["c", "s"],
      ["s", "cache"],
      ["cache", "db"],
    ];
    const allMiss = tick(makeDesign(base, edges), 300);
    expect(allMiss.perNode["db"].incomingRps).toBeCloseTo(300);

    base[2] = ["cache", "cache", { hitRatio: 1 }];
    const allHit = tick(makeDesign(base, edges), 300);
    expect(allHit.perNode["db"].incomingRps).toBeCloseTo(0);
  });

  it("múltiplos Clientes somam carga no destino comum", () => {
    const design = makeDesign(
      [
        ["c1", "client"],
        ["c2", "client"],
        ["s", "service"],
      ],
      [
        ["c1", "s"],
        ["c2", "s"],
      ]
    );
    const state = tick(design, 400);
    expect(state.perNode["s"].incomingRps).toBeCloseTo(800);
    expect(state.global.totalRps).toBeCloseTo(800);
  });

  it("nó sem caminho a partir do Cliente fica em 0 RPS", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service"],
        ["orfao", "service"],
      ],
      [["c", "s"]]
    );
    const state = tick(design, 100);
    expect(state.perNode["orfao"].incomingRps).toBe(0);
    expect(state.perNode["orfao"].errorRps).toBe(0);
  });

  it("sobrecarga falha o excedente e conserva fluxo: incoming = success + errors", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service", { capacity: 100, errorRate: 0.1 }],
      ],
      [["c", "s"]]
    );
    const state = tick(design, 1000);
    const m = state.perNode["s"];
    expect(m.incomingRps).toBeCloseTo(1000);
    expect(m.processedRps).toBeCloseTo(100);
    expect(m.successRps).toBeCloseTo(90);
    expect(m.errorRps).toBeCloseTo(910);
    expect(m.incomingRps).toBeCloseTo(m.successRps + m.errorRps);
  });

  it("conserva fluxo em todos os nós do exemplo da spec com erro base", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["lb", "loadbalancer"],
        ["s1", "service", { errorRate: 0.02 }],
        ["cache", "cache", { hitRatio: 0.8 }],
        ["db", "sql", { errorRate: 0.01 }],
      ],
      [
        ["c", "lb"],
        ["lb", "s1"],
        ["s1", "cache"],
        ["cache", "db"],
      ]
    );
    const state = tick(design, 1000);
    for (const id of ["c", "lb", "s1", "cache", "db"]) {
      const m = state.perNode[id];
      expect(m.incomingRps).toBeCloseTo(m.successRps + m.errorRps);
    }
  });

  it("fila enfileira como sucesso e drena até a capacidade do consumidor", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service"],
        ["q", "queue"],
        ["worker", "worker", { capacity: 100 }],
      ],
      [
        ["c", "s"],
        ["s", "q"],
        ["q", "worker"],
      ]
    );
    const t1 = tick(design, 500);
    expect(t1.perNode["q"].successRps).toBeCloseTo(500);
    expect(t1.perNode["q"].errorRps).toBeCloseTo(0);
    expect(t1.perNode["worker"].incomingRps).toBeCloseTo(100);
    expect(t1.perNode["q"].queueDepth).toBeCloseTo(400);

    const t2 = tick(design, 500, t1);
    expect(t2.perNode["q"].queueDepth).toBeCloseTo(800);
    expect(t2.perNode["worker"].incomingRps).toBeCloseTo(100);
  });

  it("fila com buffer cheio falha o excedente mantendo conservação", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service"],
        ["q", "queue", { bufferSize: 300 }],
        ["worker", "worker", { capacity: 100 }],
      ],
      [
        ["c", "s"],
        ["s", "q"],
        ["q", "worker"],
      ]
    );
    const t1 = tick(design, 500);
    expect(t1.perNode["q"].successRps).toBeCloseTo(300);
    expect(t1.perNode["q"].errorRps).toBeCloseTo(200);
    expect(t1.perNode["q"].queueDepth).toBeCloseTo(200);
    const m = t1.perNode["q"];
    expect(m.incomingRps).toBeCloseTo(m.successRps + m.errorRps);
  });

  it("fila preserva e drena proporcionalmente a profundidade por fluxo entre ticks", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service"],
        ["q", "queue"],
        ["worker", "worker", { capacity: 100 }],
      ],
      [
        ["c", "s"],
        ["s", "q"],
        ["q", "worker"],
      ]
    );

    const t1 = runTick(design, { rps: 500, writeRatio: 0.2 });
    expect(t1.perNode["q"].queueDepthFlow?.read).toBeCloseTo(320);
    expect(t1.perNode["q"].queueDepthFlow?.write).toBeCloseTo(80);
    expect(t1.perNode["q"].queueDepth).toBeCloseTo(
      t1.perNode["q"].queueDepthFlow!.read + t1.perNode["q"].queueDepthFlow!.write
    );

    const t2 = runTick(design, { rps: 500, writeRatio: 0.6 }, t1);
    expect(t2.perNode["worker"].flows.incoming.read).toBeCloseTo(520 / 9);
    expect(t2.perNode["worker"].flows.incoming.write).toBeCloseTo(380 / 9);
    expect(t2.perNode["q"].queueDepthFlow?.read).toBeCloseTo(4160 / 9);
    expect(t2.perNode["q"].queueDepthFlow?.write).toBeCloseTo(3040 / 9);
    expect(t2.perNode["q"].queueDepth).toBeCloseTo(
      t2.perNode["q"].queueDepthFlow!.read + t2.perNode["q"].queueDepthFlow!.write
    );

    const t3 = runTick(design, { rps: 0, writeRatio: 0 }, t2);
    expect(t3.perNode["worker"].flows.incoming.read).toBeCloseTo(520 / 9);
    expect(t3.perNode["worker"].flows.incoming.write).toBeCloseTo(380 / 9);
    expect(t3.perNode["q"].queueDepth).toBeCloseTo(700);
    expect(t3.perNode["q"].queueDepthFlow?.read).toBeCloseTo(3640 / 9);
    expect(t3.perNode["q"].queueDepthFlow?.write).toBeCloseTo(2660 / 9);
    expect(t3.perNode["q"].queueDepth).toBeCloseTo(
      t3.perNode["q"].queueDepthFlow!.read + t3.perNode["q"].queueDepthFlow!.write
    );
  });
});

describe("máquina de estados de saúde", () => {
  function singleServiceDesign(capacity: number) {
    return makeDesign(
      [
        ["c", "client"],
        ["s", "service", { capacity }],
        ["db", "sql"],
      ],
      [
        ["c", "s"],
        ["s", "db"],
      ]
    );
  }

  it("classifica estados pelos limiares exatos: <0.7 healthy, 0.7-1.0 degraded, >1.0 overloaded", () => {
    const design = singleServiceDesign(100);
    expect(tick(design, 69).perNode["s"].state).toBe("healthy");
    expect(tick(design, 70).perNode["s"].state).toBe("degraded");
    expect(tick(design, 100).perNode["s"].state).toBe("degraded");
    expect(tick(design, 101).perNode["s"].state).toBe("overloaded");
  });

  it("cai após 30 ticks sustentados acima de 150% e não antes", () => {
    const design = singleServiceDesign(100);
    const at29 = runTicks(design, 160, 29);
    expect(at29.perNode["s"].state).toBe("overloaded");
    const at30 = tick(design, 160, at29);
    expect(at30.perNode["s"].state).toBe("down");
  });

  it("aplica a queda ao processamento e propagação exatamente no tick 30", () => {
    const design = singleServiceDesign(100);
    const at29 = runTicks(design, 160, 29);
    expect(at29.perNode["s"].state).toBe("overloaded");
    expect(at29.perNode["s"].processedRps).toBeCloseTo(100);
    expect(at29.perNode["db"].incomingRps).toBeCloseTo(100);

    const at30 = tick(design, 160, at29);
    expect(at30.perNode["s"].state).toBe("down");
    expect(at30.perNode["s"].processedRps).toBe(0);
    expect(at30.perNode["s"].successRps).toBe(0);
    expect(at30.perNode["s"].errorRps).toBeCloseTo(160);
    expect(at30.perNode["db"].incomingRps).toBe(0);
  });

  it("utilization exatamente 1.5 não derruba réplica nem depois de 40 ticks", () => {
    const design = singleServiceDesign(100);
    const state = runTicks(design, 150, 40);
    expect(state.perNode["s"].state).toBe("overloaded");
    expect(state.perNode["s"].readyReplicas).toBe(1);
  });

  it("nó down processa 0, falha tudo que chega e downstream recebe zero", () => {
    const design = singleServiceDesign(100);
    const downState = runTicks(design, 160, 30);
    expect(downState.perNode["s"].state).toBe("down");
    const next = tick(design, 160, downState);
    const m = next.perNode["s"];
    expect(m.processedRps).toBe(0);
    expect(m.successRps).toBe(0);
    expect(m.errorRps).toBeCloseTo(160);
    expect(next.perNode["db"].incomingRps).toBe(0);
  });

  it("reinicia após RESTART_TICKS no prazo fixo, e não antes", () => {
    const design = singleServiceDesign(100);
    const downState = runTicks(design, 160, 30);
    const at29 = runTicks(design, 40, 29, downState);
    expect(at29.perNode["s"].state).toBe("down");
    const at30 = tick(design, 40, at29);
    expect(at30.perNode["s"].state).toBe("healthy");
    const after = tick(design, 40, at30);
    expect(after.perNode["s"].processedRps).toBeCloseTo(40);
  });

  it("retoma processamento e propagação exatamente no tick 30 de reinício", () => {
    const design = singleServiceDesign(100);
    const downState = runTicks(design, 160, 30);
    const at29 = runTicks(design, 40, 29, downState);
    expect(at29.perNode["s"].state).toBe("down");
    expect(at29.perNode["s"].processedRps).toBe(0);
    expect(at29.perNode["s"].errorRps).toBeCloseTo(40);
    expect(at29.perNode["db"].incomingRps).toBe(0);

    const at30 = tick(design, 40, at29);
    expect(at30.perNode["s"].state).toBe("healthy");
    expect(at30.perNode["s"].processedRps).toBeCloseTo(40);
    expect(at30.perNode["s"].successRps).toBeCloseTo(40);
    expect(at30.perNode["s"].errorRps).toBe(0);
    expect(at30.perNode["db"].incomingRps).toBeCloseTo(40);
  });

  it("reinicia mesmo sob utilização alta sustentada e cai de novo — crash loop de ~60 ticks", () => {
    const design = singleServiceDesign(100);
    const downState = runTicks(design, 160, 30);
    expect(downState.perNode["s"].state).toBe("down");

    const at59 = runTicks(design, 160, 29, downState);
    expect(at59.perNode["s"].state).toBe("down");

    const at60 = tick(design, 160, at59);
    expect(at60.perNode["s"].state).toBe("overloaded");
    expect(at60.perNode["s"].processedRps).toBeCloseTo(100);

    const at89 = runTicks(design, 160, 29, at60);
    expect(at89.perNode["s"].state).toBe("overloaded");

    const at90 = tick(design, 160, at89);
    expect(at90.perNode["s"].state).toBe("down");
  });

  it("regressão: sob carga estável o tick 200 é idêntico ao tick 1", () => {
    const design = singleServiceDesign(1000);
    const first = tick(design, 500);
    const last = runTicks(design, 500, 200);
    const a = first.perNode["s"];
    const b = last.perNode["s"];
    expect(b.state).toBe(a.state);
    expect(b.readyReplicas).toBe(a.readyReplicas);
    expect(b.totalReplicas).toBe(a.totalReplicas);
    expect(b.utilization).toBeCloseTo(a.utilization);
    expect(b.processedRps).toBeCloseTo(a.processedRps);
    expect(b.successRps).toBeCloseTo(a.successRps);
    expect(b.errorRps).toBeCloseTo(a.errorRps);
    expect(last.global.successRatio).toBeCloseTo(first.global.successRatio);
  });

  it("carga oscilante não impede o reinício: o relógio de reinício não depende da utilização", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service", { capacity: 100, replicas: 3 }],
      ],
      [["c", "s"]]
    );

    let state = runTicks(design, 480, 30);
    expect(state.perNode["s"].readyReplicas).toBe(2);

    for (let cycle = 0; cycle < 4; cycle++) {
      state = runTicks(design, 400, 25, state);
      state = runTicks(design, 200, 5, state);
    }

    expect(state.perNode["s"].readyReplicas).toBe(3);
  });

  it("LB redistribui apenas entre destinos saudáveis quando um cai", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["lb", "loadbalancer"],
        ["sa", "service", { capacity: 10 }],
        ["sb", "service", { capacity: 10000 }],
      ],
      [
        ["c", "lb"],
        ["lb", "sa"],
        ["lb", "sb"],
      ]
    );
    const downState = runTicks(design, 100, 30);
    expect(downState.perNode["sa"].state).toBe("down");
    const next = tick(design, 100, downState);
    expect(next.perNode["sa"].incomingRps).toBe(0);
    expect(next.perNode["sb"].incomingRps).toBeCloseTo(100);
  });
});

describe("máquina de réplicas", () => {
  it("derruba uma réplica por vez sob sobrecarga e recompõe uma a cada RESTART_TICKS quando a carga cede", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service", { capacity: 100, replicas: 3 }],
      ],
      [["c", "s"]]
    );

    const at29 = runTicks(design, 480, 29);
    expect(at29.perNode["s"].readyReplicas).toBe(3);

    const at30 = tick(design, 480, at29);
    expect(at30.perNode["s"].readyReplicas).toBe(2);
    expect(at30.perNode["s"].totalReplicas).toBe(3);
    expect(at30.perNode["s"].state).toBe("overloaded");
    expect(at30.perNode["s"].utilization).toBeCloseTo(2.4);
    expect(at30.perNode["s"].processedRps).toBeCloseTo(200);

    const at60 = runTicks(design, 480, 30, at30);
    expect(at60.perNode["s"].readyReplicas).toBe(1);
    const at90 = runTicks(design, 480, 30, at60);
    expect(at90.perNode["s"].readyReplicas).toBe(0);
    expect(at90.perNode["s"].state).toBe("down");

    // carga cede; reinício sequencial, uma réplica por RESTART_TICKS, até o total
    const restart29 = runTicks(design, 40, 29, at90);
    expect(restart29.perNode["s"].readyReplicas).toBe(0);
    const restart30 = tick(design, 40, restart29);
    expect(restart30.perNode["s"].readyReplicas).toBe(1);
    expect(restart30.perNode["s"].processedRps).toBeCloseTo(40);

    const restart60 = runTicks(design, 40, 30, restart30);
    expect(restart60.perNode["s"].readyReplicas).toBe(2);
    const restart90 = runTicks(design, 40, 30, restart60);
    expect(restart90.perNode["s"].readyReplicas).toBe(3);
  });

  it("reinicia mesmo sob sobrecarga sustentada e cai de novo (crash loop), sem depender da utilização", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service", { capacity: 100, replicas: 3 }],
      ],
      [["c", "s"]]
    );

    const down = runTicks(design, 480, 90);
    expect(down.perNode["s"].readyReplicas).toBe(0);

    // sob a MESMA carga (480, nunca aliviada), reinicia 1 réplica após RESTART_TICKS
    const restarted = runTicks(design, 480, 30, down);
    expect(restarted.perNode["s"].readyReplicas).toBe(1);
    expect(restarted.perNode["s"].state).toBe("overloaded");

    // e cai de novo após DOWN_TICKS, porque a sobrecarga continua
    const fellAgain = runTicks(design, 480, 30, restarted);
    expect(fellAgain.perNode["s"].readyReplicas).toBe(0);
    expect(fellAgain.perNode["s"].state).toBe("down");
  });

  it("reduz o drain da fila quando o worker perde réplicas", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service", { capacity: 100000 }],
        ["q1", "queue"],
        ["q2", "queue"],
        ["worker", "worker", { capacity: 100, replicas: 3 }],
      ],
      [
        ["c", "s"],
        ["s", "q1"],
        ["s", "q2"],
        ["q1", "worker"],
        ["q2", "worker"],
      ]
    );

    const at29 = runTicks(design, 1000, 29);
    expect(at29.perNode["worker"].readyReplicas).toBe(3);
    expect(at29.perNode["worker"].incomingRps).toBeCloseTo(600);
    const at30 = tick(design, 1000, at29);
    expect(at30.perNode["worker"].readyReplicas).toBe(2);
    expect(at30.perNode["worker"].utilization).toBeCloseTo(3);
    const afterLoss = tick(design, 1000, at30);
    expect(afterLoss.perNode["worker"].incomingRps).toBeCloseTo(400);
  });

  it("SQL reduz leitura com réplicas prontas e mantém escrita até ficar down", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service", { capacity: 100000 }],
        ["db", "sql", { capacity: 100, replicas: 3 }],
      ],
      [
        ["c", "s"],
        ["s", "db"],
      ]
    );

    const partial = runTicks(design, 480, 30);
    expect(partial.perNode["db"].readyReplicas).toBe(2);
    expect(partial.perNode["db"].readUtilization).toBeCloseTo(2.4);
    expect(partial.perNode["db"].utilization).toBeCloseTo(2.4);
    expect(partial.perNode["db"].flows.success.read).toBeCloseTo(200);
    expect(partial.perNode["db"].flows.error.read).toBeCloseTo(280);

    const firstWrite = runTick(design, { rps: 160, writeRatio: 1 }, partial);
    expect(firstWrite.perNode["db"].readyReplicas).toBe(2);
    expect(firstWrite.perNode["db"].flows.success.write).toBeCloseTo(100);
    expect(firstWrite.perNode["db"].flows.error.write).toBeCloseTo(60);

    let down = firstWrite;
    for (let i = 0; i < 59; i++) {
      down = runTick(design, { rps: 160, writeRatio: 1 }, down);
    }
    expect(down.perNode["db"].readyReplicas).toBe(0);
    expect(down.perNode["db"].flows.success.write).toBe(0);
    expect(down.perNode["db"].flows.error.write).toBeCloseTo(160);
  });
});

describe("autoscaler", () => {
  it("calcula o desejado diretamente pela utilização e respeita o teto", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        [
          "s",
          "service",
          { capacity: 100, replicas: 2, autoscaling: { minReplicas: 1, maxReplicas: 10, targetUtilization: 0.5 } },
        ],
      ],
      [["c", "s"]]
    );

    const state = tick(design, 400);
    expect(state.perNode["s"].desiredReplicas).toBe(8);
    expect(state.perNode["s"].totalReplicas).toBe(8);
    expect(state.perNode["s"].readyReplicas).toBe(2);
    expect(state.perNode["s"].utilization).toBe(2);
  });

  it("ajusta réplicas iniciais para dentro do piso e teto", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        [
          "s",
          "service",
          {
            capacity: 100,
            replicas: 20,
            autoscaling: { minReplicas: 3, maxReplicas: 5, targetUtilization: 0.6 },
          },
        ],
      ],
      [["c", "s"]]
    );

    const state = tick(design, 100);
    expect(state.perNode["s"].desiredReplicas).toBe(3);
    expect(state.perNode["s"].readyReplicas).toBe(5);
  });

  it("mantém o desejado no teto para SQL sob carga de escrita", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        [
          "db",
          "sql",
          {
            capacity: 100,
            autoscaling: { minReplicas: 1, maxReplicas: 5, targetUtilization: 0.6 },
          },
        ],
      ],
      [["c", "db"]]
    );

    const state = runTick(design, { rps: 1000, writeRatio: 1 });
    expect(state.perNode["db"].desiredReplicas).toBe(5);
    expect(state.perNode["db"].writeUtilization).toBe(10);
  });

  it("fica saudável no alvo default", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service", { capacity: 100, autoscaling: { ...DEFAULT_AUTOSCALING } }],
      ],
      [["c", "s"]]
    );

    const state = tick(design, 60);
    expect(state.perNode["s"].utilization).toBeCloseTo(0.6);
    expect(state.perNode["s"].desiredReplicas).toBe(1);
    expect(state.perNode["s"].state).toBe("healthy");
  });

  it("não calcula autoscaling nem produz NaN quando nenhuma réplica está pronta", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service", { capacity: 100, autoscaling: { ...DEFAULT_AUTOSCALING } }],
      ],
      [["c", "s"]]
    );

    const down = runTicks(design, 1000, 30);
    expect(down.perNode["s"].readyReplicas).toBe(0);
    const next = tick(design, 1000, down);
    expect(next.perNode["s"].desiredReplicas).toBe(10);
    expect(Number.isNaN(next.perNode["s"].utilization)).toBe(false);
    expect(Number.isNaN(next.perNode["s"].processedRps)).toBe(false);
    expect(next.perNode["s"].state).toBe("down");
  });

  it("sem autoscaling mantém o desejado igual ao número configurado", () => {
    const design = makeDesign(
      [["c", "client"], ["s", "service", { replicas: 4 }]],
      [["c", "s"]]
    );

    const state = tick(design, 100);
    expect(state.perNode["s"].desiredReplicas).toBe(4);
    expect(state.perNode["s"].totalReplicas).toBe(4);
  });

  it("só reduz após 100 ticks de demanda menor sustentada", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        [
          "s",
          "service",
          { capacity: 100, replicas: 2, autoscaling: { minReplicas: 1, maxReplicas: 10, targetUtilization: 0.5 } },
        ],
      ],
      [["c", "s"]],
    );

    const peak = tick(design, 400);
    expect(peak.perNode["s"].desiredReplicas).toBe(8);

    const beforeWindow = runTicks(design, 50, 99, peak);
    expect(beforeWindow.perNode["s"].desiredReplicas).toBe(8);

    const afterWindow = tick(design, 50, beforeWindow);
    expect(afterWindow.perNode["s"].desiredReplicas).toBe(1);
  });

  it("zera a janela com um tick de scale-up e continua crescendo imediatamente", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        [
          "s",
          "service",
          { capacity: 100, replicas: 2, autoscaling: { minReplicas: 1, maxReplicas: 10, targetUtilization: 0.5 } },
        ],
      ],
      [["c", "s"]],
    );

    const peak = tick(design, 400);
    const pending = runTicks(design, 50, 99, peak);
    expect(pending.perNode["s"].desiredReplicas).toBe(8);

    const scaledUp = tick(design, 1000, pending);
    expect(scaledUp.perNode["s"].desiredReplicas).toBe(10);

    const beforeNewWindow = runTicks(design, 50, 99, scaledUp);
    expect(beforeNewWindow.perNode["s"].desiredReplicas).toBe(10);
    expect(tick(design, 50, beforeNewWindow).perNode["s"].desiredReplicas).toBe(1);
  });
});

describe("backward pass", () => {
  it("curva de latência: 1x em u=0.69, 3x em u=0.85, 5x em u=1.0 e acima", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service", { capacity: 100, baseLatencyMs: 20 }],
      ],
      [["c", "s"]]
    );
    expect(tick(design, 69).perNode["s"].effectiveLatencyMs).toBeCloseTo(20);
    expect(tick(design, 85).perNode["s"].effectiveLatencyMs).toBeCloseTo(60);
    expect(tick(design, 100).perNode["s"].effectiveLatencyMs).toBeCloseTo(100);
    expect(tick(design, 120).perNode["s"].effectiveLatencyMs).toBeCloseTo(100);
  });

  it("latência ponta-a-ponta pondera cache hit/miss", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service", { baseLatencyMs: 20 }],
        ["cache", "cache", { baseLatencyMs: 1, hitRatio: 0.8 }],
        ["db", "sql", { baseLatencyMs: 10 }],
      ],
      [
        ["c", "s"],
        ["s", "cache"],
        ["cache", "db"],
      ]
    );
    const state = tick(design, 100);
    expect(state.perNode["cache"].effectiveLatencyMs).toBeCloseTo(3);
    expect(state.perNode["s"].effectiveLatencyMs).toBeCloseTo(23);
    expect(state.global.e2eLatencyMs).toBeCloseTo(23);
  });

  it("usa o ramo mais lento do LB sem alterar o sucesso ponderado", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["lb", "loadbalancer", { baseLatencyMs: 2 }],
        ["fast", "service", { baseLatencyMs: 10 }],
        ["slow", "service", { baseLatencyMs: 100, errorRate: 0.5 }],
      ],
      [
        ["c", "lb"],
        ["lb", "fast"],
        ["lb", "slow"],
      ]
    );
    const state = tick(design, 100);

    expect(state.global.successRatio).toBeCloseTo(0.75);
    expect(state.global.e2eLatencyMs).toBeCloseTo(102);
  });

  it("falha no banco reduz o successRatio do Service upstream e o global", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service"],
        ["db", "sql", { errorRate: 0.5 }],
      ],
      [
        ["c", "s"],
        ["s", "db"],
      ]
    );
    const state = tick(design, 100);
    expect(state.global.successRatio).toBeCloseTo(0.5);
  });

  it("registra falha total downstream como erro efetivo nos nós upstream", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service"],
        ["db", "sql", { errorRate: 1 }],
      ],
      [
        ["c", "s"],
        ["s", "db"],
      ]
    );
    const state = tick(design, 100);

    expect(state.perNode["db"].effectiveErrorRps).toBeCloseTo(100);
    expect(state.perNode["s"].effectiveErrorRps).toBeCloseTo(100);
    expect(state.perNode["c"].effectiveErrorRps).toBeCloseTo(100);
    expect(state.perNode["s"].errorRps).toBe(0);
    expect(state.perNode["s"].incomingRps).toBeCloseTo(
      state.perNode["s"].successRps + state.perNode["s"].errorRps
    );
  });

  it("cache absorve parte da falha downstream: hit + miss * ratio", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service"],
        ["cache", "cache", { hitRatio: 0.8 }],
        ["db", "sql", { errorRate: 0.5 }],
      ],
      [
        ["c", "s"],
        ["s", "cache"],
        ["cache", "db"],
      ]
    );
    const state = tick(design, 100);
    expect(state.global.successRatio).toBeCloseTo(0.9);
  });

  it("fila: enfileirar conta como sucesso e não soma latência downstream", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service", { baseLatencyMs: 20 }],
        ["q", "queue", { baseLatencyMs: 1 }],
        ["worker", "worker", { baseLatencyMs: 100, errorRate: 1 }],
      ],
      [
        ["c", "s"],
        ["s", "q"],
        ["q", "worker"],
      ]
    );
    const state = tick(design, 100);
    expect(state.perNode["worker"].errorRps).toBeCloseTo(100);
    expect(state.perNode["q"].effectiveLatencyMs).toBeCloseTo(1);
    expect(state.perNode["s"].effectiveLatencyMs).toBeCloseTo(21);
    expect(state.global.successRatio).toBeCloseTo(1);
  });

  it("sobrecarga reduz o successRatio global", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service", { capacity: 100 }],
      ],
      [["c", "s"]]
    );
    const state = tick(design, 200);
    expect(state.global.successRatio).toBeCloseTo(0.5);
    expect(state.global.totalRps).toBeCloseTo(200);
  });

  it("nó down zera o successRatio do caminho e o global reflete", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service", { capacity: 100 }],
      ],
      [["c", "s"]]
    );
    const downState = runTicks(design, 160, 30);
    const next = tick(design, 160, downState);
    expect(next.global.successRatio).toBeCloseTo(0);
  });
});

describe("propagação dual-flow", () => {
  it("cliente divide a carga pelo writeRatio: 1000 RPS com 20% escrita = 800 leitura + 200 escrita", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service"],
      ],
      [["c", "s"]]
    );
    const state = runTick(design, { rps: 1000, writeRatio: 0.2 });
    expect(state.perNode["c"].flows.incoming).toEqual({ read: 800, write: 200 });
    expect(state.perNode["s"].flows.incoming.read).toBeCloseTo(800);
    expect(state.perNode["s"].flows.incoming.write).toBeCloseTo(200);
    expect(state.perNode["s"].incomingRps).toBeCloseTo(1000);
  });

  it("nó genérico conserva cada fluxo com overflow e errorRate proporcionais", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service", { capacity: 100, errorRate: 0.1 }],
      ],
      [["c", "s"]]
    );
    const state = runTick(design, { rps: 1000, writeRatio: 0.3 });
    const f = state.perNode["s"].flows;
    expect(f.incoming.read).toBeCloseTo(700);
    expect(f.incoming.write).toBeCloseTo(300);
    expect(f.success.read).toBeCloseTo(63);
    expect(f.success.write).toBeCloseTo(27);
    expect(f.error.read).toBeCloseTo(637);
    expect(f.error.write).toBeCloseTo(273);
    expect(f.incoming.read).toBeCloseTo(f.success.read + f.error.read);
    expect(f.incoming.write).toBeCloseTo(f.success.write + f.error.write);
  });

  it("LB divide o Flow igualmente entre destinos e conserva por fluxo", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["lb", "loadbalancer"],
        ["s1", "service"],
        ["s2", "service"],
      ],
      [
        ["c", "lb"],
        ["lb", "s1"],
        ["lb", "s2"],
      ]
    );
    const state = runTick(design, { rps: 1000, writeRatio: 0.2 });
    const lb = state.perNode["lb"].flows;
    expect(lb.incoming.read).toBeCloseTo(800);
    expect(lb.incoming.write).toBeCloseTo(200);
    expect(lb.incoming.read).toBeCloseTo(lb.success.read + lb.error.read);
    expect(lb.incoming.write).toBeCloseTo(lb.success.write + lb.error.write);
    for (const id of ["s1", "s2"]) {
      expect(state.perNode[id].flows.incoming.read).toBeCloseTo(400);
      expect(state.perNode[id].flows.incoming.write).toBeCloseTo(100);
    }
  });

  it("fan-out duplica o Flow para cada destino", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service"],
        ["db1", "sql", { capacity: 100000 }],
        ["db2", "nosql", { capacity: 100000 }],
      ],
      [
        ["c", "s"],
        ["s", "db1"],
        ["s", "db2"],
      ]
    );
    const state = runTick(design, { rps: 500, writeRatio: 0.4 });
    for (const id of ["db1", "db2"]) {
      expect(state.perNode[id].flows.incoming.read).toBeCloseTo(300);
      expect(state.perNode[id].flows.incoming.write).toBeCloseTo(200);
    }
  });
});

describe("cache com mix leitura/escrita", () => {
  it("hit 80% com 20% escrita: downstream recebe 200 de escrita + 160 de leitura", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service", { capacity: 100000 }],
        ["cache", "cache", { hitRatio: 0.8 }],
        ["db", "sql", { capacity: 100000 }],
      ],
      [
        ["c", "s"],
        ["s", "cache"],
        ["cache", "db"],
      ]
    );
    const state = runTick(design, { rps: 1000, writeRatio: 0.2 });
    expect(state.perNode["db"].flows.incoming.read).toBeCloseTo(160);
    expect(state.perNode["db"].flows.incoming.write).toBeCloseTo(200);
    expect(state.perNode["db"].incomingRps).toBeCloseTo(360);
  });

  it("passada reversa usa fração de passagem (miss leitura + escrita) para ratio e latência", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service", { capacity: 100000 }],
        ["cache", "cache", { hitRatio: 0.8, baseLatencyMs: 1 }],
        ["db", "sql", { capacity: 100000, baseLatencyMs: 10, errorRate: 0.5 }],
      ],
      [
        ["c", "s"],
        ["s", "cache"],
        ["cache", "db"],
      ]
    );
    const state = runTick(design, { rps: 1000, writeRatio: 0.2 });
    expect(state.global.successRatio).toBeCloseTo(0.82);
    expect(state.perNode["cache"].effectiveLatencyMs).toBeCloseTo(1 + 0.36 * 10);
  });

  it("writeRatio 0 reproduz o comportamento anterior do cache", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service", { capacity: 100000 }],
        ["cache", "cache", { hitRatio: 0.8, baseLatencyMs: 1 }],
        ["db", "sql", { capacity: 100000, baseLatencyMs: 10, errorRate: 0.5 }],
      ],
      [
        ["c", "s"],
        ["s", "cache"],
        ["cache", "db"],
      ]
    );
    const state = runTick(design, { rps: 1000, writeRatio: 0 });
    expect(state.perNode["db"].incomingRps).toBeCloseTo(200);
    expect(state.global.successRatio).toBeCloseTo(0.9);
    expect(state.perNode["cache"].effectiveLatencyMs).toBeCloseTo(1 + 0.2 * 10);
  });
});

describe("tetos de leitura e escrita em bancos", () => {
  it("SQL com cinco réplicas satura em 2500 RPS e acima disso falha somente escrita", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service", { capacity: 100000 }],
        ["db", "sql", { capacity: 500, replicas: 5 }],
      ],
      [
        ["c", "s"],
        ["s", "db"],
      ]
    );

    const atLimit = runTick(design, { rps: 2500, writeRatio: 0.2 });
    expect(atLimit.perNode["db"].flows.success.read).toBeCloseTo(2000);
    expect(atLimit.perNode["db"].flows.success.write).toBeCloseTo(500);
    expect(atLimit.perNode["db"].flows.error.read).toBeCloseTo(0);
    expect(atLimit.perNode["db"].flows.error.write).toBeCloseTo(0);
    expect(atLimit.perNode["db"].readUtilization).toBeCloseTo(0.8);
    expect(atLimit.perNode["db"].writeUtilization).toBeCloseTo(1);
    expect(atLimit.perNode["db"].utilization).toBeCloseTo(1);

    const aboveLimit = runTick(design, { rps: 3000, writeRatio: 0.2 });
    expect(aboveLimit.perNode["db"].flows.success.read).toBeCloseTo(2400);
    expect(aboveLimit.perNode["db"].flows.success.write).toBeCloseTo(500);
    expect(aboveLimit.perNode["db"].flows.error.read).toBeCloseTo(0);
    expect(aboveLimit.perNode["db"].flows.error.write).toBeCloseTo(100);
    expect(aboveLimit.perNode["db"].readUtilization).toBeCloseTo(0.96);
    expect(aboveLimit.perNode["db"].writeUtilization).toBeCloseTo(1.2);
    expect(aboveLimit.perNode["db"].utilization).toBeCloseTo(1.2);
    expect(aboveLimit.perNode["db"].flows.incoming.read).toBeCloseTo(
      aboveLimit.perNode["db"].flows.success.read + aboveLimit.perNode["db"].flows.error.read
    );
    expect(aboveLimit.perNode["db"].flows.incoming.write).toBeCloseTo(
      aboveLimit.perNode["db"].flows.success.write + aboveLimit.perNode["db"].flows.error.write
    );
  });

  it("NoSQL com quatro shards e cinco réplicas sustenta 10000 RPS", () => {
    const design = makeDesign(
      [
        ["c", "client"],
        ["s", "service", { capacity: 100000 }],
        ["db", "nosql", { capacity: 500, shards: 4, replicas: 5 }],
      ],
      [
        ["c", "s"],
        ["s", "db"],
      ]
    );

    const state = runTick(design, { rps: 10000, writeRatio: 0.2 });
    expect(state.perNode["db"].flows.incoming.read).toBeCloseTo(8000);
    expect(state.perNode["db"].flows.incoming.write).toBeCloseTo(2000);
    expect(state.perNode["db"].flows.success.read).toBeCloseTo(8000);
    expect(state.perNode["db"].flows.success.write).toBeCloseTo(2000);
    expect(state.perNode["db"].flows.error.read).toBeCloseTo(0);
    expect(state.perNode["db"].flows.error.write).toBeCloseTo(0);
    expect(state.perNode["db"].readUtilization).toBeCloseTo(0.8);
    expect(state.perNode["db"].writeUtilization).toBeCloseTo(1);
    expect(state.perNode["db"].utilization).toBeCloseTo(1);
    expect(state.perNode["db"].flows.incoming.read).toBeCloseTo(
      state.perNode["db"].flows.success.read + state.perNode["db"].flows.error.read
    );
    expect(state.perNode["db"].flows.incoming.write).toBeCloseTo(
      state.perNode["db"].flows.success.write + state.perNode["db"].flows.error.write
    );
  });
});
