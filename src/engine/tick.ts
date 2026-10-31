import { addFlow, capFlow, flowTotal, scaleFlow, type Flow } from "./flow";
import { topoOrder } from "./graph";
import type { AutoscalingConfig, Design, HealthState, NodeMetrics, SimState } from "./types";

const DOWN_UTILIZATION = 1.5;
const DOWN_TICKS = 30;
const RESTART_TICKS = 30;
const SCALE_DOWN_TICKS = 100;

export interface TickLoad {
  rps: number;
  writeRatio: number;
}

const zeroFlow = (): Flow => ({ read: 0, write: 0 });

function subFlow(a: Flow, b: Flow): Flow {
  return { read: a.read - b.read, write: a.write - b.write };
}

function stateFromUtilization(utilization: number): HealthState {
  if (utilization < 0.7) return "healthy";
  if (utilization <= 1.0) return "degraded";
  return "overloaded";
}

function utilizationOf(load: number, capacity: number): number {
  if (capacity > 0) return load / capacity;
  return load > 0 ? Number.POSITIVE_INFINITY : 0;
}

function clampReplicas(value: number, autoscaling?: AutoscalingConfig): number {
  if (!autoscaling) return value;
  return Math.min(Math.max(value, autoscaling.minReplicas), autoscaling.maxReplicas);
}

function stepReplicas(
  total: number,
  prevReady: number,
  prevOverloadTicks: number,
  prevRestartTicks: number,
  utilization: number
): { ready: number; overloadTicks: number; restartTicks: number } {
  const boundedReady = Math.min(prevReady, total);
  const overloaded = boundedReady > 0 && utilization > DOWN_UTILIZATION;
  const overloadTicks = overloaded ? prevOverloadTicks + 1 : 0;
  const restartTicks = boundedReady < total ? prevRestartTicks + 1 : 0;

  if (overloadTicks >= DOWN_TICKS) {
    return { ready: boundedReady - 1, overloadTicks: 0, restartTicks: 0 };
  }
  if (restartTicks >= RESTART_TICKS) {
    return { ready: boundedReady + 1, overloadTicks, restartTicks: 0 };
  }
  return { ready: boundedReady, overloadTicks, restartTicks };
}

export function runTick(design: Design, load: TickLoad, prev?: SimState): SimState {
  const topo = topoOrder(design);
  if (!topo.ok) throw new Error(topo.error);

  const nodesById = new Map(design.nodes.map((n) => [n.id, n]));
  const targetsOf = new Map<string, string[]>();
  for (const n of design.nodes) targetsOf.set(n.id, []);
  for (const e of design.edges) targetsOf.get(e.source)?.push(e.target);

  const readyAtStart = (id: string) => {
    const node = nodesById.get(id)!;
    const initialReplicas = clampReplicas(node.params.replicas ?? 1, node.params.autoscaling);
    return prev?.perNode[id]?.readyReplicas ?? initialReplicas;
  };
  const wasDown = (id: string) => readyAtStart(id) === 0;

  const clientFlow: Flow = {
    read: load.rps * (1 - load.writeRatio),
    write: load.rps * load.writeRatio,
  };
  const incoming = new Map<string, Flow>();
  for (const n of design.nodes) {
    incoming.set(n.id, n.type === "client" ? { ...clientFlow } : zeroFlow());
  }

  const perNode: Record<string, NodeMetrics> = {};

  for (const id of topo.order) {
    const node = nodesById.get(id)!;
    const inc = incoming.get(id)!;
    const incTotal = flowTotal(inc);
    const prevM = prev?.perNode[id];
    const initialReplicas = clampReplicas(node.params.replicas ?? 1, node.params.autoscaling);
    const previousDesired =
      prevM?.desiredReplicas ?? prevM?.totalReplicas ?? initialReplicas;
    const totalReplicas = clampReplicas(previousDesired, node.params.autoscaling);
    const shards = node.params.shards ?? 1;
    const shardMultiplier = node.type === "nosql" ? shards : 1;
    const prevReadyReplicas = Math.min(prevM?.readyReplicas ?? initialReplicas, totalReplicas);
    const transitionUtilization =
      node.type === "sql" || node.type === "nosql"
        ? Math.max(
            utilizationOf(
              inc.read,
              node.params.capacity * shardMultiplier * prevReadyReplicas
            ),
            utilizationOf(inc.write, node.params.capacity * shardMultiplier)
          )
        : utilizationOf(incTotal, node.params.capacity * prevReadyReplicas);
    const replicaStep = stepReplicas(
      totalReplicas,
      prevReadyReplicas,
      prevM?.overloadTicks ?? 0,
      prevM?.restartTicks ?? 0,
      transitionUtilization
    );
    const readyReplicas = replicaStep.ready;
    let readCapacity: number | undefined;
    let writeCapacity: number | undefined;
    let readUtilization: number | undefined;
    let writeUtilization: number | undefined;
    let utilization: number;
    if (node.type === "sql" || node.type === "nosql") {
      readCapacity = node.params.capacity * shardMultiplier * readyReplicas;
      writeCapacity = node.params.capacity * shardMultiplier * (readyReplicas > 0 ? 1 : 0);
      readUtilization = utilizationOf(inc.read, readCapacity);
      writeUtilization = utilizationOf(inc.write, writeCapacity);
      utilization = Math.max(readUtilization, writeUtilization);
    } else {
      utilization = utilizationOf(incTotal, node.params.capacity * readyReplicas);
    }
    let desiredReplicas = totalReplicas;
    let scaleDownTicks = 0;
    if (node.params.autoscaling && readyReplicas > 0 && Number.isFinite(utilization)) {
      const recommendation = Math.min(
        Math.max(
          Math.ceil(
            (readyReplicas * utilization) / node.params.autoscaling.targetUtilization
          ),
          node.params.autoscaling.minReplicas
        ),
        node.params.autoscaling.maxReplicas
      );
      if (!prevM || recommendation > totalReplicas) {
        desiredReplicas = recommendation;
      } else if (recommendation < totalReplicas) {
        scaleDownTicks = (prevM?.scaleDownTicks ?? 0) + 1;
        if (scaleDownTicks >= SCALE_DOWN_TICKS) {
          desiredReplicas = recommendation;
          scaleDownTicks = 0;
        }
      }
    }
    const state: HealthState = readyReplicas === 0 ? "down" : stateFromUtilization(utilization);

    let processedF = zeroFlow();
    let successF = zeroFlow();
    let errorF = zeroFlow();
    let queueDepthFlow = prevM?.queueDepthFlow ?? {
      read: prevM?.queueDepth ?? 0,
      write: 0,
    };

    if (state === "down") {
      errorF = { ...inc };
    } else {
      processedF =
        readCapacity !== undefined && writeCapacity !== undefined
          ? {
              read: Math.min(inc.read, readCapacity),
              write: Math.min(inc.write, writeCapacity),
            }
          : capFlow(inc, node.params.capacity * readyReplicas);
      const overflowF = subFlow(inc, processedF);
      const baseErrorsF = scaleFlow(processedF, node.params.errorRate);
      const localSuccessF = subFlow(processedF, baseErrorsF);
      if (node.type === "queue") {
        const room = Math.max((node.params.bufferSize ?? 0) - flowTotal(queueDepthFlow), 0);
        const enqueuedF = capFlow(localSuccessF, room);
        queueDepthFlow = addFlow(queueDepthFlow, enqueuedF);
        successF = enqueuedF;
        errorF = addFlow(addFlow(overflowF, baseErrorsF), subFlow(localSuccessF, enqueuedF));
      } else {
        successF = localSuccessF;
        errorF = addFlow(overflowF, baseErrorsF);
      }
    }

    const outs = targetsOf.get(id)!;
    if (state !== "down" && outs.length > 0) {
      if (node.type === "loadbalancer") {
        const healthy = outs.filter((t) => !wasDown(t));
        for (const t of healthy) {
          incoming.set(t, addFlow(incoming.get(t)!, scaleFlow(successF, 1 / healthy.length)));
        }
      } else if (node.type === "cache" || node.type === "cdn") {
        const missF: Flow = {
          read: successF.read * (1 - (node.params.hitRatio ?? 0)),
          write: successF.write,
        };
        for (const t of outs) incoming.set(t, addFlow(incoming.get(t)!, missF));
      } else if (node.type === "queue") {
        const healthy = outs.filter((t) => !wasDown(t));
        const drainCapacity = healthy.reduce(
          (sum, t) => sum + nodesById.get(t)!.params.capacity * readyAtStart(t),
          0
        );
        const drainedF = capFlow(queueDepthFlow, drainCapacity);
        queueDepthFlow = subFlow(queueDepthFlow, drainedF);
        for (const t of healthy) {
          incoming.set(t, addFlow(incoming.get(t)!, scaleFlow(drainedF, 1 / healthy.length)));
        }
      } else {
        for (const t of outs) incoming.set(t, addFlow(incoming.get(t)!, successF));
      }
    }

    perNode[id] = {
      incomingRps: incTotal,
      processedRps: flowTotal(processedF),
      successRps: flowTotal(successF),
      errorRps: flowTotal(errorF),
      utilization,
      effectiveLatencyMs: 0,
      state,
      overloadTicks: replicaStep.overloadTicks,
      restartTicks: replicaStep.restartTicks,
      scaleDownTicks,
      desiredReplicas,
      readyReplicas,
      totalReplicas: desiredReplicas,
      flows: { incoming: inc, success: successF, error: errorF },
      ...(readUtilization !== undefined && writeUtilization !== undefined
        ? { readUtilization, writeUtilization }
        : {}),
      ...(node.type === "queue"
        ? { queueDepth: flowTotal(queueDepthFlow), queueDepthFlow }
        : {}),
    };
  }

  const ratio = new Map<string, number>();
  const latency = new Map<string, number>();

  for (const id of [...topo.order].reverse()) {
    const node = nodesById.get(id)!;
    const m = perNode[id];

    if (m.state === "down") {
      ratio.set(id, m.incomingRps > 0 ? 0 : 1);
      latency.set(id, 0);
      m.effectiveErrorRps = m.incomingRps;
      continue;
    }

    const u = m.utilization;
    const mult = u < 0.7 ? 1 : u >= 1 ? 5 : 1 + ((u - 0.7) / 0.3) * 4;
    const localLat = node.params.baseLatencyMs * mult;
    const localRatio = m.incomingRps > 0 ? m.successRps / m.incomingRps : 1;
    const outs = targetsOf.get(id)!;

    let dsRatio = 1;
    let dsLat = 0;
    if (node.type !== "queue" && outs.length > 0) {
      if (node.type === "loadbalancer") {
        const healthy = outs.filter((t) => perNode[t].state !== "down");
        if (healthy.length === 0) {
          dsRatio = 0;
        } else {
          dsRatio = healthy.reduce((s, t) => s + ratio.get(t)!, 0) / healthy.length;
          dsLat = Math.max(...healthy.map((t) => latency.get(t)!));
        }
      } else if (node.type === "cache" || node.type === "cdn") {
        const hit = node.params.hitRatio ?? 0;
        const missRatio = outs.reduce((p, t) => p * ratio.get(t)!, 1);
        const missLat = Math.max(...outs.map((t) => latency.get(t)!));
        const sf = m.flows.success;
        const sfTotal = sf.read + sf.write;
        const passFraction = sfTotal > 0 ? (sf.read * (1 - hit) + sf.write) / sfTotal : 1 - hit;
        dsRatio = 1 - passFraction + passFraction * missRatio;
        dsLat = passFraction * missLat;
      } else {
        dsRatio = outs.reduce((p, t) => p * ratio.get(t)!, 1);
        dsLat = Math.max(...outs.map((t) => latency.get(t)!));
      }
    }

    const effectiveRatio = localRatio * dsRatio;
    ratio.set(id, effectiveRatio);
    latency.set(id, localLat + dsLat);
    m.effectiveLatencyMs = localLat + dsLat;
    m.effectiveErrorRps = m.incomingRps * (1 - effectiveRatio);
  }

  const clients = design.nodes.filter((n) => n.type === "client");
  const totalRps = clients.reduce((sum, c) => sum + perNode[c.id].incomingRps, 0);
  const successRatio =
    totalRps > 0
      ? clients.reduce((sum, c) => sum + ratio.get(c.id)! * perNode[c.id].incomingRps, 0) / totalRps
      : 1;
  const e2eLatencyMs =
    totalRps > 0
      ? clients.reduce((sum, c) => sum + latency.get(c.id)! * perNode[c.id].incomingRps, 0) /
        totalRps
      : 0;

  return { perNode, global: { successRatio, e2eLatencyMs, totalRps } };
}
