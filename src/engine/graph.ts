import type { Design } from "./types";

export type TopoResult = { ok: true; order: string[] } | { ok: false; error: string };

export function topoOrder(design: Design): TopoResult {
  const inDegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();

  for (const node of design.nodes) {
    inDegree.set(node.id, 0);
    outgoing.set(node.id, []);
  }
  for (const edge of design.edges) {
    outgoing.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue = design.nodes.filter((n) => inDegree.get(n.id) === 0).map((n) => n.id);
  const order: string[] = [];

  while (queue.length > 0) {
    const id = queue.shift() as string;
    order.push(id);
    for (const target of outgoing.get(id) ?? []) {
      const degree = (inDegree.get(target) ?? 0) - 1;
      inDegree.set(target, degree);
      if (degree === 0) queue.push(target);
    }
  }

  if (order.length !== design.nodes.length) {
    return { ok: false, error: "O design contém um ciclo de conexões" };
  }
  return { ok: true, order };
}
