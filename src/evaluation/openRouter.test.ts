import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Design, SimState } from "../engine/types";
import { evaluateDesign } from "./openRouter";
import { CHALLENGES } from "./challenges";

const design: Design = {
  schema: 1,
  id: "test-design",
  nodes: [
    {
      id: "service-1",
      type: "service",
      name: "Serviço de ingestão",
      position: { x: 10, y: 20 },
      params: { capacity: 2000, baseLatencyMs: 20, errorRate: 0.01 },
    },
    {
      id: "sql-1",
      type: "sql",
      position: { x: 240, y: 20 },
      params: { capacity: 500, baseLatencyMs: 10, errorRate: 0 },
    },
  ],
  edges: [{ id: "edge-1", source: "service-1", target: "sql-1" }],
};

const metrics: SimState = {
  perNode: {
    "service-1": {
      incomingRps: 1000,
      processedRps: 1000,
      successRps: 990,
      errorRps: 10,
      utilization: 0.5,
      effectiveLatencyMs: 20,
      state: "healthy",
      overloadTicks: 0,
      restartTicks: 0,
      scaleDownTicks: 0,
      desiredReplicas: 1,
      readyReplicas: 1,
      totalReplicas: 1,
      flows: {
        incoming: { read: 1000, write: 0 },
        success: { read: 990, write: 0 },
        error: { read: 10, write: 0 },
      },
    },
  },
  global: { successRatio: 0.99, e2eLatencyMs: 30, totalRps: 1000 },
};

describe("evaluateDesign via OpenRouter", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => {
        if (key === "openrouter-api-key") return "test-openrouter-key";
        if (key === "openrouter-model") return "openai/gpt-5.2";
        return null;
      }),
      setItem: vi.fn(),
    });
  });

  it("envia chave, modelo, design, métricas e brief do preset e retorna o feedback", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        choices: [
          { message: { content: "O design atende a carga proposta." } },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const brief = CHALLENGES[0].brief;
    const feedback = await evaluateDesign(design, metrics, brief, {
      rps: 1_500,
      writePercent: 35,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(options.headers).toEqual({
      Authorization: "Bearer test-openrouter-key",
      "Content-Type": "application/json",
    });
    const body = JSON.parse(options.body);
    expect(body.model).toBe("openai/gpt-5.2");
    expect(body.messages[0].content).not.toContain('"id": "test-design"');
    expect(body.messages[0].content).not.toContain('"name": "principal"');
    expect(body.messages[0].content).toContain("Serviço de ingestão");
    expect(body.messages[0].content).toContain(JSON.stringify(metrics, null, 2));
    expect(body.messages[0].content).toContain(brief);
    expect(body.messages[0].content).toContain("Responda em português");
    expect(body.messages[0].content).toContain(
      "Carga da simulação: 1500 RPS, 35% escritas",
    );
    expect(feedback).toBe("O design atende a carga proposta.");
  });

  it("envia um brief customizado (string arbitrária) no prompt", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: "Feedback qualquer." } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const customBrief = "Sistema de reservas de assentos com pico sazonal.";
    await evaluateDesign(design, metrics, customBrief, { rps: 100, writePercent: 10 });

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.messages[0].content).toContain(customBrief);
  });

  it("envia a configuração de autoscaling do design no prompt", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: "Feedback qualquer." } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const designWithAutoscaling: Design = {
      ...design,
      nodes: [
        {
          ...design.nodes[0],
          params: {
            ...design.nodes[0].params,
            autoscaling: { minReplicas: 2, maxReplicas: 8, targetUtilization: 0.6 },
          },
        },
        design.nodes[1],
      ],
    };
    await evaluateDesign(designWithAutoscaling, metrics, "");

    const [, options] = fetchMock.mock.calls[0];
    const content = JSON.parse(options.body).messages[0].content;
    expect(content).toContain('"autoscaling"');
    expect(content).not.toContain('"id": "test-design"');
  });

  it("omite a seção do enunciado sem lançar erro quando o brief é vazio", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: "Feedback qualquer." } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      evaluateDesign(design, metrics, "", { rps: 100, writePercent: 10 }),
    ).resolves.toBe("Feedback qualquer.");

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.messages[0].content).toContain("Nenhum enunciado informado.");
  });

  it("oferece pelo menos os desafios de URL shortener e feed de notícias", () => {
    expect(CHALLENGES).toHaveLength(2);
    expect(CHALLENGES.map((challenge) => challenge.brief)).toEqual([
      "Encurtador de URLs. Suportar 10.000 RPS.",
      "Feed de notícias social. Suportar 50.000 leituras por segundo.",
    ]);
  });

  it("não inclui a palavra 'entrevista' nem o desafio serializado como JSON no prompt", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: "Feedback qualquer." } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const challenge = CHALLENGES[0];
    await evaluateDesign(design, metrics, challenge.brief, { rps: 100, writePercent: 10 });

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.messages[0].content.toLowerCase()).not.toContain("entrevista");
    expect(body.messages[0].content).not.toContain(JSON.stringify(challenge, null, 2));
  });

  it("não vaza o brief do design no JSON da arquitetura, para não contradizer o enunciado", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: "Feedback qualquer." } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const stale = {
      ...design,
      brief: "Sistema de reserva de hotéis",
      challengeId: "url-shortener",
    };
    await evaluateDesign(stale, metrics, CHALLENGES[0].brief, { rps: 100, writePercent: 10 });

    const [, options] = fetchMock.mock.calls[0];
    const content = JSON.parse(options.body).messages[0].content;
    expect(content).not.toContain("Sistema de reserva de hotéis");
    expect(content).toContain(CHALLENGES[0].brief);
  });

  it("AD-022: não inclui o texto de avaliações anteriores do histórico no prompt, mesmo quando o design já as carrega", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: "Feedback qualquer." } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const designWithHistory: Design = {
      ...design,
      evaluations: [
        {
          text: "TEXTO-DA-AVALIACAO-ANTERIOR-QUE-NAO-DEVE-VAZAR",
          createdAt: "2026-07-20T10:00:00.000Z",
          rps: 100,
          writePercent: 10,
          model: "openai/gpt-5.2",
          metrics: { successRatio: 0.62, e2eLatencyMs: 80, totalRps: 100 },
        },
      ],
    };

    await evaluateDesign(designWithHistory, metrics, CHALLENGES[0].brief, {
      rps: 100,
      writePercent: 10,
    });

    const [, options] = fetchMock.mock.calls[0];
    const content = JSON.parse(options.body).messages[0].content;
    expect(content).not.toContain("TEXTO-DA-AVALIACAO-ANTERIOR-QUE-NAO-DEVE-VAZAR");
  });

  it("mapeia chave inválida para mensagem clara", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({
        error: { message: "User not found." },
      }),
    }));

    await expect(evaluateDesign(design, metrics, "")).rejects.toThrow(
      "Chave da API OpenRouter inválida",
    );
  });

  it("mapeia falha de rede para mensagem clara", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    await expect(evaluateDesign(design, metrics, "")).rejects.toThrow(
      "Não foi possível conectar a API OpenRouter",
    );
  });

  it("mapeia timeout de 60 segundos para mensagem clara", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError")),
    );

    await expect(evaluateDesign(design, metrics, "")).rejects.toThrow(
      "A avaliação excedeu o tempo limite de 60 segundos",
    );
  });
});
