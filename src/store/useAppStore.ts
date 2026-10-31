import { create } from "zustand";
import type { Edge, Node } from "@xyflow/react";
import { COMPONENT_META, DEFAULT_PARAMS, EVALUATION_HISTORY_LIMIT, PARAM_LIMITS, REPLICABLE_TYPES, findTechPreset, hasAutoscalingShape, seedTechParams } from "../engine/catalog";
import type { ComponentParams, ComponentType, Design, EvaluationEntry, SimState } from "../engine/types";
import { CHALLENGES } from "../evaluation/challenges";

export type AppNodeData = { name: string; tech?: string; params: ComponentParams };
export type AppNode = Node<AppNodeData, ComponentType>;

export const START_SIM_ERROR =
  "Adicione um nó Cliente conectado a pelo menos um componente para iniciar a simulação";

export const NAME_MAX_LENGTH = 40;

export const AUTOSCALING_ERROR = "Configuração de autoscaling inválida";

export const AUTOSCALING_RANGE_ERROR = "Piso deve ser menor ou igual ao teto";

export const AUTOSCALING_TYPE_ERROR = "Este tipo de componente não suporta autoscaling";

const initialDesignId = crypto.randomUUID();

function emptyDesign(id: string = crypto.randomUUID()): Design {
  return {
    schema: 1,
    id,
    nodes: [],
    edges: [],
    brief: "",
    challengeId: CHALLENGES[0].id,
    evaluations: [],
  };
}

function designSnapshot(design: Design): string {
  return JSON.stringify({
    schema: design.schema,
    id: design.id,
    name: design.name,
    challengeId: design.challengeId,
    brief: design.brief,
    nodes: design.nodes,
    edges: design.edges,
    evaluations: design.evaluations,
  });
}

export function currentDesign(): Design {
  const { designId, designName, nodes, edges, brief, challengeId, evaluations } = useAppStore.getState();
  return {
    schema: 1,
    id: designId,
    name: designName,
    brief,
    challengeId,
    evaluations,
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      tech: node.data.tech,
      name: node.data.name,
      position: node.position,
      params: { ...node.data.params },
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    })),
  };
}

export function nextName(type: ComponentType, nodes: AppNode[]): string {
  let max = 0;
  for (const node of nodes) {
    if (node.type !== type) continue;
    const match = /(\d+)\s*$/.exec(node.data.name);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `${COMPONENT_META[type].label} ${max + 1}`;
}

interface AppState {
  designId: string;
  designName?: string;
  nodes: AppNode[];
  edges: Edge[];
  rps: number;
  writePercent: number;
  brief: string;
  challengeId: string;
  running: boolean;
  simState: SimState | null;
  statusMessage: string | null;
  evaluations: EvaluationEntry[];
  loadedRevision: number;
  baseline: Design;
  forceUnsaved: boolean;
  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  setStatusMessage: (message: string | null) => void;
  addNode: (type: ComponentType, position: { x: number; y: number }) => void;
  removeNode: (id: string) => void;
  renameNode: (id: string, name: string) => string | null;
  applyTech: (id: string, tech: string | undefined) => void;
  updateParams: (id: string, partial: Partial<ComponentParams>) => string | null;
  setRps: (rps: number) => void;
  setWritePercent: (writePercent: number) => void;
  setBrief: (brief: string) => void;
  setChallengeId: (id: string) => void;
  setDesignName: (name: string) => void;
  renameActiveDesign: (name: string) => void;
  markSaved: () => void;
  hasUnsavedChanges: () => boolean;
  createNewDesign: () => void;
  markUnpersisted: () => void;
  startSim: () => string | null;
  stopSim: () => void;
  applyTick: (simState: SimState) => void;
  loadDesign: (design: Design) => void;
  importDesign: (design: Design) => void;
  addEvaluation: (
    text: string,
    model: string,
    metrics?: EvaluationEntry["metrics"],
  ) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  designId: initialDesignId,
  designName: undefined,
  nodes: [],
  edges: [],
  rps: 100,
  writePercent: 20,
  brief: "",
  challengeId: CHALLENGES[0].id,
  running: false,
  simState: null,
  statusMessage: null,
  evaluations: [],
  loadedRevision: 0,
  baseline: emptyDesign(initialDesignId),
  forceUnsaved: false,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setStatusMessage: (statusMessage) => set({ statusMessage }),

  addNode: (type, position) =>
    set((state) => ({
      nodes: [
        ...state.nodes,
        {
          id: crypto.randomUUID(),
          type,
          position,
          data: { name: nextName(type, state.nodes), params: { ...DEFAULT_PARAMS[type] } },
        },
      ],
    })),

  removeNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
    })),

  renameNode: (id, name) => {
    const trimmed = name.trim();
    if (trimmed.length === 0) return "Nome não pode ser vazio";
    if (trimmed.length > NAME_MAX_LENGTH) {
      return `Nome deve ter no máximo ${NAME_MAX_LENGTH} caracteres`;
    }
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, name: trimmed } } : n
      ),
    }));
    return null;
  },

  applyTech: (id, tech) => {
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== id || !n.type) return n;
        const preset = tech ? findTechPreset(n.type, tech) : undefined;
        if (tech && !preset) return n;
        const params = preset
          ? { ...n.data.params, capacity: preset.capacity, baseLatencyMs: preset.baseLatencyMs }
          : n.data.params;
        return { ...n, data: { ...n.data, tech: preset ? tech : undefined, params } };
      }),
    }));
  },

  updateParams: (id, partial) => {
    for (const [key, value] of Object.entries(partial)) {
      if (key === "autoscaling") {
        if (value === undefined) continue;
        if (!hasAutoscalingShape(value)) return AUTOSCALING_ERROR;
        if (value.minReplicas > value.maxReplicas) return AUTOSCALING_RANGE_ERROR;
        const node = get().nodes.find((n) => n.id === id);
        if (node?.type && !REPLICABLE_TYPES.includes(node.type)) return AUTOSCALING_TYPE_ERROR;
        continue;
      }
      const limits = PARAM_LIMITS[key as keyof typeof PARAM_LIMITS];
      if (!limits) return `Parâmetro desconhecido: ${key}`;
      if (typeof value !== "number" || Number.isNaN(value) || value < limits.min || value > limits.max) {
        return `Valor deve estar entre ${limits.min} e ${limits.max}`;
      }
      if ((key === "replicas" || key === "shards") && !Number.isInteger(value)) {
        return "Valor deve ser um número inteiro";
      }
    }
    const clearsTech = "capacity" in partial || "baseLatencyMs" in partial;
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== id) return n;
        const params = { ...n.data.params, ...partial };
        if (params.autoscaling === undefined) delete params.autoscaling;
        return {
          ...n,
          data: { ...n.data, ...(clearsTech ? { tech: undefined } : {}), params },
        };
      }),
    }));
    return null;
  },

  setRps: (rps) => set({ rps: Math.min(Math.max(rps, 1), 100_000) }),
  setWritePercent: (writePercent) =>
    set({ writePercent: Math.min(Math.max(writePercent, 0), 100) }),
  setBrief: (brief) => set({ brief }),
  setChallengeId: (challengeId) => set({ challengeId }),
  setDesignName: (designName) => set({ designName }),
  renameActiveDesign: (designName) => set((state) => ({
    designName,
    baseline: { ...state.baseline, name: designName },
  })),
  markSaved: () => set({ baseline: currentDesign(), forceUnsaved: false }),
  hasUnsavedChanges: () => get().forceUnsaved || designSnapshot(currentDesign()) !== designSnapshot(get().baseline),
  createNewDesign: () => {
    const design = emptyDesign();
    set({
      designId: design.id,
      designName: undefined,
      nodes: [],
      edges: [],
      brief: "",
      challengeId: CHALLENGES[0].id,
      evaluations: [],
      rps: 100,
      writePercent: 20,
      running: false,
      simState: null,
      baseline: design,
      forceUnsaved: false,
      loadedRevision: get().loadedRevision + 1,
    });
  },
  markUnpersisted: () => set((state) => ({
    baseline: { ...emptyDesign(state.designId), name: state.designName },
    forceUnsaved: true,
  })),

  startSim: () => {
    const { nodes, edges } = get();
    const hasConnectedClient = nodes.some(
      (n) => n.type === "client" && edges.some((e) => e.source === n.id)
    );
    if (!hasConnectedClient) return START_SIM_ERROR;
    set({ running: true });
    return null;
  },

  stopSim: () => set({ running: false, simState: null }),

  applyTick: (simState) => set({ simState }),

  addEvaluation: (text, model, metrics) => {
    const { rps, writePercent } = get();
    const entry: EvaluationEntry = {
      text,
      createdAt: new Date().toISOString(),
      rps,
      writePercent,
      model,
      metrics,
    };
    set((state) => ({
      evaluations: [entry, ...state.evaluations].slice(0, EVALUATION_HISTORY_LIMIT),
    }));
  },

  loadDesign: (design) =>
    set((state) => ({
      nodes: design.nodes.reduce<AppNode[]>((acc, n) => {
        const seeded = seedTechParams(n.type, n.tech, { ...n.params });
        acc.push({
          id: n.id,
          type: n.type,
          position: n.position,
          data: { name: n.name ?? nextName(n.type, acc), tech: seeded.tech, params: seeded.params },
        });
        return acc;
      }, []),
      edges: design.edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      brief: design.brief ?? "",
      challengeId: design.challengeId ?? CHALLENGES[0].id,
      designId: design.id,
      designName: design.name,
      running: false,
      simState: null,
      evaluations: design.evaluations ?? [],
      baseline: design,
      forceUnsaved: false,
      loadedRevision: state.loadedRevision + 1,
    })),

  importDesign: (design) => {
    get().loadDesign(design);
    get().markUnpersisted();
  },
}));
