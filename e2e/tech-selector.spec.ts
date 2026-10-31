import { expect, test, type Page } from "@playwright/test";

const QUEUE_DESIGN = {
  schema: 1,
  id: "e2e-tech-selector",
  nodes: [
    {
      id: "q1",
      type: "queue",
      name: "Fila",
      position: { x: 200, y: 160 },
      params: { capacity: 10_000, baseLatencyMs: 1, errorRate: 0, bufferSize: 100_000 },
    },
  ],
  edges: [],
};

async function importDesign(page: Page, design: unknown) {
  await page.getByRole("button", { name: "Gerenciar designs" }).click();
  await page.getByText("Importar JSON").locator("input[type=file]").setInputFiles({
    name: "design.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(design)),
  });
  await expect(page.getByText("Design importado")).toBeVisible();
  await page.getByRole("button", { name: "Fechar" }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await importDesign(page, QUEUE_DESIGN);
  await page.locator(".react-flow__node").first().click();
  await expect(page.getByLabel("Tecnologia")).toBeVisible();
});

test("aplicar Kafka semeia a capacidade, marca o no e viaja no export", async ({ page }) => {
  await page.getByLabel("Tecnologia").selectOption("kafka");

  await expect(page.getByLabel("Capacidade (RPS)")).toHaveValue("200000");
  await expect(page.locator(".component-node-tech")).toHaveText("Kafka");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Gerenciar designs" }).click();
  await page.getByRole("button", { name: "Exportar JSON" }).click();
  const download = await downloadPromise;
  const content = (await download.createReadStream().then(streamToString)) as string;
  const exported = JSON.parse(content);
  expect(exported.nodes[0].tech).toBe("kafka");
  expect(exported.nodes[0].params.capacity).toBe(200_000);
});

test("editar a capacidade a mao devolve o seletor para Personalizado", async ({ page }) => {
  await page.getByLabel("Tecnologia").selectOption("kafka");
  await expect(page.locator(".component-node-tech")).toHaveText("Kafka");

  await page.getByLabel("Capacidade (RPS)").fill("50000");

  await expect(page.getByLabel("Tecnologia")).toHaveValue("");
  await expect(page.locator(".component-node-tech")).toHaveCount(0);
});

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}
