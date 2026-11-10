/**
 * Server-side error log. One place to swap in a real logger (pino, Sentry) later.
 * Never pass secrets or full request bodies here.
 */
export function logError(scope: string, error: unknown, context: Record<string, unknown> = {}): void {
  const detail = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
  process.stderr.write(`${JSON.stringify({ level: "error", scope, ...context, ...detail, at: new Date().toISOString() })}\n`);
}
