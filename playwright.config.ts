import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// The admin flow signs in with the local staff login from .env.local (never hardcoded in tests).
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

/**
 * E2E flows run against the seeded local database (`npm run db` + `npm run seed`).
 * Storefront tests are read-only. The admin flow creates one draft product per run and deletes it again.
 */
// Specs that change data (publish a product, place an order) run after the read-only storefront specs.
const ADMIN = /(admin|orders)\.spec\.ts/;
const SETUP = /auth\.setup\.ts/;
const CUSTOMER_STATE = "e2e/.auth/customer.json";
const DESKTOP = { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } };

export default defineConfig({
  testDir: "./e2e",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // "setup" creates a shopper account and saves its sign-in for every other project.
  // Specs that change data (publish a product, place an order) run after the read-only storefront specs.
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "desktop", testIgnore: [ADMIN, SETUP], dependencies: ["setup"], use: { ...DESKTOP, storageState: CUSTOMER_STATE } },
    { name: "mobile", testIgnore: [ADMIN, SETUP], dependencies: ["setup"], use: { ...devices["Pixel 7"], storageState: CUSTOMER_STATE } },
    { name: "admin-desktop", testMatch: ADMIN, dependencies: ["desktop", "mobile"], use: { ...DESKTOP, storageState: CUSTOMER_STATE } },
    { name: "admin-mobile", testMatch: ADMIN, dependencies: ["desktop", "mobile"], use: { ...devices["Pixel 7"], storageState: CUSTOMER_STATE } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
