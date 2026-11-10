import sharp, { type Metadata } from "sharp";

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
export const MIN_SIDE_PX = 600;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

export class ImageRejectedError extends Error {}

/**
 * Validate an uploaded photo by decoding it (never trusting the file name or MIME header),
 * fix phone-camera rotation, and store a sensible working size.
 */
export async function normaliseUpload(bytes: Buffer): Promise<Buffer> {
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new ImageRejectedError("That photo is larger than 12 MB. Please use a smaller file.");
  let meta: Metadata;
  try {
    meta = await sharp(bytes).metadata();
  } catch {
    throw new ImageRejectedError("That file isn't an image we can read. Use a JPG, PNG or WebP photo.");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) throw new ImageRejectedError("Use a JPG, PNG or WebP photo.");
  if (Math.min(meta.width ?? 0, meta.height ?? 0) < MIN_SIDE_PX) {
    throw new ImageRejectedError(`That photo is too small. The shorter side should be at least ${MIN_SIDE_PX}px.`);
  }
  return sharp(bytes).rotate().resize(2000, 2000, { fit: "inside", withoutEnlargement: true }).webp({ quality: 90 }).toBuffer();
}

/** Crop a generated image to the shop's 4:5 frame and compress it for the web. */
export async function toGalleryImage(bytes: Buffer): Promise<Buffer> {
  return sharp(bytes).resize(1600, 2000, { fit: "cover", position: "attention" }).webp({ quality: 84 }).toBuffer();
}
