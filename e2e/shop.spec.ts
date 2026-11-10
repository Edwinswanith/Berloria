import { test, expect, expectNoHorizontalScroll, parseRupees, SEED } from "./fixtures";

test.describe("Shop", () => {
  test("lists every active product", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.getByTestId("product-card").filter({ visible: true })).toHaveCount(SEED.total);
    await expect(page.getByTestId("result-count")).toHaveText(`${SEED.total} styles`);
    await expectNoHorizontalScroll(page);
  });

  for (const [slug, count] of Object.entries(SEED.categories)) {
    test(`filters by category: ${slug}`, async ({ page }) => {
      await page.goto("/shop");
      await page.getByRole("navigation", { name: "Categories" }).getByRole("link").filter({ hasNotText: "All" }).and(page.locator(`[href*="category=${slug}"]`)).click();
      await expect(page).toHaveURL(new RegExp(`category=${slug}`));
      await expect(page.getByTestId("product-card").filter({ visible: true })).toHaveCount(count);
      await expect(page.getByRole("navigation", { name: "Categories" }).locator('[aria-current="page"]')).not.toHaveText("All");
    });
  }

  test("sorts by price, both directions, and keeps the category", async ({ page }) => {
    await page.goto("/shop?category=dresses");
    const prices = async () => (await page.getByTestId("card-price").filter({ visible: true }).allTextContents()).map(parseRupees);

    await page.getByRole("combobox").selectOption("price-asc");
    await expect(page).toHaveURL(/sort=price-asc/);
    await expect(page).toHaveURL(/category=dresses/);
    await expect.poll(prices).toEqual([...(await prices())].sort((a, b) => a - b));

    await page.getByRole("combobox").selectOption("price-desc");
    await expect(page).toHaveURL(/sort=price-desc/);
    await expect.poll(async () => { const p = await prices(); return p.join() === [...p].sort((a, b) => b - a).join(); }).toBe(true);
  });

  test("ignores unknown filters instead of breaking", async ({ page }) => {
    const response = await page.goto("/shop?category=nope&sort=bogus");
    expect(response?.status()).toBe(200);
    await expect(page.getByTestId("product-card").filter({ visible: true })).toHaveCount(SEED.total);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Shop all");
  });

  test("search finds styles by name or fabric and says so when nothing matches", async ({ page }) => {
    await page.goto("/shop");
    await page.getByRole("searchbox").fill("saree");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/q=saree/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("saree");
    await expect(page.getByTestId("product-card").filter({ visible: true })).toHaveCount(SEED.categories.sarees);

    await page.getByRole("searchbox").fill("zzzz velvet tuxedo");
    await page.getByRole("searchbox").press("Enter");
    await expect(page.getByTestId("no-results")).toContainText("Nothing matches");
    await page.getByRole("link", { name: "See everything" }).click();
    await expect(page.getByTestId("product-card").filter({ visible: true })).toHaveCount(SEED.total);
  });

  test("size and price filters narrow the list, combine with a category, and clear", async ({ page }) => {
    await page.goto("/shop?category=dresses");
    const cards = page.getByTestId("product-card").filter({ visible: true });
    const prices = async () => (await page.getByTestId("card-price").filter({ visible: true }).allTextContents()).map(parseRupees);

    await page.getByRole("navigation", { name: "Price" }).getByRole("link", { name: "₹2,000 – ₹3,000" }).click();
    await expect(page).toHaveURL(/price=2000-3000/);
    await expect(page).toHaveURL(/category=dresses/);
    await expect.poll(async () => (await prices()).every((p) => p >= 2000 && p < 3000)).toBe(true);
    const inBand = await cards.count();
    expect(inBand).toBeGreaterThan(0);
    expect(inBand).toBeLessThan(SEED.categories.dresses);

    // Marigold Wrap Dress has no XS left, so the XS filter must drop it.
    await page.getByRole("navigation", { name: "Size" }).getByRole("link", { name: "Size XS" }).click();
    await expect(page).toHaveURL(/size=XS/);
    await expect(page.getByRole("link", { name: /Marigold Wrap Dress/ }).filter({ visible: true })).toHaveCount(0);
    await expectNoHorizontalScroll(page);

    await page.getByTestId("clear-filters").click();
    await expect(cards).toHaveCount(SEED.total);
  });
});
