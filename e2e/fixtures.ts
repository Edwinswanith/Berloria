import { test as base, expect, type Page } from "@playwright/test";

/** Counts from scripts/seed-data.ts. */
export const SEED = {
  total: 16,
  categories: { dresses: 6, "kurtas-and-sets": 5, "co-ords": 3, sarees: 2 },
} as const;

export const parseRupees = (text: string): number => Number(text.replace(/[^\d]/g, ""));

/**
 * Note: Next 16 keeps the previous route mounted but hidden (React <Activity>) after client
 * navigation, so element counts must filter to visible elements.
 */

/** Fails the test if the page logs an error or throws. */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));
      page.on("pageerror", (err) => errors.push(err.message));
      await use(errors);
      expect(errors, "console errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "page scrolls sideways").toBeLessThanOrEqual(0);
}

export const isMobile = (page: Page): boolean => (page.viewportSize()?.width ?? 1280) < 1024;
