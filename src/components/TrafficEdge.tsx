import { useEffect, useState } from "react";
import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";
import type { NodeMetrics } from "../engine/types";
import { useAppStore } from "../store/useAppStore";

interface TrafficSnapshot {
  source: NodeMetrics | null;
  target: NodeMetrics | null;
}

function useTrafficSnapshot(sourceId: string, targetId: string) {
  const running = useAppStore((state) => state.running);
  const [snapshot, setSnapshot] = useState<TrafficSnapshot>({ source: null, target: null });

  useEffect(() => {
    if (!running) {
      setSnapshot({ source: null, target: null });
      return;
    }

    const update = () => {
      const simState = useAppStore.getState().simState;
      setSnapshot({
        source: simState?.perNode[sourceId] ?? null,
        target: simState?.perNode[targetId] ?? null,
      });
    };
    update();
    const intervalId = window.setInterval(update, 250);
    return () => window.clearInterval(intervalId);
  }, [running, sourceId, targetId]);

  return snapshot;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

function edgeFlow(sourceId: string, targetId: string, snapshot: TrafficSnapshot) {
  const { nodes, edges, simState } = useAppStore.getState();
  const sourceNode = nodes.find((node) => node.id === sourceId);
  if (!sourceNode || !snapshot.source || !snapshot.target || snapshot.source.state === "down") {
    return 0;
  }

  if (sourceNode.type === "loadbalancer") {
    const healthyTargets = edges
      .filter((edge) => edge.source === sourceId)
      .filter((edge) => simState?.perNode[edge.target]?.state !== "down");
    if (snapshot.target.state === "down" || healthyTargets.length === 0) return 0;
    return snapshot.source.successRps / healthyTargets.length;
  }

  if (sourceNode.type === "cache" || sourceNode.type === "cdn") {
    return snapshot.source.successRps * (1 - (sourceNode.data.params.hitRatio ?? 0));
  }

  if (sourceNode.type === "queue") {
    const incomingEdges = edges.filter((edge) => edge.target === targetId).length;
    return snapshot.target.incomingRps / Math.max(incomingEdges, 1);
  }

  return snapshot.source.successRps;
}

export function TrafficEdge({
  selected,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const snapshot = useTrafficSnapshot(source, target);
  const flow = edgeFlow(source, target, snapshot);
  const reducedMotion = usePrefersReducedMotion();
  const hasErrors =
    snapshot.target !== null &&
    (snapshot.target.state === "overloaded" ||
      snapshot.target.state === "down" ||
      snapshot.target.errorRps > 0);
  const color = hasErrors ? "var(--color-health-bad)" : "var(--color-accent)";
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const density = flow > 0 ? Math.min(5, Math.max(1, Math.ceil(Math.log10(flow + 1)))) : 0;
  const duration = Math.max(0.6, 2.2 - Math.log10(flow + 1) * 0.3);

  return (
    <>
      <BaseEdge
        path={path}
        interactionWidth={28}
        style={{ stroke: color, strokeWidth: selected ? 3 : 1.5 }}
      />
      {!reducedMotion &&
        Array.from({ length: density }, (_, index) => (
          <circle key={index} r="3" fill={color}>
            <animateMotion
              path={path}
              begin={`${(-index * duration) / density}s`}
              dur={`${duration}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
    </>
  );
}
