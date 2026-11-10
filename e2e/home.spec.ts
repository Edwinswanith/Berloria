import { test, expect, expectNoHorizontalScroll } from "./fixtures";

test.describe("Home", () => {
  test("shows a product in the first screen", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Made for her");
    const hero = page.getByTestId("hero-product");
    await expect(hero).toBeVisible();
    const box = await hero.boundingBox();
    const viewport = page.viewportSize()!;
    expect(box!.y, "hero product starts inside the first screen").toBeLessThan(viewport.height);
    await expectNoHorizontalScroll(page);
  });

  test("hero product opens its product page", async ({ page }) => {
    await page.goto("/");
    const title = (await page.getByTestId("hero-product").locator("p.font-serif").textContent())!.trim();
    await page.getByTestId("hero-product").click();
    await expect(page).toHaveURL(/\/products\//);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  });

  test("featured row lists four products, none repeating the hero", async ({ page }) => {
    await page.goto("/");
    const featured = page.locator("section", { has: page.getByRole("heading", { name: "Bestsellers" }) }).getByTestId("product-card").filter({ visible: true });
    await expect(featured).toHaveCount(4);
    const heroHref = await page.getByTestId("hero-product").getAttribute("href");
    for (const href of await featured.evaluateAll((els) => els.map((e) => e.getAttribute("href")))) {
      expect(href).not.toBe(heroHref);
    }
  });

  test("style tile filters the shop", async ({ page }) => {
    await page.goto("/");
    await page.locator("section", { has: page.getByRole("heading", { name: "Shop by category" }) }).getByRole("link", { name: /Sarees/ }).click();
    await expect(page).toHaveURL(/category=sarees/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sarees");
    await expect(page.getByTestId("product-card").filter({ visible: true })).toHaveCount(2);
  });
});
