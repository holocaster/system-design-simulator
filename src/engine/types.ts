import type { Flow } from "./flow";

export type ComponentType =
  | "client"
  | "cdn"
  | "loadbalancer"
  | "gateway"
  | "service"
  | "cache"
  | "sql"
  | "nosql"
  | "queue"
  | "worker"
  | "storage";

export interface AutoscalingConfig {
  minReplicas: number;
  maxReplicas: number;
  targetUtilization: number;
}

export interface ComponentParams {
  capacity: number;
  baseLatencyMs: number;
  errorRate: number;
  hitRatio?: number;
  bufferSize?: number;
  replicas?: number;
  shards?: number;
  autoscaling?: AutoscalingConfig;
}

export interface DesignNode {
  id: string;
  type: ComponentType;
  tech?: string;
  name?: string;
  position: { x: number; y: number };
  params: ComponentParams;
}

export interface DesignEdge {
  id: string;
  source: string;
  target: string;
}

export interface EvaluationEntry {
  text: string;
  createdAt: string;
  rps: number;
  writePercent: number;
  model: string;
  metrics?: SimState["global"];
}

export interface Design {
  schema: 1;
  id: string;
  name?: string;
  challengeId?: string;
  brief?: string;
  nodes: DesignNode[];
  edges: DesignEdge[];
  evaluations?: EvaluationEntry[];
}

export type HealthState = "healthy" | "degraded" | "overloaded" | "down";

export interface NodeMetrics {
  incomingRps: number;
  processedRps: number;
  successRps: number;
  errorRps: number;
  effectiveErrorRps?: number;
  utilization: number;
  effectiveLatencyMs: number;
  state: HealthState;
  queueDepth?: number;
  overloadTicks: number;
  restartTicks: number;
  scaleDownTicks: number;
  desiredReplicas: number;
  readyReplicas: number;
  totalReplicas: number;
  flows: { incoming: Flow; success: Flow; error: Flow };
  readUtilization?: number;
  writeUtilization?: number;
  queueDepthFlow?: Flow;
}

export interface SimState {
  perNode: Record<string, NodeMetrics>;
  global: { successRatio: number; e2eLatencyMs: number; totalRps: number };
}
