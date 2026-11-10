import "server-only";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import { logError } from "@/lib/log";

export interface GenerateRequest {
  prompt: string;
  /** Reference photos of the real garment (WebP), most relevant first. */
  sources: Buffer[];
}

export interface ImageGenerator {
  /** Recorded on each generated image so results can be traced to a model. */
  readonly name: string;
  generate(request: GenerateRequest): Promise<Buffer>;
}

export class GenerationError extends Error {}

const DEFAULT_MODEL = "gemini-nano-banana-2.1";
const TIMEOUT_MS = 110_000;

/** Google Gemini image model via the Interactions API. */
function geminiGenerator(apiKey: string): ImageGenerator {
  const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL;
  const imageSize = process.env.GEMINI_IMAGE_SIZE || "2K";
  // Image input and image output on the Interactions API are served from v1beta.
  const ai = new GoogleGenAI({ apiKey, apiVersion: "v1beta" });
  return {
    name: model,
    async generate({ prompt, sources }) {
      try {
        const interaction = await ai.interactions.create(
          {
            model,
            input: [
              { type: "text", text: prompt },
              ...sources.map((data) => ({ type: "image" as const, mime_type: "image/webp" as const, data: data.toString("base64") })),
            ],
            response_format: { type: "image", aspect_ratio: "4:5", image_size: imageSize },
            // Nothing about a garment shoot needs to be kept on Google's side.
            store: false,
          },
          { timeout: TIMEOUT_MS },
        );
        const data = interaction.output_image?.data;
        if (!data) throw new GenerationError("The image model returned no image. Try again, or adjust the source photos.");
        return Buffer.from(data, "base64");
      } catch (error: unknown) {
        if (error instanceof GenerationError) throw error;
        // Log the provider's detail server-side; show staff a short, safe message.
        logError("ai.gemini", error, { model });
        const status = (error as { status?: number }).status;
        if (status === 401 || status === 403) throw new GenerationError("The Gemini API key was rejected. Check GEMINI_API_KEY.");
        if (status === 429) throw new GenerationError("The image service is busy or out of quota. Wait a minute and try again.");
        throw new GenerationError("The image service couldn't make this photo. Please try again.");
      }
    },
  };
}

/**
 * Stand-in used in development when no API key is set, so the whole upload → review → publish
 * flow can be exercised. It frames the uploaded photo on the studio backdrop and labels it clearly.
 */
function mockGenerator(): ImageGenerator {
  return {
    name: "mock",
    async generate({ sources }) {
      if (sources.length === 0) throw new GenerationError("No source photo to work from.");
      const garment = await sharp(sources[0]).resize(1200, 1500, { fit: "inside" }).toBuffer();
      const label = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="2000">
          <rect x="0" y="1880" width="1600" height="120" fill="#161616"/>
          <text x="800" y="1955" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="44" fill="#ffffff">SAMPLE ONLY — add GEMINI_API_KEY for real AI photos</text>
        </svg>`,
      );
      return sharp({ create: { width: 1600, height: 2000, channels: 3, background: "#f3f0ea" } })
        .composite([{ input: garment, gravity: "centre" }, { input: label }])
        .webp({ quality: 84 })
        .toBuffer();
    },
  };
}

export function getGenerator(): ImageGenerator {
  const key = process.env.GEMINI_API_KEY;
  if (key) return geminiGenerator(key);
  if (process.env.NODE_ENV === "production") throw new GenerationError("GEMINI_API_KEY is not set.");
  return mockGenerator();
}

/** True when real AI generation is configured (used to show a notice in the studio). */
export const isAiConfigured = (): boolean => Boolean(process.env.GEMINI_API_KEY);
