const API_KEY_STORAGE_KEY = "openrouter-api-key";
const MODEL_STORAGE_KEY = "openrouter-model";

export const DEFAULT_OPENROUTER_MODEL = "~openai/gpt-latest";

export const CUSTOM_MODEL_ID = "custom";

export interface ModelPreset {
  label: string;
  model: string;
}

export const MODEL_PRESETS: readonly ModelPreset[] = [
  { label: "GPT mini (OpenAI)", model: "~openai/gpt-mini-latest" },
  { label: "Gemini Flash (Google)", model: "~google/gemini-flash-latest" },
  { label: "Claude Haiku (Anthropic)", model: "~anthropic/claude-haiku-latest" },
];

export function getOpenRouterApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function getOpenRouterModel(): string {
  return localStorage.getItem(MODEL_STORAGE_KEY) ?? DEFAULT_OPENROUTER_MODEL;
}

export function saveOpenRouterSettings(apiKey: string, model: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
  localStorage.setItem(MODEL_STORAGE_KEY, model);
}
