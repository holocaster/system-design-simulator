import type { AutoscalingConfig, ComponentParams, ComponentType } from "./types";

export interface TechPreset {
  id: string;
  label: string;
  capacity: number;
  baseLatencyMs: number;
}

const COMPUTE_PRESETS: TechPreset[] = [
  { id: "spring-mvc", label: "Spring MVC", capacity: 500, baseLatencyMs: 20 },
  { id: "dotnet", label: ".NET", capacity: 500, baseLatencyMs: 20 },
  { id: "quarkus-native", label: "Quarkus native", capacity: 520, baseLatencyMs: 19 },
  { id: "quarkus-jvm", label: "Quarkus JVM", capacity: 650, baseLatencyMs: 17 },
  { id: "nodejs", label: "Node.js", capacity: 1_500, baseLatencyMs: 15 },
  { id: "spring-webflux", label: "Spring WebFlux", capacity: 2_000, baseLatencyMs: 15 },
  { id: "go", label: "Go", capacity: 3_000, baseLatencyMs: 10 },
];

export const TECH_PRESETS: Partial<Record<ComponentType, TechPreset[]>> = {
  queue: [
    { id: "sqs-fifo", label: "SQS FIFO", capacity: 3_000, baseLatencyMs: 30 },
    { id: "sqs-standard", label: "SQS Standard", capacity: 30_000, baseLatencyMs: 20 },
    { id: "rabbitmq", label: "RabbitMQ", capacity: 40_000, baseLatencyMs: 5 },
    { id: "kafka", label: "Kafka", capacity: 200_000, baseLatencyMs: 5 },
  ],
  nosql: [
    { id: "dynamodb", label: "DynamoDB", capacity: 8_000, baseLatencyMs: 10 },
    { id: "mongodb", label: "MongoDB", capacity: 10_000, baseLatencyMs: 5 },
    { id: "cassandra", label: "Cassandra", capacity: 30_000, baseLatencyMs: 5 },
  ],
  sql: [
    { id: "postgresql", label: "PostgreSQL", capacity: 1_500, baseLatencyMs: 10 },
    { id: "mysql", label: "MySQL", capacity: 2_000, baseLatencyMs: 10 },
    { id: "aurora", label: "Aurora", capacity: 5_000, baseLatencyMs: 8 },
  ],
  service: COMPUTE_PRESETS,
  worker: COMPUTE_PRESETS,
};

export function techPresetsFor(type: ComponentType): TechPreset[] {
  return TECH_PRESETS[type] ?? [];
}

export function findTechPreset(type: ComponentType, techId: string): TechPreset | undefined {
  return techPresetsFor(type).find((preset) => preset.id === techId);
}

export function seedTechParams(
  type: ComponentType,
  tech: string | undefined,
  params: ComponentParams
): { tech?: string; params: ComponentParams } {
  const preset = tech ? findTechPreset(type, tech) : undefined;
  if (!preset) return { tech: undefined, params };
  return {
    tech,
    params: { ...params, capacity: preset.capacity, baseLatencyMs: preset.baseLatencyMs },
  };
}

export const COMPONENT_TYPES: ComponentType[] = [
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
];

export type ComponentCategory = "Entrada" | "Computação" | "Dados" | "Assíncrono";

export const COMPONENT_CATEGORIES: ComponentCategory[] = ["Entrada", "Computação", "Dados", "Assíncrono"];

export const COMPONENT_META: Record<
  ComponentType,
  { label: string; sigla: string; category: ComponentCategory }
> = {
  client: { label: "Cliente", sigla: "CLI", category: "Entrada" },
  cdn: { label: "CDN", sigla: "CDN", category: "Entrada" },
  loadbalancer: { label: "Load Balancer", sigla: "LB", category: "Entrada" },
  gateway: { label: "API Gateway", sigla: "GW", category: "Entrada" },
  service: { label: "Service", sigla: "SVC", category: "Computação" },
  cache: { label: "Cache", sigla: "CH", category: "Dados" },
  sql: { label: "Banco SQL", sigla: "SQL", category: "Dados" },
  nosql: { label: "Banco NoSQL", sigla: "NSQ", category: "Dados" },
  queue: { label: "Fila", sigla: "MQ", category: "Assíncrono" },
  worker: { label: "Worker", sigla: "WRK", category: "Assíncrono" },
  storage: { label: "Object Storage", sigla: "S3", category: "Dados" },
};

export const DEFAULT_PARAMS: Record<ComponentType, ComponentParams> = {
  client: { capacity: 1_000_000, baseLatencyMs: 0, errorRate: 0 },
  cdn: { capacity: 100_000, baseLatencyMs: 10, errorRate: 0, hitRatio: 0.9 },
  loadbalancer: { capacity: 50_000, baseLatencyMs: 2, errorRate: 0 },
  gateway: { capacity: 20_000, baseLatencyMs: 5, errorRate: 0 },
  service: { capacity: 500, baseLatencyMs: 20, errorRate: 0, replicas: 1 },
  cache: { capacity: 50_000, baseLatencyMs: 1, errorRate: 0, hitRatio: 0.8, replicas: 1 },
  sql: { capacity: 1_500, baseLatencyMs: 10, errorRate: 0, replicas: 1 },
  nosql: { capacity: 10_000, baseLatencyMs: 5, errorRate: 0, replicas: 1, shards: 1 },
  queue: { capacity: 10_000, baseLatencyMs: 1, errorRate: 0, bufferSize: 100_000 },
  worker: { capacity: 500, baseLatencyMs: 20, errorRate: 0, replicas: 1 },
  storage: { capacity: 5_000, baseLatencyMs: 30, errorRate: 0 },
};

export const PARAM_LIMITS = {
  capacity: { min: 1, max: 1_000_000 },
  baseLatencyMs: { min: 0, max: 10_000 },
  errorRate: { min: 0, max: 1 },
  hitRatio: { min: 0, max: 1 },
  bufferSize: { min: 1, max: 1_000_000 },
  replicas: { min: 1, max: 20 },
  shards: { min: 1, max: 20 },
} as const;

export const REPLICABLE_TYPES: ComponentType[] = ["service", "worker", "cache", "sql", "nosql"];

export const DEFAULT_AUTOSCALING: AutoscalingConfig = {
  minReplicas: 1,
  maxReplicas: 10,
  targetUtilization: 0.6,
};

export const AUTOSCALING_LIMITS = {
  minReplicas: PARAM_LIMITS.replicas,
  maxReplicas: PARAM_LIMITS.replicas,
  targetUtilization: { min: 0.1, max: 1 },
} as const;

export function hasAutoscalingShape(value: unknown): value is AutoscalingConfig {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const config = value as Record<string, unknown>;
  for (const key of ["minReplicas", "maxReplicas", "targetUtilization"] as const) {
    const limits = AUTOSCALING_LIMITS[key];
    const field = config[key];
    if (typeof field !== "number" || !Number.isFinite(field)) return false;
    if (field < limits.min || field > limits.max) return false;
    if (key !== "targetUtilization" && !Number.isInteger(field)) return false;
  }
  return true;
}

export function isValidAutoscaling(value: unknown): value is AutoscalingConfig {
  return hasAutoscalingShape(value) && value.minReplicas <= value.maxReplicas;
}

export const EVALUATION_HISTORY_LIMIT = 10;

const CONNECTION_MATRIX: Record<ComponentType, ComponentType[]> = {
  client: ["cdn", "loadbalancer", "gateway", "service"],
  cdn: ["loadbalancer", "gateway", "service"],
  loadbalancer: ["gateway", "service"],
  gateway: ["loadbalancer", "service"],
  service: ["service", "cache", "sql", "nosql", "queue", "storage"],
  cache: ["sql", "nosql", "storage"],
  queue: ["worker"],
  worker: ["service", "cache", "sql", "nosql", "queue", "storage"],
  sql: [],
  nosql: [],
  storage: [],
};

export function canConnect(source: ComponentType, target: ComponentType): boolean {
  return CONNECTION_MATRIX[source].includes(target);
}
