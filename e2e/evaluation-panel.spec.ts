import { expect, test } from "@playwright/test";

test("desafio personalizado revela o brief e valida antes de avaliar", async ({ page }) => {
  await page.goto("/");

  const challenge = page.getByLabel("Desafio");
  const evaluateButton = page.getByRole("button", { name: "Avaliar design" });
  const briefField = page.getByLabel("Descreva o sistema");

  await expect(challenge).toHaveValue("url-shortener");
  await expect(briefField).not.toBeVisible();
  await expect(evaluateButton).toBeEnabled();

  await challenge.selectOption({ label: "Personalizado" });
  await expect(briefField).toBeVisible();
  await expect(page.getByText("Descreva o sistema para iniciar a avaliação.")).toBeVisible();
  await expect(evaluateButton).toBeDisabled();

  await briefField.fill("Sistema de reservas com 500 RPS no pico.");
  await expect(page.getByText("Descreva o sistema para iniciar a avaliação.")).not.toBeVisible();
  await expect(evaluateButton).toBeEnabled();

  await challenge.selectOption({ label: "URL shortener" });
  await expect(briefField).not.toBeVisible();
  await expect(evaluateButton).toBeEnabled();
});
