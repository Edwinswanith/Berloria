import { test, expect, expectNoHorizontalScroll, isMobile } from "./fixtures";

test.describe("Navigation", () => {
  test("mobile menu opens, traps the page, and closes on link, Escape and Close", async ({ page }) => {
    test.skip(!isMobile(page), "phone-only menu");
    await page.goto("/shop?category=sarees");
    const menu = page.getByRole("dialog", { name: "Menu" });

    await page.getByRole("button", { name: "Menu" }).click();
    await expect(menu).toBeInViewport();
    await expect(page.getByRole("button", { name: "Close" })).toBeFocused();

    // Same pathname, different query — must still close.
    await menu.getByRole("link", { name: "Dresses" }).click();
    await expect(page).toHaveURL(/category=dresses/);
    await expect(menu).not.toBeInViewport();

    await page.getByRole("button", { name: "Menu" }).click();
    await page.keyboard.press("Escape");
    await expect(menu).not.toBeInViewport();
    await expect(page.getByRole("button", { name: "Menu" })).toBeFocused();

    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(menu).not.toBeInViewport();
  });

  test("desktop header links reach every category", async ({ page }) => {
    test.skip(isMobile(page), "desktop-only nav");
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Shop" });
    await nav.getByRole("link", { name: "Kurtas & Sets" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kurtas & Sets");
  });

  test("every internal link on key pages resolves", async ({ page, request }) => {
    test.setTimeout(120_000);
    const seen = new Set<string>();
    for (const path of ["/", "/shop", "/products/marigold-wrap-dress", "/help"]) {
      await page.goto(path);
      const hrefs = await page.locator("a[href^='/']").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
      hrefs.forEach((h) => seen.add(h.split("#")[0] || "/"));
    }
    // Checked a few at a time: the shop page alone links to dozens of filter combinations.
    const hrefs = [...seen];
    for (let i = 0; i < hrefs.length; i += 6) {
      const statuses = await Promise.all(hrefs.slice(i, i + 6).map(async (href) => [href, (await request.get(href)).status()] as const));
      for (const [href, status] of statuses) expect(status, href).toBeLessThan(400);
    }
  });

  test("holding pages and help render without sideways scroll", async ({ page }) => {
    for (const path of ["/account", "/bag", "/checkout", "/help"]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoHorizontalScroll(page);
    }
  });

  test("help anchors land on their sections", async ({ page }) => {
    await page.goto("/help#delivery");
    await expect(page.getByRole("heading", { name: "Delivery", exact: true })).toBeInViewport();
    await page.goto("/help#sizes");
    await expect(page.getByRole("heading", { name: "Size guide" })).toBeInViewport();
  });
});
