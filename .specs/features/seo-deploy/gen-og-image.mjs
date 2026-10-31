// Gera public/og-image.png a partir de um screenshot real do simulador
// rodando. Nao faz parte do build; roda uma vez, o PNG resultante e commitado.
//
// Como rodar (precisa do Vite de pe em :5173, ex.: `npm run dev`):
//   cp .specs/features/seo-deploy/gen-og-image.mjs ./.gen-og.tmp.mjs && \
//   node ./.gen-og.tmp.mjs; rm -f ./.gen-og.tmp.mjs
//
// Copiado para a raiz do repo antes de rodar porque o Node resolve
// @playwright/test pela localizacao do script (mesmo padrao do
// shot.mjs do ui-redesign).

import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

const WIDTH = 1200;
const HEIGHT = 630;

const design = {
  schema: 1,
  id: "og-image-design",
  nodes: [
    { id: "c1", type: "client", name: "Cliente", position: { x: 20, y: 220 }, params: { capacity: 100000, baseLatencyMs: 0, errorRate: 0 } },
    { id: "lb", type: "loadbalancer", name: "LB", position: { x: 200, y: 220 }, params: { capacity: 50000, baseLatencyMs: 2, errorRate: 0 } },
    { id: "s1", type: "service", name: "API", position: { x: 380, y: 140 }, params: { capacity: 500, baseLatencyMs: 20, errorRate: 0, replicas: 3 } },
    { id: "ca", type: "cache", name: "Cache", position: { x: 560, y: 60 }, params: { capacity: 20000, baseLatencyMs: 1, errorRate: 0, replicas: 1 } },
    { id: "q1", type: "queue", name: "Fila", position: { x: 560, y: 270 }, params: { capacity: 3000, baseLatencyMs: 5, errorRate: 0, bufferSize: 10000 } },
    { id: "w1", type: "worker", name: "Worker", position: { x: 740, y: 270 }, params: { capacity: 500, baseLatencyMs: 30, errorRate: 0, replicas: 2 } },
    { id: "db", type: "sql", name: "Postgres", position: { x: 740, y: 140 }, params: { capacity: 1500, baseLatencyMs: 8, errorRate: 0, replicas: 2 } },
  ],
  edges: [
    { id: "e1", source: "c1", target: "lb" },
    { id: "e2", source: "lb", target: "s1" },
    { id: "e3", source: "s1", target: "ca" },
    { id: "e4", source: "s1", target: "db" },
    { id: "e5", source: "s1", target: "q1" },
    { id: "e6", source: "q1", target: "w1" },
    { id: "e7", source: "w1", target: "db" },
  ],
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
await page.addInitScript(() => localStorage.setItem("help-seen", "true"));
await page.goto("http://localhost:5173/");

await page.getByRole("button", { name: "Gerenciar designs" }).click();
await page.getByText("Importar JSON").locator("input[type=file]").setInputFiles({
  name: "og-design.json",
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify(design)),
});
await page.getByText("Design importado").waitFor();
await page.getByRole("button", { name: "Fechar" }).click();

await page.getByRole("spinbutton", { name: "Carga em RPS" }).fill("300");
await page.getByRole("button", { name: "Iniciar" }).click();
await page.waitForTimeout(1500);

const shotBuffer = await page.screenshot();
const shotBase64 = shotBuffer.toString("base64");
await browser.close();

const overlayHtml = `<!doctype html>
<html><head><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: ${WIDTH}px; height: ${HEIGHT}px; position: relative; overflow: hidden; font-family: -apple-system, "Segoe UI", sans-serif; }
  img { position: absolute; inset: 0; width: ${WIDTH}px; height: ${HEIGHT}px; object-fit: cover; }
  .bar { position: absolute; left: 0; right: 0; bottom: 0; padding: 28px 40px 32px; background: linear-gradient(180deg, rgba(20,17,32,0) 0%, rgba(20,17,32,0.92) 55%, rgba(20,17,32,0.96) 100%); }
  h1 { color: #fff; font-size: 42px; font-weight: 600; letter-spacing: -0.01em; }
  p { color: #d8d2ef; font-size: 21px; margin-top: 8px; }
</style></head>
<body>
  <img src="data:image/png;base64,${shotBase64}" />
  <div class="bar">
    <h1>Simulador de System Design</h1>
    <p>Monte arquiteturas, gere carga real e veja latência, erros e escalabilidade ao vivo</p>
  </div>
</body></html>`;

const browser2 = await chromium.launch();
const page2 = await browser2.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
await page2.setContent(overlayHtml);
const finalBuffer = await page2.screenshot();
await browser2.close();

writeFileSync("public/og-image.png", finalBuffer);
console.log("public/og-image.png escrito:", finalBuffer.length, "bytes");
