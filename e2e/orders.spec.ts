import type { Page } from "@playwright/test";
import { test, expect, expectNoHorizontalScroll } from "./fixtures";

const EMAIL = process.env.ADMIN_EMAIL ?? "";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const PHONE = "98400 12345";
/** Orders are placed by the shared test shopper (see auth.setup.ts) and removed again by scripts/clear-test-orders.ts. */

async function addToBag(page: Page, slug: string, size: string): Promise<void> {
  await page.goto(`/products/${slug}`);
  await page.getByRole("button", { name: size, exact: true }).click();
  await page.getByRole("button", { name: "Add to bag" }).click();
  await expect(page.getByRole("status").filter({ hasText: "added to your bag" })).toBeVisible();
}

async function fillCheckout(page: Page, name: string): Promise<void> {
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Mobile number").fill(PHONE);
  await page.getByLabel("House / flat number and street").fill("14, 2nd Main Road, Adyar");
  await page.getByLabel("City / town").fill("Chennai");
  await page.getByLabel("PIN code").fill("600020");
  await page.getByLabel("State").selectOption("Tamil Nadu");
}

async function placeOrder(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByTestId("order-confirmed")).toBeVisible({ timeout: 15_000 });
  const number = (await page.getByTestId("order-confirmed").textContent())!.match(/BF-\d+/)![0];
  return number;
}

/** The order page's own status pill (the list behind it stays mounted but hidden). */
const orderStatus = (page: Page) => page.getByRole("main").getByTestId("order-status").filter({ visible: true });

async function signIn(page: Page): Promise<void> {
  await page.goto("/admin");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("Customer: bag and checkout", () => {
  test("an empty bag says so and leads back to the shop", async ({ page }) => {
    await page.goto("/bag");
    await expect(page.getByTestId("bag-empty")).toBeVisible();
    await page.getByRole("link", { name: "Start shopping" }).click();
    await expect(page).toHaveURL(/\/shop$/);
    await page.goto("/checkout");
    await expect(page.getByText("Your bag is empty")).toBeVisible();
  });

  test("bag keeps quantities, totals and the free-delivery mark in step", async ({ page }) => {
    await addToBag(page, "kalamkari-straight-kurta", "M"); // ₹1,790: below free delivery
    await expect(page.getByTestId("bag-count")).toHaveText("1");
    await page.goto("/bag");
    await expect(page.getByTestId("bag-line")).toHaveCount(1);
    await expect(page.getByTestId("summary-delivery")).toHaveText("₹79");
    await expect(page.getByTestId("summary-total")).toHaveText("₹1,869");
    await expect(page.getByTestId("delivery-progress")).toContainText("₹209");

    await page.getByRole("button", { name: "Increase quantity" }).click();
    await expect(page.getByTestId("line-qty")).toHaveText("2");
    await expect(page.getByTestId("summary-delivery")).toHaveText("Free");
    await expect(page.getByTestId("summary-total")).toHaveText("₹3,580");
    await expectNoHorizontalScroll(page);

    await page.reload();
    await expect(page.getByTestId("line-qty"), "the bag survives a reload").toHaveText("2");
    await page.getByRole("button", { name: /^Remove / }).click();
    await expect(page.getByTestId("bag-empty")).toBeVisible();
  });

  test("checkout explains what's missing before it places anything", async ({ page, consoleErrors }) => {
    await addToBag(page, "kalamkari-straight-kurta", "M");
    await page.goto("/checkout");
    await expect(page.getByTestId("summary-total")).toHaveText("₹1,869");
    await page.getByRole("button", { name: "Place order" }).click();
    await expect(page.getByLabel("Full name"), "the name comes from the account").toHaveValue("Priya Test");
    await expect(page.getByText("Enter your house number and street")).toBeVisible();
    await expect(page.getByText("Enter a 10-digit Indian mobile number")).toBeVisible();
    await expect(page.getByText("Enter a 6-digit PIN code")).toBeVisible();
    await expect(page.locator("#state-error")).toHaveText("Choose your state");
    await expect(page).toHaveURL(/\/checkout$/);
    expect(consoleErrors.filter((e) => !e.includes("status of 400")), "only the expected validation response").toEqual([]);
    consoleErrors.length = 0;
    await expectNoHorizontalScroll(page);
  });
});

test.describe("Order: from checkout to delivery", () => {
  test.skip(!EMAIL || !PASSWORD, "ADMIN_EMAIL / ADMIN_PASSWORD are not set in .env.local");

  test("customer orders, staff call and ship it, customer tracks it", async ({ page, consoleErrors }, testInfo) => {
    test.setTimeout(120_000);
    await addToBag(page, "jasmine-shirt-dress", "L");
    await page.goto("/checkout");
    await fillCheckout(page, `Priya ${testInfo.project.name}`);
    await expect(page.getByLabel("Pay after we confirm")).toBeChecked();
    const orderNumber = await placeOrder(page);
    const orderUrl = page.url();
    expect(orderUrl).toContain("key=");
    await expect(page.getByRole("heading", { name: /Thank you, Priya/ })).toBeVisible();
    await expect(page.getByTestId("contact-notice")).toContainText("+919840012345");
    await expect(page.getByTestId("payment-summary")).toContainText("₹2,190 to pay. Our team will contact you");
    await expect(page.getByTestId("order-progress").locator('[aria-current="step"]')).toContainText("Order placed");
    await expectNoHorizontalScroll(page);

    // The bag is empty again, and the address is remembered for next time.
    await page.goto("/bag");
    await expect(page.getByTestId("bag-empty")).toBeVisible();

    // The order is listed in the shopper's account and opens from there.
    await page.goto("/account");
    await page.getByTestId("my-orders").getByRole("link", { name: new RegExp(orderNumber) }).click();
    await expect(page).toHaveURL(new RegExp(`/orders/${orderNumber}\\?key=`));
    await expect(page.getByRole("heading", { name: "Your order" })).toBeVisible();

    // Nobody can open the order without its key.
    await page.goto(`/orders/${orderNumber}?key=aaaaaaaaaaaaaaaaaaaaaaaa`);
    await expect(page.getByRole("heading", { name: "This one isn't here." })).toBeVisible();
    consoleErrors.length = 0; // the not-found response logs a 404 in the browser console

    // Staff: confirm → pack → ship → deliver.
    // Staff are told about the new order, with the customer's phone number and email.
    await signIn(page);
    const alert = page.getByTestId("to-contact").getByRole("listitem").filter({ hasText: orderNumber });
    await expect(alert.getByRole("link", { name: "Call +919840012345" })).toHaveAttribute("href", "tel:+919840012345");
    await expect(alert.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", /wa\.me\/919840012345/);
    await expect(alert).toContainText("@berloria.example");
    await expect(page.getByTestId("orders-badge").filter({ visible: true })).toBeVisible();
    await page.goto("/admin/orders?show=new");
    await page.getByRole("link", { name: new RegExp(orderNumber) }).click();
    await expect(page.getByRole("heading", { name: orderNumber })).toBeVisible();
    await expect(page.getByTestId("call-customer").filter({ visible: true })).toContainText("Call Priya to confirm");
    await expect(page.getByText("Collect ₹2,190 from the customer")).toBeVisible();
    await expectNoHorizontalScroll(page);

    await page.getByRole("button", { name: "Confirm order" }).click();
    await expect(orderStatus(page)).toHaveText("Confirmed");
    await expect(page.getByTestId("call-customer"), "confirming clears the call reminder").toHaveCount(0);
    await page.getByRole("button", { name: "Mark payment received" }).click();
    await expect(page.getByText("Payment received.")).toBeVisible();
    await page.getByRole("button", { name: "Mark as packed" }).click();
    await expect(orderStatus(page)).toHaveText("Packed");
    await page.getByRole("button", { name: "Mark as shipped" }).click();
    await expect(orderStatus(page), "shipping needs a courier and tracking number").toHaveText("Packed");
    await page.getByLabel("Courier").fill("Delhivery");
    await page.getByLabel("Tracking number").fill("DL123456789");
    await page.getByRole("button", { name: "Mark as shipped" }).click();
    await expect(orderStatus(page)).toHaveText("Shipped");

    // Customer sees the tracking number.
    const adminUrl = page.url();
    await page.goto(orderUrl.replace("&placed=1", ""));
    await expect(page.getByTestId("order-progress").locator('[aria-current="step"]')).toContainText("Shipped");
    await expect(page.getByTestId("order-progress")).toContainText("Delhivery · DL123456789");

    await page.goto(adminUrl);
    await page.getByRole("button", { name: "Mark as delivered" }).click();
    await expect(orderStatus(page)).toHaveText("Delivered");
    await expect(page.getByText(/Payment received/).first()).toBeVisible();
    await expect(page.getByTestId("order-actions")).toHaveCount(0);
    await expect(page.getByTestId("order-history").getByRole("listitem")).toHaveCount(5);
  });

  test("ordering takes stock and cancelling gives it back", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    // A different style per screen size, so the two runs don't change each other's stock.
    const [slug, before, after] = testInfo.project.name.includes("mobile")
      ? ["ikat-a-line-kurta", "Only 2 left", "Only 1 left"]
      : ["mul-cotton-sundress", "Only 3 left", "Only 2 left"];

    await page.goto(`/products/${slug}`);
    await page.getByRole("button", { name: /^XS/ }).click();
    await expect(page.getByTestId("stock")).toHaveText(before);
    await page.getByRole("button", { name: "Add to bag" }).click();
    await page.goto("/checkout");
    await fillCheckout(page, `Meena ${testInfo.project.name}`);
    const orderNumber = await placeOrder(page);
    const orderUrl = page.url();

    await page.goto(`/products/${slug}`);
    await page.getByRole("button", { name: /^XS/ }).click();
    await expect(page.getByTestId("stock")).toHaveText(after);

    await signIn(page);
    await page.goto("/admin/orders?show=to-fulfil");
    await page.getByRole("link", { name: new RegExp(orderNumber) }).click();
    await page.getByRole("button", { name: "Cancel order" }).click();
    await page.getByLabel("Reason for cancelling").fill("Customer asked to cancel");
    await page.getByRole("button", { name: "Cancel this order" }).click();
    await expect(orderStatus(page)).toHaveText("Cancelled");

    await page.goto(`/products/${slug}`);
    await page.getByRole("button", { name: /^XS/ }).click();
    await expect(page.getByTestId("stock")).toHaveText(before);

    await page.goto(orderUrl);
    await expect(page.getByRole("heading", { name: "Order cancelled" })).toBeVisible();
    await expect(page.getByText(/Customer asked to cancel/)).toBeVisible();
  });
});
