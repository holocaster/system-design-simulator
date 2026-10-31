import { expect, test, type Page } from "@playwright/test";

const DESIGN_WITH_HISTORY = {
  schema: 1,
  id: "e2e-evaluation-history",
  nodes: [
    {
      id: "s1",
      type: "service",
      name: "Serviço",
      position: { x: 200, y: 160 },
      params: { capacity: 500, baseLatencyMs: 20, errorRate: 0, replicas: 1 },
    },
  ],
  edges: [],
  evaluations: [
    {
      text: "Rodada mais recente: o design aguenta o pico.",
      createdAt: "2026-07-21T14:30:00.000Z",
      rps: 5000,
      writePercent: 20,
      model: "anthropic/claude-sonnet-4",
      metrics: { successRatio: 0.99, e2eLatencyMs: 42, totalRps: 5000 },
    },
    {
      text: "Rodada intermediária: gargalo no banco.",
      createdAt: "2026-07-21T13:00:00.000Z",
      rps: 1000,
      writePercent: 50,
      model: "anthropic/claude-sonnet-4",
      metrics: { successRatio: 0.62, e2eLatencyMs: 380, totalRps: 1000 },
    },
    {
      text: "Rodada sem simulação: só a topologia foi analisada.",
      createdAt: "2026-07-21T12:00:00.000Z",
      rps: 100,
      writePercent: 10,
      model: "anthropic/claude-sonnet-4",
    },
  ],
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
  await importDesign(page, DESIGN_WITH_HISTORY);
  await page.getByRole("button", { name: "Ver avaliações" }).click();
  await expect(page.getByRole("dialog", { name: "Avaliação por IA" })).toBeVisible();
});

test("a coluna lista as rodadas da mais recente para a mais antiga", async ({ page }) => {
  const items = page.locator(".evaluation-history-item");

  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText("5.000 RPS");
  await expect(items.nth(0)).toContainText("99% sucesso");
  await expect(items.nth(1)).toContainText("1.000 RPS");
  await expect(items.nth(1)).toContainText("62% sucesso");
  await expect(items.nth(2)).toContainText("100 RPS");
});

test("a rodada mais recente abre selecionada e escolher outra troca o texto", async ({ page }) => {
  const body = page.locator(".evaluation-modal-body");
  const items = page.locator(".evaluation-history-item");

  await expect(items.nth(0)).toHaveAttribute("aria-pressed", "true");
  await expect(body).toContainText("Rodada mais recente");

  await items.nth(1).click();

  await expect(items.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(body).toContainText("Rodada intermediária");
});

test("a rodada sem métricas aparece marcada como não simulada", async ({ page }) => {
  const items = page.locator(".evaluation-history-item");

  await expect(items.nth(2)).toContainText("Não simulado");

  await items.nth(2).click();

  await expect(page.locator(".evaluation-modal-meta")).toContainText("Não simulado");
  await expect(page.locator(".evaluation-modal-body")).toContainText("Rodada sem simulação");
});
