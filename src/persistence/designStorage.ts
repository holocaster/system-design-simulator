import {
  canConnect,
  COMPONENT_TYPES,
  EVALUATION_HISTORY_LIMIT,
  isValidAutoscaling,
  PARAM_LIMITS,
  REPLICABLE_TYPES,
} from "../engine/catalog";
import { BRIEF_MAX_LENGTH } from "../evaluation/challenges";
import type {
  ComponentParams,
  ComponentType,
  Design,
  DesignEdge,
  DesignNode,
  EvaluationEntry,
} from "../engine/types";

const STORAGE_KEY = "system-design-simulator:designs";

export type PersistenceResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function success<T>(value: T): PersistenceResult<T> {
  return { ok: true, value };
}

function failure<T>(error: string): PersistenceResult<T> {
  return { ok: false, error };
}

function getStorage(storage?: Storage): Storage {
  return storage ?? window.localStorage;
}

function readSavedDesigns(storage?: Storage): Record<string, Design> {
  const text = getStorage(storage).getItem(STORAGE_KEY);
  if (text === null) return {};
  const value: unknown = JSON.parse(text);
  if (!isRecord(value)) throw new Error("invalid saved designs");
  return value as Record<string, Design>;
}

export interface SavedDesign {
  id: string;
  name: string;
}

export function saveDesign(
  design: Design,
  replaceConflictOrStorage: boolean | Storage = false,
  storage?: Storage,
): PersistenceResult<void> {
  try {
    const replaceConflict = typeof replaceConflictOrStorage === "boolean" ? replaceConflictOrStorage : false;
    const targetStorage = typeof replaceConflictOrStorage === "boolean" ? storage : replaceConflictOrStorage;
    const name = design.name?.trim();
    if (!isValidDesignName(name)) return failure("Nome do design inválido");
    const designs = readSavedDesigns(targetStorage);
    const conflict = Object.values(designs).find((item) =>
      item.id !== design.id && sameDesignName(item.name, name),
    );
    if (conflict && !replaceConflict) return failure("Já existe outro design com esse nome");
    if (conflict) delete designs[conflict.id];
    designs[design.id] = { ...design, name };
    getStorage(targetStorage).setItem(STORAGE_KEY, JSON.stringify(designs));
    return success(undefined);
  } catch {
    return failure("Não foi possível salvar o design no armazenamento local");
  }
}

export function listDesigns(storage?: Storage): PersistenceResult<SavedDesign[]> {
  try {
    return success(Object.values(readSavedDesigns(storage))
      .filter((design) => isValidDesignName(design.name))
      .map((design) => ({ id: design.id, name: design.name! }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
  } catch {
    return failure("Não foi possível listar os designs salvos");
  }
}

export function loadDesign(id: string, storage?: Storage): PersistenceResult<Design | null> {
  try {
    const design = readSavedDesigns(storage)[id];
    return success(design === undefined ? null : normalizeDesign(design));
  } catch {
    return failure("Não foi possível carregar o design");
  }
}

export function deleteDesign(id: string, storage?: Storage): PersistenceResult<void> {
  try {
    const designs = readSavedDesigns(storage);
    delete designs[id];
    getStorage(storage).setItem(STORAGE_KEY, JSON.stringify(designs));
    return success(undefined);
  } catch {
    return failure("Não foi possível excluir o design");
  }
}

export function renameDesign(id: string, name: string, replaceConflict = false, storage?: Storage): PersistenceResult<void> {
  try {
    const trimmedName = name.trim();
    if (!isValidDesignName(trimmedName)) return failure("Nome do design inválido");
    const designs = readSavedDesigns(storage);
    const design = designs[id];
    if (!design) return failure("Design salvo não encontrado");
    const conflict = Object.values(designs).find((item) => item.id !== id && sameDesignName(item.name, trimmedName));
    if (conflict && !replaceConflict) return failure("Já existe outro design com esse nome");
    if (conflict) delete designs[conflict.id];
    designs[id] = { ...design, name: trimmedName };
    getStorage(storage).setItem(STORAGE_KEY, JSON.stringify(designs));
    return success(undefined);
  } catch {
    return failure("Não foi possível renomear o design");
  }
}

export function exportJson(design: Design): string {
  return JSON.stringify(design, null, 2);
}

export function importJson(text: string): PersistenceResult<Design> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return failure("JSON inválido");
  }

  const validationError = validateDesign(value);
  if (validationError !== null) return failure(validationError);
  return success(normalizeDesign(value as Design));
}

function normalizeDesign(design: Design): Design {
  const evaluations = sanitizeEvaluations(design.evaluations);
  const nodes = design.nodes.map(sanitizeNode);
  if (evaluations === undefined) {
    const { evaluations: _discarded, ...rest } = design;
    return { ...rest, nodes };
  }
  return { ...design, nodes, evaluations };
}

function sanitizeNode(node: DesignNode): DesignNode {
  const { autoscaling } = node.params;
  if (autoscaling === undefined) return node;
  if (isValidAutoscaling(autoscaling) && REPLICABLE_TYPES.includes(node.type)) return node;
  const { autoscaling: _discarded, ...params } = node.params;
  return { ...node, params };
}

function sanitizeEvaluations(value: unknown): EvaluationEntry[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const entries = value.filter(isEvaluationEntry).slice(0, EVALUATION_HISTORY_LIMIT);
  return entries.length > 0 ? entries : undefined;
}

function isEvaluationEntry(value: unknown): value is EvaluationEntry {
  if (!isRecord(value)) return false;
  if (typeof value.text !== "string" || value.text.length === 0) return false;
  if (typeof value.createdAt !== "string" || Number.isNaN(Date.parse(value.createdAt))) return false;
  if (!isFiniteNumber(value.rps) || !isFiniteNumber(value.writePercent)) return false;
  if (typeof value.model !== "string") return false;
  if (value.metrics === undefined) return true;

  return (
    isRecord(value.metrics) &&
    isFiniteNumber(value.metrics.successRatio) &&
    isFiniteNumber(value.metrics.e2eLatencyMs) &&
    isFiniteNumber(value.metrics.totalRps)
  );
}

function validateDesign(value: unknown): string | null {
  if (!isRecord(value) || value.schema !== 1) return "Schema desconhecido";
  if (typeof value.id !== "string" || value.id.length === 0) return "Identidade inválida";
  if (value.name !== undefined && !isValidDesignName(value.name)) return "Nome do design inválido";
  if (!Array.isArray(value.nodes) || !Array.isArray(value.edges)) return "Estrutura inválida";
  if (value.brief !== undefined) {
    if (typeof value.brief !== "string" || value.brief.length > BRIEF_MAX_LENGTH) {
      return "Brief inválido";
    }
  }
  if (value.challengeId !== undefined && typeof value.challengeId !== "string") {
    return "Identificador de desafio inválido";
  }

  for (const node of value.nodes) {
    const error = validateNode(node);
    if (error !== null) return error;
  }

  const nodes = value.nodes as DesignNode[];
  for (const edge of value.edges) {
    const error = validateEdge(edge, nodes);
    if (error !== null) return error;
  }

  return null;
}

function isValidDesignName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 1 && value.trim().length <= 40;
}

function sameDesignName(left: string | undefined, right: string): boolean {
  return left?.trim().localeCompare(right.trim(), "pt-BR", { sensitivity: "accent" }) === 0;
}

function validateNode(value: unknown): string | null {
  if (!isRecord(value) || typeof value.id !== "string") return "Nó inválido";
  if (!isComponentType(value.type)) return "Tipo de componente inválido";
  if (value.tech !== undefined && typeof value.tech !== "string") return "Tecnologia inválida";
  if (value.name !== undefined) {
    if (typeof value.name !== "string" || value.name.trim().length === 0 || value.name.length > 40) {
      return "Nome de componente inválido";
    }
  }
  if (
    !isRecord(value.position) ||
    !isFiniteNumber(value.position.x) ||
    !isFiniteNumber(value.position.y)
  ) {
    return "Posição de componente inválida";
  }
  if (!isRecord(value.params)) return "Parâmetros inválidos";

  const params = value.params as Partial<ComponentParams>;
  for (const key of ["capacity", "baseLatencyMs", "errorRate"] as const) {
    if (!isParamWithinLimits(key, params[key])) return "Parâmetro fora dos limites";
  }
  for (const key of ["hitRatio", "bufferSize", "replicas", "shards"] as const) {
    if (params[key] !== undefined && !isParamWithinLimits(key, params[key])) {
      return "Parâmetro fora dos limites";
    }
  }
  if (params.autoscaling !== undefined) {
    if (!isValidAutoscaling(params.autoscaling)) return "Configuração de autoscaling inválida";
    if (!REPLICABLE_TYPES.includes(value.type as ComponentType)) {
      return "Configuração de autoscaling inválida";
    }
  }
  return null;
}

function validateEdge(value: unknown, nodes: DesignNode[]): string | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.source !== "string" ||
    typeof value.target !== "string"
  ) {
    return "Conexão inválida";
  }

  const edge = value as unknown as DesignEdge;
  const source = nodes.find((node) => node.id === edge.source);
  const target = nodes.find((node) => node.id === edge.target);
  if (!source || !target || !canConnect(source.type, target.type)) return "Conexão inválida";
  return null;
}

function isParamWithinLimits(
  key: keyof typeof PARAM_LIMITS,
  value: unknown
): value is number {
  const limits = PARAM_LIMITS[key];
  const requiresInteger = key === "replicas" || key === "shards";
  return (
    isFiniteNumber(value) &&
    value >= limits.min &&
    value <= limits.max &&
    (!requiresInteger || Number.isInteger(value))
  );
}

function isComponentType(value: unknown): value is ComponentType {
  return typeof value === "string" && COMPONENT_TYPES.includes(value as ComponentType);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
