import { expect, test, type Page } from "@playwright/test";

const OVERLOAD_DESIGN = {
  schema: 1,
  id: "e2e-node-diagnosis",
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

test("tooltip de diagnóstico aparece sob hover e pode ser fixado", async ({ page }) => {
  await page.goto("/");
  await importDesign(page, OVERLOAD_DESIGN);

  await page.getByRole("spinbutton", { name: "Carga em RPS" }).fill("300");
  await page.getByRole("button", { name: "Iniciar" }).click();

  const node = page.locator(".react-flow__node", { hasText: "Serviço" });
  const tooltip = node.locator(".component-node-tooltip");
  await expect(tooltip).toContainText("Sobrecarga", { timeout: 10_000 });

  await expect(tooltip).not.toBeVisible();

  await node.hover();
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText("Aumente réplicas ou capacidade");

  await node.getByRole("button", { name: "Fixar diagnóstico" }).click();
  await page.getByRole("heading", { name: "Componentes" }).hover();
  await expect(tooltip).toBeVisible();

  await tooltip.getByRole("button", { name: "Fechar diagnóstico" }).click();
  await page.getByRole("heading", { name: "Componentes" }).hover();
  await expect(tooltip).not.toBeVisible();
});
