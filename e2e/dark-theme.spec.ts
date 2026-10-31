import { expect, test } from "@playwright/test";

test("começa em tema escuro por padrão e mantém a escolha de tema claro após recarregar", async ({ page }) => {
  await page.goto("/");

  const html = page.locator("html");

  await expect(html).toHaveAttribute("data-theme", "dark");

  await page.getByRole("button", { name: "Tema claro" }).click();

  await expect(html).not.toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Tema escuro" })).toBeVisible();

  await page.reload();

  await expect(html).not.toHaveAttribute("data-theme", "dark");
});
