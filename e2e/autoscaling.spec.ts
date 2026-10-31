import { expect, test, type Page } from "@playwright/test";

const AUTOSCALING_DESIGN = {
  schema: 1,
  id: "e2e-autoscaling",
  nodes: [
    {
      id: "client-1",
      type: "client",
      name: "Cliente",
      position: { x: 100, y: 160 },
      params: { capacity: 1_000_000, baseLatencyMs: 0, errorRate: 0 },
    },
    {
      id: "service-1",
      type: "service",
      name: "Serviço",
      position: { x: 360, y: 160 },
      params: { capacity: 100, baseLatencyMs: 20, errorRate: 0, replicas: 1 },
    },
  ],
  edges: [{ id: "client-service", source: "client-1", target: "service-1" }],
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

test("liga autoscaling e observa o badge chegar ao teto", async ({ page }) => {
  await page.goto("/");
  await importDesign(page, AUTOSCALING_DESIGN);
  await page.getByText("Serviço", { exact: true }).click();

  const badge = page.locator(".replica-badge");
  await expect(page.getByLabel("Autoscaling")).not.toBeChecked();
  await page.getByLabel("Autoscaling").check();
  await page.getByLabel("Teto").fill("3");
  await expect(badge).toHaveText("x1 auto");

  await page.getByRole("spinbutton", { name: "Carga em RPS" }).fill("150");
  await page.getByRole("button", { name: "Iniciar" }).click();

  await expect(badge).toHaveText("x3 auto (max)", { timeout: 10_000 });
});
