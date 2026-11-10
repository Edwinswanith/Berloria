"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { checkAdminCredentials, createAdminSession, destroyAdminSession, UnauthorizedError } from "@/lib/auth/admin";
import { createRateLimiter } from "@/lib/auth/rate-limit";
import { parseProductInput } from "@/lib/admin/product-input";
import {
  AdminError, createProduct, deleteProduct, makeGalleryImageFirst, removeGalleryImage,
  removeSourcePhoto, reviewCandidate, setProductStatus, updateProduct,
} from "@/lib/admin/products";
import { updateOrderStatus } from "@/lib/admin/orders";
import { SOURCE_VIEWS, type SourceView } from "@/lib/db/models";
import { SHIPMENT_STATUSES, type ShipmentStatus } from "@/lib/domain/fulfillment";
import { logError } from "@/lib/log";

export interface ActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
}

/** 5 attempts per 15 minutes per IP address. */
const loginLimiter = createRateLimiter({ limit: 5, windowMs: 15 * 60_000 });

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await clientIp();
  const attempt = loginLimiter.hit(ip);
  if (!attempt.allowed) return { error: `Too many attempts. Try again in ${Math.ceil(attempt.retryAfterMs / 60_000)} minutes.` };

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!checkAdminCredentials(email, password)) return { error: "That email or password isn't right." };

  loginLimiter.reset(ip);
  await createAdminSession(email);
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/login");
}

/** Run a mutation, turning expected failures into a message for the UI. */
async function attempt(scope: string, run: () => Promise<void>): Promise<ActionState> {
  try {
    await run();
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    if (error instanceof AdminError) return { error: error.message };
    logError(scope, error);
    return { error: "Something went wrong. Please try again." };
  }
  refresh();
  return { ok: true };
}

function readProductForm(formData: FormData) {
  const stock = Object.fromEntries(
    [...formData.entries()].filter(([k]) => k.startsWith("stock.")).map(([k, v]) => [k.slice("stock.".length), String(v)]),
  );
  const fields = ["title", "category", "price", "summary", "description", "story", "materials", "edition", "featured", "sized"] as const;
  return { ...Object.fromEntries(fields.flatMap((f) => (formData.has(f) ? [[f, String(formData.get(f))]] : []))), stock };
}

export async function saveProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseProductInput(readProductForm(formData));
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: parsed.errors };

  const id = String(formData.get("id") ?? "");
  if (id) return attempt("admin.updateProduct", () => updateProduct(id, parsed.data));

  let newId = "";
  const result = await attempt("admin.createProduct", async () => {
    newId = await createProduct(parsed.data);
  });
  if (result.error) return result;
  redirect(`/admin/products/${newId}?created=1`);
}

export async function setStatusAction(id: string, status: "active" | "draft" | "archived"): Promise<ActionState> {
  return attempt("admin.setStatus", () => setProductStatus(id, status));
}

export async function deleteProductAction(id: string): Promise<ActionState> {
  const result = await attempt("admin.deleteProduct", () => deleteProduct(id));
  if (result.error) return result;
  redirect("/admin/products");
}

export async function removeSourcePhotoAction(id: string, view: string): Promise<ActionState> {
  if (!SOURCE_VIEWS.includes(view as SourceView)) return { error: "Unknown photo." };
  return attempt("admin.removeSourcePhoto", () => removeSourcePhoto(id, view as SourceView));
}

export async function reviewCandidateAction(candidateId: string, decision: "approve" | "reject"): Promise<ActionState> {
  return attempt("admin.reviewCandidate", () => reviewCandidate(candidateId, decision));
}

export async function removeGalleryImageAction(id: string, url: string): Promise<ActionState> {
  return attempt("admin.removeGalleryImage", () => removeGalleryImage(id, url));
}

export async function makeFirstAction(id: string, url: string): Promise<ActionState> {
  return attempt("admin.makeFirst", () => makeGalleryImageFirst(id, url));
}

/** Order handling: confirm, pack, ship (needs courier + tracking number), deliver, or cancel (needs a reason). */
export async function updateOrderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const to = String(formData.get("to") ?? "") as ShipmentStatus;
  if (!SHIPMENT_STATUSES.includes(to)) return { error: "Unknown step." };
  return attempt("admin.updateOrder", () =>
    updateOrderStatus(id, {
      to,
      carrier: String(formData.get("carrier") ?? ""),
      trackingNumber: String(formData.get("trackingNumber") ?? ""),
      note: String(formData.get("note") ?? ""),
    }),
  );
}
