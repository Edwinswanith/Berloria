import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { isValidObjectId, Types } from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { GeneratedImage, Product, Vendor, type GeneratedStatus, type SourceView } from "@/lib/db/models";
import { assertAdmin } from "@/lib/auth/admin";
import { GenerationError, getGenerator } from "@/lib/ai/generator";
import { buildPrompt, getShot, missingViews, pickSources, usesModelReference, type ShotKind } from "@/lib/ai/shots";
import { normaliseUpload, toGalleryImage } from "@/lib/media/process";
import { copyImage, deleteImage, readImage, saveImage, urlToKey } from "@/lib/storage";
import { logError } from "@/lib/log";
import { FREE_SIZE, publishBlockers, skuPrefix, slugify, type ProductInput } from "./product-input";

export class AdminError extends Error {}

export interface AdminProductRow {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: string;
  price: number;
  totalStock: number;
  thumb: string | null;
  imageCount: number;
  awaitingReview: number;
}

export interface AdminCandidate {
  id: string;
  shot: string;
  status: GeneratedStatus;
  url: string | null;
  error: string | null;
  generator: string;
}

export interface AdminProductDetail extends AdminProductRow {
  summary: string;
  description: string;
  story: string;
  materials: string[];
  edition: string;
  featured: boolean;
  gstRate: number;
  sized: boolean;
  stock: Record<string, number>;
  images: { url: string; alt: string; kind: string; ai: boolean }[];
  sourcePhotos: { url: string; view: SourceView }[];
  candidates: AdminCandidate[];
  blockers: string[];
}

async function ready(): Promise<void> {
  await assertAdmin();
  await connectDb();
}

function assertId(id: string): void {
  if (!isValidObjectId(id)) throw new AdminError("That product doesn't exist.");
}

async function loadProduct(id: string) {
  assertId(id);
  const product = await Product.findById(id);
  if (!product) throw new AdminError("That product doesn't exist.");
  return product;
}

function variantsFrom(input: ProductInput, prefix: string) {
  return Object.entries(input.stock).map(([size, stock]) => ({
    sku: size === FREE_SIZE ? prefix : `${prefix}-${size}`,
    options: size === FREE_SIZE ? {} : { Size: size },
    price: input.pricePaise,
    stock,
    active: true,
  }));
}

async function uniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title);
  const taken = await Product.find({ slug: new RegExp(`^${base}(-\\d+)?$`), ...(excludeId ? { _id: { $ne: excludeId } } : {}) }, { slug: 1 }).lean();
  const used = new Set(taken.map((p) => p.slug));
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
}

/* ---------------------------------- reads ---------------------------------- */

type LeanProduct = NonNullable<Awaited<ReturnType<typeof findLean>>>;
const findLean = (id: string) => Product.findById(id).lean();

function toRow(p: LeanProduct, awaitingReview: number): AdminProductRow {
  return {
    id: String(p._id),
    title: p.title,
    slug: p.slug,
    category: p.category,
    status: p.status,
    price: p.variants[0]?.price ?? 0,
    totalStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
    thumb: p.images[0]?.url ?? p.sourcePhotos?.[0]?.url ?? null,
    imageCount: p.images.length,
    awaitingReview,
  };
}

export async function listAdminProducts(): Promise<AdminProductRow[]> {
  await ready();
  const [products, waiting] = await Promise.all([
    Product.find().sort({ updatedAt: -1 }).lean(),
    GeneratedImage.aggregate<{ _id: Types.ObjectId; n: number }>([{ $match: { status: "ready" } }, { $group: { _id: "$productId", n: { $sum: 1 } } }]),
  ]);
  const byProduct = new Map(waiting.map((w) => [String(w._id), w.n]));
  return products.map((p) => toRow(p, byProduct.get(String(p._id)) ?? 0));
}

export async function getAdminProduct(id: string): Promise<AdminProductDetail | null> {
  await ready();
  if (!isValidObjectId(id)) return null;
  const [p, generated] = await Promise.all([findLean(id), GeneratedImage.find({ productId: id }).sort({ createdAt: -1 }).lean()]);
  if (!p) return null;

  // Show the newest candidate per shot.
  const latest = [...new Map([...generated].reverse().map((g) => [g.shot, g])).values()];
  const candidates = latest.map((g) => ({
    id: String(g._id), shot: g.shot, status: g.status as GeneratedStatus, url: g.url ?? null, error: g.error ?? null, generator: g.generator,
  }));
  const stock = Object.fromEntries(p.variants.map((v) => [optionsOf(v.options).Size ?? FREE_SIZE, v.stock]));

  return {
    ...toRow(p, candidates.filter((c) => c.status === "ready").length),
    summary: p.summary ?? "",
    description: p.description ?? "",
    story: p.story ?? "",
    materials: p.materials ?? [],
    edition: p.edition ?? "",
    featured: Boolean(p.featured),
    gstRate: p.gstRate,
    sized: !(FREE_SIZE in stock),
    stock,
    images: p.images.map((i) => ({ url: i.url, alt: i.alt, kind: i.kind ?? "other", ai: Boolean(i.ai) })),
    sourcePhotos: (p.sourcePhotos ?? []).map((s) => ({ url: s.url, view: s.view as SourceView })),
    candidates,
    blockers: publishBlockers({ imageCount: p.images.length, variants: p.variants, description: p.description ?? "" }),
  };
}

function optionsOf(options: unknown): Record<string, string> {
  if (options instanceof Map) return Object.fromEntries(options) as Record<string, string>;
  return (options ?? {}) as Record<string, string>;
}

/* --------------------------------- details --------------------------------- */

export async function createProduct(input: ProductInput): Promise<string> {
  await ready();
  const store = await Vendor.findOne({ status: "approved" }).lean();
  if (!store) throw new AdminError("The store hasn't been set up yet. Run the seed script.");
  const _id = new Types.ObjectId();
  await Product.create({
    _id,
    vendorId: store._id,
    title: input.title,
    slug: await uniqueSlug(input.title),
    summary: input.summary,
    description: input.description,
    story: input.story,
    materials: input.materials,
    category: input.category,
    edition: input.edition,
    featured: input.featured,
    tags: [input.category.toLowerCase(), ...input.materials.map((m) => m.toLowerCase())],
    options: FREE_SIZE in input.stock ? [] : [{ name: "Size", values: Object.keys(input.stock) }],
    variants: variantsFrom(input, skuPrefix(input.title, String(_id))),
    currency: store.currency,
    gstRate: input.gstRate,
    status: "draft",
  });
  return String(_id);
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  await ready();
  const product = await loadProduct(id);
  const prefix = product.variants[0]?.sku.split("-").slice(0, 2).join("-") || skuPrefix(input.title, id);
  await Product.updateOne(
    { _id: id },
    {
      $set: {
        title: input.title,
        summary: input.summary,
        description: input.description,
        story: input.story,
        materials: input.materials,
        category: input.category,
        edition: input.edition,
        featured: input.featured,
        gstRate: input.gstRate,
        options: FREE_SIZE in input.stock ? [] : [{ name: "Size", values: Object.keys(input.stock) }],
        variants: variantsFrom(input, prefix),
      },
    },
  );
}

export async function setProductStatus(id: string, status: "active" | "draft" | "archived"): Promise<void> {
  await ready();
  const product = await loadProduct(id);
  if (status === "active") {
    const blockers = publishBlockers({ imageCount: product.images.length, variants: product.variants, description: product.description ?? "" });
    if (blockers.length) throw new AdminError(blockers.join(" "));
  }
  await Product.updateOne({ _id: id }, { $set: { status } });
}

export async function deleteProduct(id: string): Promise<void> {
  await ready();
  const product = await loadProduct(id);
  if (product.status === "active") throw new AdminError("Unpublish this product before deleting it.");
  const candidates = await GeneratedImage.find({ productId: id }, { url: 1 }).lean();
  const urls = [...product.images.map((i) => i.url), ...(product.sourcePhotos ?? []).map((s) => s.url), ...candidates.flatMap((c) => (c.url ? [c.url] : []))];
  await Promise.all([Product.deleteOne({ _id: id }), GeneratedImage.deleteMany({ productId: id })]);
  await Promise.allSettled(urls.map(deleteImage));
}

/* ------------------------------ source photos ------------------------------ */

export async function addSourcePhoto(id: string, view: SourceView, bytes: Buffer): Promise<string> {
  await ready();
  const product = await loadProduct(id);
  const url = await saveImage("sources", await normaliseUpload(bytes));
  const previous = (product.sourcePhotos ?? []).find((s) => s.view === view);
  await Product.updateOne({ _id: id }, { $pull: { sourcePhotos: { view } } });
  await Product.updateOne({ _id: id }, { $push: { sourcePhotos: { url, view } } });
  if (previous) await deleteImage(previous.url);
  return url;
}

export async function removeSourcePhoto(id: string, view: SourceView): Promise<void> {
  await ready();
  const product = await loadProduct(id);
  const previous = (product.sourcePhotos ?? []).find((s) => s.view === view);
  await Product.updateOne({ _id: id }, { $pull: { sourcePhotos: { view } } });
  if (previous) await deleteImage(previous.url);
}

/* -------------------------------- AI studio -------------------------------- */

/** The one model who appears across the catalogue. Optional: without the file, the written description is used. */
const STUDIO_MODEL_PATH = path.join(process.cwd(), "public", "studio", "model.webp");

async function readStudioModel(): Promise<Buffer | null> {
  try {
    return await readFile(STUDIO_MODEL_PATH);
  } catch {
    return null; // no model photo configured
  }
}

export async function generateShot(id: string, shotId: string): Promise<AdminCandidate> {
  const session = await assertAdmin();
  await connectDb();
  const product = await loadProduct(id);
  const shot = getShot(shotId);
  if (!shot) throw new AdminError("Unknown photo type.");

  const photos = (product.sourcePhotos ?? []).map((s) => ({ url: s.url, view: s.view as SourceView }));
  const missing = missingViews(shot, photos.map((p) => p.view));
  if (missing.length) throw new AdminError(`Upload the ${missing.join(" and ")} photo first.`);

  const generator = getGenerator();
  const ordered = pickSources(shot, photos);
  const modelPhoto = usesModelReference(shot) ? await readStudioModel() : null;
  const prompt = buildPrompt(
    shot,
    { title: product.title, category: product.category, materials: product.materials ?? [], summary: product.summary ?? "" },
    ordered.map((p) => p.view),
    { modelReference: modelPhoto !== null },
  );

  // Replace earlier unapproved attempts at this shot.
  const stale = await GeneratedImage.find({ productId: id, shot: shotId, status: { $ne: "approved" } }, { url: 1 }).lean();
  await GeneratedImage.deleteMany({ _id: { $in: stale.map((s) => s._id) } });
  await Promise.allSettled(stale.flatMap((s) => (s.url ? [deleteImage(s.url)] : [])));

  const doc = await GeneratedImage.create({ productId: id, shot: shotId, status: "generating", prompt, generator: generator.name });
  try {
    const garmentPhotos = await Promise.all(ordered.map((p) => readImage(urlToKey(p.url)!)));
    const sources = modelPhoto ? [...garmentPhotos, modelPhoto] : garmentPhotos;
    const url = await saveImage("candidates", await toGalleryImage(await generator.generate({ prompt, sources })));
    await GeneratedImage.updateOne({ _id: doc._id }, { $set: { status: "ready", url } });
    return { id: String(doc._id), shot: shotId, status: "ready", url, error: null, generator: generator.name };
  } catch (error: unknown) {
    const message = error instanceof GenerationError ? error.message : "Something went wrong making this photo. Please try again.";
    if (!(error instanceof GenerationError)) logError("admin.generateShot", error, { productId: id, shot: shotId, by: session.sub });
    await GeneratedImage.updateOne({ _id: doc._id }, { $set: { status: "failed", error: message } });
    return { id: String(doc._id), shot: shotId, status: "failed", url: null, error: message, generator: generator.name };
  }
}

export async function reviewCandidate(candidateId: string, decision: "approve" | "reject"): Promise<void> {
  await ready();
  assertId(candidateId);
  const candidate = await GeneratedImage.findById(candidateId);
  if (!candidate || candidate.status !== "ready" || !candidate.url) throw new AdminError("That photo is no longer waiting for review.");

  if (decision === "reject") {
    await GeneratedImage.updateOne({ _id: candidateId }, { $set: { status: "rejected", reviewedAt: new Date() }, $unset: { url: 1 } });
    await deleteImage(candidate.url);
    return;
  }

  const product = await loadProduct(String(candidate.productId));
  const shot = getShot(candidate.shot);
  const kind: ShotKind | "other" = shot?.kind ?? "other";
  const url = await copyImage(candidate.url, "gallery");
  await Product.updateOne(
    { _id: product._id },
    { $push: { images: { url, alt: `${product.title} — ${shot?.label.toLowerCase() ?? "photo"}`, kind, ai: true } } },
  );
  await GeneratedImage.updateOne({ _id: candidateId }, { $set: { status: "approved", reviewedAt: new Date() } });
}

/* --------------------------------- gallery --------------------------------- */

export async function removeGalleryImage(id: string, url: string): Promise<void> {
  await ready();
  const product = await loadProduct(id);
  if (!product.images.some((i) => i.url === url)) throw new AdminError("That photo isn't in the gallery.");
  if (product.status === "active" && product.images.length === 1) throw new AdminError("A live product needs at least one photo. Add another first.");
  await Product.updateOne({ _id: id }, { $pull: { images: { url } } });
  await deleteImage(url);
}

export async function makeGalleryImageFirst(id: string, url: string): Promise<void> {
  await ready();
  const product = await loadProduct(id);
  const image = product.images.find((i) => i.url === url);
  if (!image) throw new AdminError("That photo isn't in the gallery.");
  const reordered = [image, ...product.images.filter((i) => i.url !== url)].map((i) => ({ url: i.url, alt: i.alt, kind: i.kind, ai: i.ai }));
  await Product.updateOne({ _id: id }, { $set: { images: reordered } });
}
