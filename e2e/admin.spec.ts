import sharp from "sharp";
import { test, expect, expectNoHorizontalScroll } from "./fixtures";

const EMAIL = process.env.ADMIN_EMAIL ?? "";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "";

/** A stand-in for a phone photo of a dress on a plain wall. */
const garmentPhoto = (): Promise<Buffer> =>
  sharp({ create: { width: 900, height: 1200, channels: 3, background: "#d9a441" } }).jpeg().toBuffer();

test.describe("Admin: protection", () => {
  test("signed-out visitors are sent to staff sign-in", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await page.goto("/admin/products/new");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("admin APIs and staff-only photos refuse signed-out requests", async ({ request }) => {
    const id = "0123456789abcdef01234567";
    const generate = await request.post(`/api/admin/products/${id}/generate`, { data: { shot: "model-front" } });
    expect(generate.status()).toBe(401);
    const upload = await request.post(`/api/admin/products/${id}/photos`, { multipart: { view: "front", file: { name: "a.jpg", mimeType: "image/jpeg", buffer: await garmentPhoto() } } });
    expect(upload.status()).toBe(401);
    expect((await request.get("/media/sources/00000000-0000-4000-8000-000000000000.webp")).status()).toBe(404);
    expect((await request.get("/media/../.env.local")).status()).toBe(404);
  });

  test("a wrong password is refused without saying which part was wrong", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill("someone@example.com");
    await page.getByLabel("Password").fill("definitely-not-it");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("That email or password isn't right.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});

test.describe("Admin: add a dress, make photos, publish", () => {
  test.skip(!EMAIL || !PASSWORD, "ADMIN_EMAIL / ADMIN_PASSWORD are not set in .env.local");

  test("full flow from sign-in to live product and back", async ({ page, playwright, consoleErrors }, testInfo) => {
    test.setTimeout(120_000);
    const title = `E2E Test Dress ${testInfo.project.name} ${Date.now()}`;

    await page.goto("/admin");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByTestId("sales-stats")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Products" }).click();
    await expect(page.getByRole("heading", { name: "Products" })).toBeVisible({ timeout: 20_000 });

    // 1. Create a draft. Validation speaks plainly.
    await page.getByRole("link", { name: "Add a dress" }).click();
    await page.getByRole("button", { name: "Save and add photos" }).click();
    await expect(page.getByText("Please fix the highlighted fields.")).toBeVisible();
    await page.getByLabel("Name").fill(title);
    await page.getByLabel("Price (₹)").fill("abc");
    await page.getByRole("button", { name: "Save and add photos" }).click();
    await expect(page.getByText(/Enter the price in rupees/)).toBeVisible();
    await expect(page.getByLabel("Name"), "a failed save keeps what was typed").toHaveValue(title);
    await page.getByLabel("Price (₹)").fill("2499");
    await expect(page.getByText("Includes 5% GST")).toBeVisible();
    await page.getByLabel("Stock for size M").fill("3");
    await page.getByRole("button", { name: "Save and add photos" }).click();
    await expect(page).toHaveURL(/\/admin\/products\/[a-f0-9]{24}/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expectNoHorizontalScroll(page);

    // 2. A draft can't go live until it has a photo and a description.
    await expect(page.getByTestId("status-pill")).toHaveText("Draft");
    await expect(page.getByTestId("blockers")).toContainText("Add at least one photo");
    await expect(page.getByTestId("blockers")).toContainText("Add a description");
    await expect(page.getByRole("button", { name: "Publish to shop" })).toBeDisabled();
    await expect(page.getByTestId("shot-model-front").getByRole("button", { name: "Create" })).toBeDisabled();
    await expect(page.getByTestId("shot-model-front")).toContainText("Needs the front photo");

    // 3. Bad uploads are explained; good ones appear.
    await page.getByLabel("Front photo", { exact: true }).setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("not a photo") });
    await expect(page.locator("p[role=alert]").filter({ hasText: /photo|image|JPG/i })).toBeVisible();
    // The browser logs the deliberate 400 from that rejected upload; it is the only error we expect.
    const rejected = consoleErrors.findIndex((e) => e.includes("status of 400"));
    expect(rejected, "rejected upload answers 400").toBeGreaterThanOrEqual(0);
    consoleErrors.splice(rejected, 1);
    await page.getByLabel("Front photo", { exact: true }).setInputFiles({ name: "front.jpg", mimeType: "image/jpeg", buffer: await garmentPhoto() });
    const source = page.getByAltText("Front photo of the garment");
    await expect(source).toBeVisible();
    const sourceUrl = (await source.getAttribute("src"))!;
    expect(sourceUrl).toMatch(/^\/media\/sources\//);

    // 4. Generate, review, approve.
    const shot = page.getByTestId("shot-model-front");
    await shot.getByRole("button", { name: "Create" }).click();
    await expect(shot).toHaveAttribute("data-status", "ready", { timeout: 60_000 });
    await expect(page.getByTestId("shot-model-back")).toContainText("Needs the back photo");
    await shot.getByRole("button", { name: "Approve" }).click();
    await expect(shot).toHaveAttribute("data-status", "approved");
    await expect(page.getByTestId("gallery").getByRole("img")).toHaveCount(1);

    // 5. Add the description, then publish.
    await page.getByLabel("Description").fill("A test dress. Midi length, side pockets, machine wash cold.");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await expect(page.getByTestId("blockers")).toHaveCount(0);
    await page.getByRole("button", { name: "Publish to shop" }).click();
    await expect(page.getByTestId("status-pill")).toHaveText("Live");
    const shopPath = (await page.getByRole("link", { name: /View in shop/ }).getAttribute("href"))!;

    // 6. Without signing in, a visitor is sent to the login page and can never fetch the raw upload.
    const visitor = await playwright.request.newContext({ baseURL: testInfo.project.use.baseURL, storageState: { cookies: [], origins: [] } });
    const gated = await visitor.get(shopPath, { maxRedirects: 0 });
    expect(gated.status()).toBe(307);
    expect(gated.headers().location).toContain("/login");
    expect((await visitor.get(sourceUrl)).status()).toBe(404);
    await visitor.dispose();

    const adminUrl = page.url();
    await page.goto(shopPath);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.getByTestId("ai-note")).toBeVisible();
    await expect(page.getByTestId("price")).toHaveText("₹2,499");

    // 7. Take it down and delete it, leaving the catalogue as we found it.
    await page.goto(adminUrl);
    await page.getByRole("button", { name: "Take down" }).click();
    await expect(page.getByTestId("status-pill")).toHaveText("Draft");
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("button", { name: "Yes, delete" }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);
    await expect(page.getByText(title).filter({ visible: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});
