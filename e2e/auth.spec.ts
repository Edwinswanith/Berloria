import { randomBytes } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { test, expect, expectNoHorizontalScroll } from "./fixtures";

// These tests are about arriving without an account.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Front door: sign in first, then the shop", () => {
  test("a new visitor lands on sign-in, wherever they arrive", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expectNoHorizontalScroll(page);

    await page.goto("/shop?category=sarees");
    await expect(page).toHaveURL(/\/login\?next=/);
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/login\?next=%2Fcheckout/);
  });

  test("help stays open to everyone", async ({ page }) => {
    await page.goto("/help");
    await expect(page).toHaveURL(/\/help$/);
    await expect(page.getByRole("heading", { name: "Size guide" })).toBeVisible();
  });

  test("sign-in and sign-up pages have no serious accessibility issues", async ({ page }) => {
    for (const path of ["/login", "/signup"]) {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${path} ${v.id}`)).toEqual([]);
    }
  });

  test("create an account, land on the shop, sign out, sign back in to where you were going", async ({ page }, testInfo) => {
    const email = `e2e-${testInfo.project.name}-${Date.now()}@berloria.example`;
    const password = randomBytes(12).toString("base64url");

    await page.goto("/shop?category=sarees");
    await page.getByRole("link", { name: "Create an account" }).click();
    await expect(page).toHaveURL(/\/signup\?next=/);

    // Mistakes are explained, and what was typed is kept.
    await page.getByLabel("Your name").fill("Meena Test");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    await expect(page.getByText("Use at least 8 characters")).toBeVisible();
    await expect(page.getByLabel("Your name")).toHaveValue("Meena Test");

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page, "goes on to the page they first asked for").toHaveURL(/\/shop\?category=sarees$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sarees");

    // Signed-in shoppers skip the login page.
    await page.goto("/login");
    await expect(page).toHaveURL(/\/shop$/);

    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Hello, Meena" })).toBeVisible();
    await expect(page.getByTestId("no-orders")).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/shop");
    await expect(page, "signed out means the shop is closed again").toHaveURL(/\/login\?next=/);

    // The same email can't register twice, and a wrong password is refused without hints.
    await page.goto("/signup");
    await page.getByLabel("Your name").fill("Someone Else");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("another-password");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText(/already an account with that email/)).toBeVisible();

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("That email or password isn't right.")).toBeVisible();
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/shop$/);
  });
});
