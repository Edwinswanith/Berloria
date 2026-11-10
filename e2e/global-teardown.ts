import { execSync } from "node:child_process";

/** Browser tests place real orders in the local database; remove them so stock and the dashboard stay clean. */
export default function globalTeardown(): void {
  execSync("npm run --silent e2e:clean", { stdio: "inherit" });
}
