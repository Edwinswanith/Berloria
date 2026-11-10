import { z } from "zod";

const email = z.string().trim().toLowerCase().max(120).pipe(z.email("Enter a valid email address"));

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80, "That's too long"),
  email,
  password: z.string().min(8, "Use at least 8 characters").max(128, "That's too long"),
});
const signInSchema = z.object({ email, password: z.string().min(1, "Enter your password").max(128) });

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
type Parsed<T> = { success: true; data: T } | { success: false; errors: Record<string, string> };

function parse<T>(schema: z.ZodType<T>, raw: unknown): Parsed<T> {
  const result = schema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) errors[String(issue.path[0] ?? "form")] ??= issue.message;
  return { success: false, errors };
}

export const parseSignUp = (raw: unknown): Parsed<SignUpInput> => parse(signUpSchema, raw);
export const parseSignIn = (raw: unknown): Parsed<SignInInput> => parse(signInSchema, raw);

/** Only same-site paths are allowed as a post-login destination, so the link can't send people elsewhere. */
export function safeNextPath(value: unknown, fallback = "/shop"): string {
  if (typeof value !== "string" || !/^\/(?![/\\])[\w\-./?=&%[\]]*$/.test(value)) return fallback;
  return /^\/(login|signup|admin|api)(\/|$|\?)/.test(value) ? fallback : value;
}
