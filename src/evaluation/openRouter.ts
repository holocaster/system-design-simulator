import type { Design, SimState } from "../engine/types";
import { getOpenRouterApiKey, getOpenRouterModel } from "./apiKey";

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const EVALUATION_TIMEOUT_MS = 60_000;

interface SimulationLoad {
  rps: number;
  writePercent: number;
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: { content?: string };
    error?: { message?: string };
  }>;
  error?: { message?: string };
}

function buildPrompt(
  design: Design,
  metrics: SimState | null,
  brief: string,
  load?: SimulationLoad,
): string {
  const briefSection = brief.trim() || "Nenhum enunciado informado.";
  const architecture = { schema: design.schema, nodes: design.nodes, edges: design.edges };
  const loadSection = load
    ? `${load.rps} RPS, ${load.writePercent}% escritas`
    : "Carga não informada.";

  return `Avalie este system design contra os requisitos declarados abaixo.
Baseie a crítica no que o sistema precisa fazer, não em arquiteturas
de referência. Não cobre componentes que os requisitos não justificam.
Identifique pontos fortes, gargalos e melhorias concretas.
Responda em português, formatando em markdown (títulos, negrito, listas).

Design completo:
${JSON.stringify(architecture, null, 2)}

Métricas da última simulação:
${JSON.stringify(metrics, null, 2)}

Carga da simulação: ${loadSection}

Enunciado:
${briefSection}`;
}

export async function evaluateDesign(
  design: Design,
  metrics: SimState | null,
  brief: string,
  load?: SimulationLoad,
): Promise<string> {
  const apiKey = getOpenRouterApiKey();
  const model = getOpenRouterModel();
  if (!apiKey) throw new Error("Configure a chave da API OpenRouter antes de avaliar");

  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), EVALUATION_TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2_048,
        messages: [{ role: "user", content: buildPrompt(design, metrics, brief, load) }],
      }),
      signal: controller.signal,
    });
    const data = (await response.json()) as OpenRouterResponse;

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Chave da API OpenRouter inválida");
      }
      throw new Error(data.error?.message ?? "A API OpenRouter recusou a avaliação");
    }

    const choice = data.choices?.[0];
    if (choice?.error?.message) throw new Error(choice.error.message);

    const feedback = choice?.message?.content?.trim();
    if (!feedback) throw new Error("A API OpenRouter retornou uma resposta vazia");
    return feedback;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("A avaliação excedeu o tempo limite de 60 segundos");
    }
    if (error instanceof TypeError) {
      throw new Error("Não foi possível conectar a API OpenRouter");
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
