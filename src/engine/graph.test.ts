import { describe, expect, it } from "vitest";
import { topoOrder } from "./graph";
import { DEFAULT_PARAMS } from "./catalog";
import type { ComponentType, Design } from "./types";

function makeDesign(nodes: [string, ComponentType][], edges: [string, string][]): Design {
  return {
    schema: 1,
    id: "test-design",
    nodes: nodes.map(([id, type]) => ({
      id,
      type,
      position: { x: 0, y: 0 },
      params: { ...DEFAULT_PARAMS[type] },
    })),
    edges: edges.map(([source, target]) => ({ id: `${source}-${target}`, source, target })),
  };
}

function assertOrderRespectsEdges(order: string[], edges: [string, string][]) {
  for (const [source, target] of edges) {
    expect(order.indexOf(source), `${source} antes de ${target}`).toBeLessThan(
      order.indexOf(target),
    );
  }
}

describe("topoOrder", () => {
  it("ordena cadeia linear", () => {
    const edges: [string, string][] = [
      ["c1", "lb1"],
      ["lb1", "s1"],
      ["s1", "db1"],
    ];
    const design = makeDesign(
      [["c1", "client"], ["lb1", "loadbalancer"], ["s1", "service"], ["db1", "sql"]],
      edges,
    );
    const result = topoOrder(design);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.order).toHaveLength(4);
      assertOrderRespectsEdges(result.order, edges);
    }
  });

  it("ordena grafo com fan-out e fan-in", () => {
    const edges: [string, string][] = [
      ["c1", "lb1"],
      ["lb1", "s1"],
      ["lb1", "s2"],
      ["s1", "ca1"],
      ["s2", "ca1"],
      ["ca1", "db1"],
    ];
    const design = makeDesign(
      [
        ["c1", "client"],
        ["lb1", "loadbalancer"],
        ["s1", "service"],
        ["s2", "service"],
        ["ca1", "cache"],
        ["db1", "sql"],
      ],
      edges,
    );
    const result = topoOrder(design);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.order).toHaveLength(6);
      assertOrderRespectsEdges(result.order, edges);
    }
  });

  it("detecta ciclo e reporta erro", () => {
    const design = makeDesign(
      [["s1", "service"], ["s2", "service"]],
      [["s1", "s2"], ["s2", "s1"]],
    );
    const result = topoOrder(design);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("ciclo");
    }
  });

  it("inclui nos desconectados na ordem", () => {
    const design = makeDesign(
      [["c1", "client"], ["s1", "service"], ["db1", "sql"]],
      [["c1", "s1"]],
    );
    const result = topoOrder(design);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.order).toHaveLength(3);
      expect(result.order).toContain("db1");
    }
  });

  it("design vazio retorna ordem vazia", () => {
    const result = topoOrder(makeDesign([], []));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.order).toEqual([]);
    }
  });
});
