import { expect, test } from "@playwright/test";

test("configuração da API valida campos, salva e persiste após reload", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Configurar API" }).click();
  const dialog = page.getByRole("dialog", { name: "Configuração da API" });
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(dialog.getByText("Informe uma chave da API OpenRouter")).toBeVisible();

  await dialog.getByLabel("Chave da API OpenRouter").fill("sk-or-v1-teste");
  await dialog.getByLabel("Modelo OpenRouter", { exact: true }).selectOption({ label: "GPT mini (OpenAI)" });
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(dialog.getByText("Configuração salva neste navegador")).toBeVisible();

  await dialog.getByRole("button", { name: "Fechar" }).click();
  await expect(dialog).not.toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Configurar API" }).click();
  const reopened = page.getByRole("dialog", { name: "Configuração da API" });
  await expect(reopened.getByLabel("Modelo OpenRouter", { exact: true })).toHaveValue(
    "~openai/gpt-mini-latest",
  );
  await expect(reopened.getByLabel("Chave da API OpenRouter")).toHaveValue("sk-or-v1-teste");
});

test("modelo personalizado exige texto não vazio", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Configurar API" }).click();
  const dialog = page.getByRole("dialog", { name: "Configuração da API" });

  await dialog.getByLabel("Chave da API OpenRouter").fill("sk-or-v1-teste");
  await dialog.getByLabel("Modelo OpenRouter", { exact: true }).selectOption({ label: "Personalizado" });
  await dialog.getByLabel("Modelo OpenRouter personalizado").fill("");
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(dialog.getByText("Informe um modelo OpenRouter")).toBeVisible();

  await dialog.getByLabel("Modelo OpenRouter personalizado").fill("outro-provedor/modelo-x");
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(dialog.getByText("Configuração salva neste navegador")).toBeVisible();
});
