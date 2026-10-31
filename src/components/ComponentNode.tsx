import { useEffect, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { COMPONENT_META, REPLICABLE_TYPES, findTechPreset } from "../engine/catalog";
import { diagnose } from "../engine/diagnose";
import type { ComponentType, HealthState, NodeMetrics } from "../engine/types";
import { useAppStore, type AppNode } from "../store/useAppStore";
import "./components.css";
import { STATE_COLORS } from "./healthColors";

const SINKS: ComponentType[] = ["sql", "nosql", "storage"];
const DATABASES: ComponentType[] = ["sql", "nosql"];

function useNodeMetrics(id: string) {
  const running = useAppStore((state) => state.running);
  const [metrics, setMetrics] = useState<NodeMetrics | null>(null);

  useEffect(() => {
    if (!running) {
      setMetrics(null);
      return;
    }

    const update = () => {
      setMetrics(useAppStore.getState().simState?.perNode[id] ?? null);
    };
    update();
    const intervalId = window.setInterval(update, 250);
    return () => window.clearInterval(intervalId);
  }, [id, running]);

  return metrics;
}

export function ComponentNode({ id, type, data }: NodeProps<AppNode>) {
  const meta = COMPONENT_META[type];
  const metrics = useNodeMetrics(id);
  const state: HealthState = metrics?.state ?? "healthy";
  const color = STATE_COLORS[state];
  const utilPercent = Math.round((metrics?.utilization ?? 0) * 100);
  const errorPercent =
    metrics && metrics.incomingRps > 0
      ? ((metrics.effectiveErrorRps ?? metrics.errorRps) / metrics.incomingRps) * 100
      : 0;
  const techLabel = data.tech ? findTechPreset(type, data.tech)?.label : undefined;
  const autoscaling = data.params.autoscaling;
  const configuredReplicas = data.params.replicas ?? 1;
  const initialDesired = autoscaling
    ? Math.min(Math.max(configuredReplicas, autoscaling.minReplicas), autoscaling.maxReplicas)
    : configuredReplicas;
  const desiredReplicas = metrics?.desiredReplicas ?? initialDesired;
  const readyReplicas = metrics?.readyReplicas ?? desiredReplicas;
  const hasPartialReplicas = metrics !== null && readyReplicas < desiredReplicas;
  const atAutoscalingMax = autoscaling !== undefined && desiredReplicas >= autoscaling.maxReplicas;
  const replicaCount = hasPartialReplicas
    ? `${readyReplicas}/${desiredReplicas}`
    : `x${desiredReplicas}`;
  const replicaLabel = `${replicaCount}${autoscaling ? " auto" : ""}${atAutoscalingMax ? " (max)" : ""}`;
  const diagnosis = metrics ? diagnose(type, metrics, data.params) : null;
  const [pinned, setPinned] = useState(false);

  return (
    <div className="component-node" style={{ borderColor: color }}>
      {type !== "client" && <Handle type="target" position={Position.Left} />}
      <div className="component-node-header">
        <span className="component-node-sigla" style={{ background: color }}>
          {meta.sigla}
        </span>
        <span className="component-node-label">{data.name}</span>
        {techLabel && <span className="component-node-tech">{techLabel}</span>}
        {diagnosis && (
          <button
            type="button"
            className="component-node-alert nodrag"
            style={{ color }}
            aria-label="Fixar diagnóstico"
            onClick={() => setPinned((value) => !value)}
          >
            !
          </button>
        )}
        {REPLICABLE_TYPES.includes(type) && (
          <span
            className={`replica-badge${hasPartialReplicas ? " replica-badge-alert" : ""}${atAutoscalingMax ? " replica-badge-max" : ""}`}
          >
            {replicaLabel}
          </span>
        )}
      </div>
      <div className="component-node-bar-track" aria-hidden="true">
        <div
          className="component-node-bar-fill"
          style={{ width: `${Math.min(100, utilPercent)}%`, background: color }}
        />
      </div>
      <div className="component-node-metrics">
        <span>Util {utilPercent}%</span>
        <span>RPS {Math.round(metrics?.processedRps ?? 0)}</span>
        <span>Lat {Math.round(metrics?.effectiveLatencyMs ?? 0)}ms</span>
        <span>Err {errorPercent.toFixed(1)}%</span>
        {DATABASES.includes(type) && (
          <span className="component-node-flow-metrics">
            W {Math.round((metrics?.writeUtilization ?? 0) * 100)}% | R {Math.round((metrics?.readUtilization ?? 0) * 100)}%
          </span>
        )}
      </div>
      {diagnosis && (
        <div
          className={`component-node-tooltip nodrag${pinned ? " pinned" : ""}`}
          style={{ borderColor: color }}
          role="tooltip"
        >
          {pinned && (
            <button
              type="button"
              className="component-node-tooltip-close nodrag"
              aria-label="Fechar diagnóstico"
              onClick={() => setPinned(false)}
            >
              ×
            </button>
          )}
          <span className="component-node-tooltip-cause">{diagnosis.cause}</span>
          <span className="component-node-tooltip-action">{diagnosis.action}</span>
        </div>
      )}
      {!SINKS.includes(type) && <Handle type="source" position={Position.Right} />}
    </div>
  );
}
