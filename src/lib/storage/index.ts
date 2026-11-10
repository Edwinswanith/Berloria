import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";

/**
 * Image storage. Locally files live in .data/uploads and are served by /media/[...path].
 *   sources/     photos of the real garment        — staff only
 *   candidates/  AI images awaiting review         — staff only
 *   gallery/     approved images shown in the shop — public
 * TODO(deploy): Vercel's filesystem is read-only, so swap this module for a blob store
 * (Vercel Blob / S3 / Cloudinary) before going live. Callers only use the functions below.
 */
export const FOLDERS = ["sources", "candidates", "gallery"] as const;
export type Folder = (typeof FOLDERS)[number];
export const PRIVATE_FOLDERS: readonly Folder[] = ["sources", "candidates"];

const ROOT = path.resolve(process.cwd(), ".data/uploads");
const KEY_PATTERN = /^(sources|candidates|gallery)\/[0-9a-f-]{36}\.webp$/;
const URL_PREFIX = "/media/";

export const keyToUrl = (key: string): string => `${URL_PREFIX}${key}`;

/** Storage key for one of our own URLs, or null for anything else (seed art, external URLs). */
export function urlToKey(url: string): string | null {
  const key = url.startsWith(URL_PREFIX) ? url.slice(URL_PREFIX.length) : "";
  return KEY_PATTERN.test(key) ? key : null;
}

function resolveKey(key: string): string {
  if (!KEY_PATTERN.test(key)) throw new Error("Invalid storage key");
  return path.join(ROOT, key);
}

export async function saveImage(folder: Folder, webp: Buffer): Promise<string> {
  const key = `${folder}/${randomUUID()}.webp`;
  await mkdir(path.join(ROOT, folder), { recursive: true });
  await writeFile(resolveKey(key), webp);
  return keyToUrl(key);
}

export async function readImage(key: string): Promise<Buffer> {
  return readFile(resolveKey(key));
}

/** Copy an image into another folder (e.g. candidate → gallery on approval). Returns the new URL. */
export async function copyImage(fromUrl: string, folder: Folder): Promise<string> {
  const fromKey = urlToKey(fromUrl);
  if (!fromKey) throw new Error("Not a stored image");
  const key = `${folder}/${randomUUID()}.webp`;
  await mkdir(path.join(ROOT, folder), { recursive: true });
  await copyFile(resolveKey(fromKey), resolveKey(key));
  return keyToUrl(key);
}

/** Best-effort delete; ignores URLs we don't own. */
export async function deleteImage(url: string): Promise<void> {
  const key = urlToKey(url);
  if (key) await rm(resolveKey(key), { force: true });
}
