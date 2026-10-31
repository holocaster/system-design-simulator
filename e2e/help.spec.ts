import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("modal de ajuda abre sozinha na primeira visita, não na visita seguinte, e o ícone reabre sob demanda", async ({ page }) => {
  await page.goto("/");

  const dialog = page.getByRole("dialog", { name: "Ajuda" });
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "Fechar" }).click();
  await expect(dialog).not.toBeVisible();

  await page.reload();
  await expect(page.getByRole("dialog", { name: "Ajuda" })).not.toBeVisible();

  await page.getByRole("button", { name: "Ajuda" }).click();
  await expect(page.getByRole("dialog", { name: "Ajuda" })).toBeVisible();

  await page.getByRole("dialog", { name: "Ajuda" }).getByRole("button", { name: "Fechar" }).click();
  await expect(page.getByRole("dialog", { name: "Ajuda" })).not.toBeVisible();
});
