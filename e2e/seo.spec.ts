import { expect, test } from "@playwright/test";

test("meta tags, favicon, robots.txt e sitemap.xml estão corretos", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Simulador de System Design/);

  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /Simule|Monte arquiteturas/,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://example.com/",
  );
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/favicon.svg");

  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    /Simulador de System Design/,
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://example.com/og-image.png",
  );

  const robots = await page.request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  const robotsBody = await robots.text();
  expect(robotsBody).not.toContain("Disallow");
  expect(robotsBody).toContain("Sitemap: https://example.com/sitemap.xml");

  const sitemap = await page.request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const sitemapBody = await sitemap.text();
  expect(sitemapBody).toContain("https://example.com/");
});
