import { expect, test } from "@playwright/test";

const RENAME_DESIGN = {
  schema: 1,
  id: "e2e-properties-panel",
  nodes: [
    {
      id: "service-1",
      type: "service",
      name: "Serviço",
      position: { x: 200, y: 160 },
      params: { capacity: 500, baseLatencyMs: 20, errorRate: 0, replicas: 1 },
    },
  ],
  edges: [],
};

test("renomear componente valida nome vazio e reflete no canvas", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Gerenciar designs" }).click();
  await page.getByText("Importar JSON").locator("input[type=file]").setInputFiles({
    name: "design.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(RENAME_DESIGN)),
  });
  await expect(page.getByText("Design importado")).toBeVisible();
  await page.getByRole("button", { name: "Fechar" }).click();

  await page.locator(".react-flow__node", { hasText: "Serviço" }).click();

  const nameInput = page.getByLabel("Nome");
  await expect(nameInput).toHaveValue("Serviço");

  await nameInput.fill("");
  await expect(page.getByText("Nome não pode ser vazio")).toBeVisible();
  await expect(nameInput).toHaveAttribute("aria-invalid", "true");

  await nameInput.fill("API principal");
  await expect(page.getByText("Nome não pode ser vazio")).not.toBeVisible();
  await expect(nameInput).toHaveAttribute("aria-invalid", "false");
  await expect(page.locator(".react-flow__node", { hasText: "API principal" })).toBeVisible();
});
