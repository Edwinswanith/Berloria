import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./fixtures";

const PAGES = ["/", "/shop", "/shop?category=dresses", "/products/marigold-wrap-dress", "/help", "/bag", "/checkout", "/account", "/shop?q=cotton&size=M", "/admin/login"];

test.describe("Accessibility (axe, WCAG 2.1 AA)", () => {
  for (const path of PAGES) {
    test(`no serious or critical issues on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const blocking = results.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`);
      expect(blocking).toEqual([]);
    });
  }

  test("keyboard users can reach Add to bag from the top of a product page", async ({ page }) => {
    await page.goto("/products/marigold-wrap-dress");
    const addToBag = page.getByRole("button", { name: "Add to bag" });
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      if (await addToBag.evaluate((el) => el === document.activeElement)) return;
    }
    throw new Error("Add to bag was not reachable within 40 tab stops");
  });
});
