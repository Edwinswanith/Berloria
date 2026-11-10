import { test, expect, expectNoHorizontalScroll, parseRupees } from "./fixtures";

const DRESS = "/products/marigold-wrap-dress"; // ₹2,499 · XS 0, S 2, M 6, L 5, XL 3, XXL 0
const SAREE = "/products/chettinad-cotton-saree"; // free size

test.describe("Product page", () => {
  test("shows title, price, GST and delivery estimate", async ({ page }) => {
    await page.goto(DRESS);
    await expect(page).toHaveTitle(/Marigold Wrap Dress/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Marigold Wrap Dress");
    await expect(page.getByTestId("price")).toHaveText("₹2,499");
    await expect(page.getByText(/Ships from Chennai · arrives in 3–6 days/)).toBeVisible();
    await expect(page.getByText("Price includes 5% GST", { exact: false })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test("dresses above ₹2,500 carry the higher GST rate", async ({ page }) => {
    await page.goto("/products/indigo-tiered-maxi");
    await expect(page.getByTestId("price")).toHaveText("₹3,290");
    await expect(page.getByText("Price includes 18% GST", { exact: false })).toBeVisible();
  });

  test("stock follows the chosen size", async ({ page }) => {
    await page.goto(DRESS);
    await page.getByRole("button", { name: "S", exact: true }).click();
    await expect(page.getByTestId("stock")).toHaveText("Only 2 left");
    await page.getByRole("button", { name: "M", exact: true }).click();
    await expect(page.getByTestId("stock")).toHaveText("In stock");
  });

  test("a sold-out size disables Add to bag", async ({ page }) => {
    await page.goto(DRESS);
    await page.getByRole("button", { name: "XS (sold out)" }).click();
    await expect(page.getByTestId("stock")).toHaveText("Sold out in this option");
    await expect(page.getByRole("button", { name: "Sold out", exact: true })).toBeDisabled();
    await expect(page.getByTestId("quantity")).toHaveText("0");
  });

  test("quantity is capped by stock and multiplies the price", async ({ page }) => {
    await page.goto(DRESS);
    await page.getByRole("button", { name: "S", exact: true }).click();
    const plus = page.getByRole("button", { name: "Increase quantity" });
    await plus.click();
    await expect(page.getByTestId("quantity")).toHaveText("2");
    await expect(plus).toBeDisabled();
    expect(parseRupees((await page.getByTestId("price").textContent())!.split("₹")[1])).toBe(4998);
    await page.getByRole("button", { name: "Decrease quantity" }).click();
    await expect(page.getByTestId("quantity")).toHaveText("1");
  });

  test("a free-size saree has no size buttons", async ({ page }) => {
    await page.goto(SAREE);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Chettinad Cotton Saree");
    await expect(page.getByRole("button", { name: "M", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add to bag" })).toBeEnabled();
  });

  test("size guide link opens the size table", async ({ page }) => {
    await page.goto(DRESS);
    await page.getByRole("link", { name: /size guide/i }).first().click();
    await expect(page).toHaveURL(/\/help#sizes$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Size guide" })).toBeVisible();
  });

  test("suggests more from the same category, never itself", async ({ page }) => {
    await page.goto(DRESS);
    const more = page.locator("section", { has: page.getByRole("heading", { name: "More dresses" }) });
    await expect(more.getByTestId("product-card").filter({ visible: true }).first()).toBeVisible();
    await expect(more.locator(`[href="${DRESS}"]`)).toHaveCount(0);
  });

  // Next streams this page, so a missing product renders the not-found UI with status 200
  // plus <meta name="robots" content="noindex"> (documented Next 16 behaviour; see UI_REVIEW.md).
  test("unknown product shows not-found, is noindexed, and offers a way back", async ({ page }) => {
    await page.goto("/products/does-not-exist");
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
    await expect(page.getByRole("heading", { name: "This one isn't here." })).toBeVisible();
    await page.getByRole("link", { name: "Back to the shop" }).click();
    await expect(page).toHaveURL(/\/shop$/);
  });
});
