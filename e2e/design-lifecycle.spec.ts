import { expect, test, type Page } from "@playwright/test";

const STORAGE_KEY = "system-design-simulator:designs";

function design(id: string, name: string) {
  return { schema: 1, id, name, nodes: [], edges: [] };
}

async function openManager(page: Page) {
  await page.getByRole("button", { name: "Gerenciar designs" }).click();
  return page.getByRole("dialog", { name: "Gerenciar designs" });
}

async function importDesign(page: Page, importedDesign: unknown) {
  const manager = await openManager(page);
  await manager.locator('input[type="file"]').setInputFiles({
    name: "design.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(importedDesign)),
  });
  await expect(manager.getByText("Design importado")).toBeVisible();
}

async function seedSavedDesigns(page: Page) {
  await page.goto("/");
  await page.evaluate(({ key, designs }) => localStorage.setItem(key, JSON.stringify(designs)), {
    key: STORAGE_KEY,
    designs: {
      first: design("first", "Primeiro"),
      second: design("second", "Segundo"),
    },
  });
  await page.reload();
}

test("salva pela primeira vez e reflete o estado persistido na barra", async ({ page }) => {
  await page.goto("/");

  const controls = page.locator(".design-controls");
  await expect(controls.getByText("Sem título", { exact: true })).toBeVisible();
  await expect(controls.getByText("Alterações não salvas", { exact: true })).toBeVisible();
  await expect(controls.getByRole("button", { name: "Salvar" })).toBeEnabled();
  await controls.getByRole("button", { name: "Salvar" }).click();
  const manager = page.getByRole("dialog", { name: "Gerenciar designs" });
  await manager.getByLabel("Nome do design").fill("Arquitetura inicial");
  await manager.getByRole("button", { name: "Salvar", exact: true }).click();

  await expect(page.getByText("Design salvo")).toBeVisible();
  await expect(controls.getByText("Arquitetura inicial", { exact: true })).toBeVisible();
  await expect(controls.getByText("Salvo", { exact: true })).toBeVisible();
  await expect(controls.getByRole("button", { name: "Salvar" })).toBeDisabled();
});

test("protege novo design e carregamento quando há revisão não salva", async ({ page }) => {
  await seedSavedDesigns(page);
  await importDesign(page, design("imported", "Importado"));
  await page.getByRole("dialog", { name: "Gerenciar designs" }).getByRole("button", { name: "Fechar" }).click();

  await page.locator(".design-controls").getByRole("button", { name: "Novo design" }).click();
  await expect(page.getByRole("dialog", { name: "Alterações não salvas" })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar" }).last().click();

  const manager = await openManager(page);
  await manager.getByRole("button", { name: "Carregar" }).first().click();
  await expect(page.getByRole("dialog", { name: "Alterações não salvas" })).toBeVisible();
});

test("protege uma segunda importação quando há revisão não salva", async ({ page }) => {
  await page.goto("/");
  await importDesign(page, design("first-import", "Primeira importação"));

  const manager = page.getByRole("dialog", { name: "Gerenciar designs" });
  await manager.locator('input[type="file"]').setInputFiles({
    name: "second.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(design("second-import", "Segunda importação"))),
  });
  await expect(page.getByRole("dialog", { name: "Alterações não salvas" })).toBeVisible();
});

test("renomeia e exclui cópias persistidas pelo gerenciador", async ({ page }) => {
  await seedSavedDesigns(page);
  const manager = await openManager(page);

  await manager.getByRole("button", { name: "Renomear" }).first().click();
  await page.getByLabel("Novo nome do design").fill("Primeiro renomeado");
  await page.getByRole("button", { name: "Confirmar renomeação" }).click();
  await expect(manager.getByText("Primeiro renomeado", { exact: true })).toBeVisible();

  await manager.getByRole("button", { name: "Excluir" }).last().click();
  await page.getByRole("dialog", { name: "Excluir design" }).getByRole("button", { name: "Excluir" }).click();
  await expect(manager.getByText("Design Segundo excluído")).toBeVisible();
  await expect(manager.getByText("Segundo", { exact: true })).toHaveCount(0);
});
