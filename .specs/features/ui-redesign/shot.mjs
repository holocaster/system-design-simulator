import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const SP = "test-results/ui-redesign";
mkdirSync(SP, { recursive: true });
const design = {
  schema: 1,
  nodes: [
    { id: "c1", type: "client", name: "Cliente", position: { x: 20, y: 200 }, params: { capacity: 100000, baseLatencyMs: 0, errorRate: 0 } },
    { id: "lb", type: "loadbalancer", name: "LB", position: { x: 200, y: 200 }, params: { capacity: 50000, baseLatencyMs: 2, errorRate: 0 } },
    { id: "s1", type: "service", name: "API", position: { x: 380, y: 120 }, params: { capacity: 500, baseLatencyMs: 20, errorRate: 0, replicas: 4 } },
    { id: "ca", type: "cache", name: "Cache", position: { x: 560, y: 40 }, params: { capacity: 20000, baseLatencyMs: 1, errorRate: 0, replicas: 1 } },
    { id: "q1", type: "queue", name: "Fila", position: { x: 560, y: 250 }, params: { capacity: 3000, baseLatencyMs: 5, errorRate: 0, bufferSize: 10000 } },
    { id: "w1", type: "worker", name: "Worker", position: { x: 740, y: 250 }, params: { capacity: 500, baseLatencyMs: 30, errorRate: 0, replicas: 2 } },
    { id: "db", type: "sql", name: "Postgres", position: { x: 740, y: 120 }, params: { capacity: 1500, baseLatencyMs: 8, errorRate: 0, replicas: 2 } }
  ],
  edges: [
    { id: "e1", source: "c1", target: "lb" },
    { id: "e2", source: "lb", target: "s1" },
    { id: "e3", source: "s1", target: "ca" },
    { id: "e4", source: "s1", target: "db" },
    { id: "e5", source: "s1", target: "q1" },
    { id: "e6", source: "q1", target: "w1" },
    { id: "e7", source: "w1", target: "db" }
  ]
};
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:5173/");
await p.screenshot({ path: SP + "/01-empty.png" });
await p.getByRole("button", { name: "Salvar e carregar" }).click();
await p.getByText("Importar JSON").locator("input[type=file]").setInputFiles({ name: "d.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(design)) });
await p.getByRole("button", { name: "Fechar" }).click();
await p.waitForTimeout(500);
await p.screenshot({ path: SP + "/02-design.png" });
await p.getByRole("button", { name: "Iniciar" }).click();
await p.waitForTimeout(1500);
await p.screenshot({ path: SP + "/03-running.png" });
await p.locator(".react-flow__node").first().click();
await p.waitForTimeout(300);
await p.screenshot({ path: SP + "/04-props.png" });
await b.close();
