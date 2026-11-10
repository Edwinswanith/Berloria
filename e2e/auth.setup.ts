import { randomBytes } from "node:crypto";
import { test as setup, expect } from "@playwright/test";

/**
 * Creates the shopper every other test signs in as, and saves the session.
 * The account uses a random password and is deleted again by scripts/clear-test-orders.ts.
 */
setup("create a test shopper", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Priya Test");
  await page.getByLabel("Email").fill(`e2e-shopper-${Date.now()}@berloria.example`);
  await page.getByLabel("Password").fill(randomBytes(12).toString("base64url"));
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/shop$/);
  await page.context().storageState({ path: "e2e/.auth/customer.json" });
});
