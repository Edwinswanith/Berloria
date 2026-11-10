import type { SourceView } from "@/lib/db/models/product";

export type ShotKind = "model" | "flat" | "detail";

export interface Shot {
  id: string;
  label: string;
  hint: string;
  kind: ShotKind;
  /** The uploaded view this shot is built from. */
  primaryView: SourceView;
  /** Views that must be uploaded before this shot can be generated. */
  requires: readonly SourceView[];
  direction: string;
}

export interface GarmentInfo {
  title: string;
  category: string;
  materials: string[];
  summary: string;
}

/**
 * The look of every model photo. Keeping one description means the same person and studio
 * appear across the whole catalogue. Change it here to restyle future shoots.
 */
export const STUDIO = {
  model:
    "a South Indian woman in her late twenties with medium-brown skin and shoulder-length dark hair, natural make-up, relaxed posture and a calm, friendly expression",
  backdrop: "a seamless warm off-white studio backdrop that fills the whole frame edge to edge, with a soft floor shadow",
  light: "soft, even daylight coming from the left (the light source itself stays out of frame), true-to-life colour",
} as const;

const VIEW_LABEL: Record<SourceView, string> = {
  front: "the FRONT of the garment",
  back: "the BACK of the garment",
  side: "the garment from the SIDE",
};

/**
 * Staff photos are quick phone snapshots. Naming each image's role, and saying what to ignore,
 * is what stops the room, hanger and indoor lighting leaking into the result.
 */
function describeReferences(views: readonly SourceView[]): string {
  const list = views.map((view, i) => `Image ${i + 1} shows ${VIEW_LABEL[view]}.`).join(" ");
  return (
    `Reference photos: ${list} They are casual phone snapshots taken in a shop. ` +
    "Use them only to learn what the garment looks like. Ignore everything else in them: the background, room, furniture, " +
    "hanger, hands, floor, shadows, camera tilt, creases and wrinkles from storage, and any yellow or blue colour cast from indoor lighting. " +
    "Show the garment clean, pressed and in its true colour as seen in neutral daylight."
  );
}

const FIDELITY =
  "Reproduce the garment exactly as shown in the reference photos: the same colour and shade, fabric texture and weight, " +
  "the same print, motif size, spacing and placement, embroidery, weave, neckline shape, sleeve length, hem length, " +
  "seams, buttons, borders and trims. Do not add, remove, restyle, simplify or invent any design detail. " +
  "If part of the garment is not visible in the photos, keep it plain and consistent with what is visible.";

const FRAME = "Photorealistic portrait 4:5 photograph, sharp focus across the whole garment, the garment centred and fully inside the frame, clean image with the garment as the only subject.";

const isSaree = (category: string): boolean => /saree|sari/i.test(category);

/** Sarees arrive folded, so they need their own instructions for both kinds of shot. */
function sareeDirection(shot: Shot): string {
  if (shot.kind === "model") {
    const pose = shot.id === "model-back" ? "seen from directly behind" : shot.id === "model-side" ? "turned about 45 degrees from the camera" : "standing and facing the camera";
    return (
      `Full-length photo of the model wearing the saree, ${pose}. The saree is draped in the classic Nivi style: neat pleats at the front, ` +
      "the pallu over the left shoulder falling down the back, the border running along the hem and the pallu edge. " +
      "Body colour, border design and width, and pallu pattern exactly as in the reference photos. Worn with a plain blouse in a matching colour."
    );
  }
  if (shot.kind === "flat") {
    return "The saree only, neatly folded as a product photo with the body, the border and part of the pallu clearly visible, with no person in the image.";
  }
  return shot.direction;
}

export const SHOTS: readonly Shot[] = [
  {
    id: "model-front", label: "On model · front", hint: "Full length, facing the camera", kind: "model",
    primaryView: "front", requires: ["front"],
    direction: "Full-length photo of the model wearing the garment, standing and facing the camera, arms relaxed, the whole garment visible from neckline to hem. She fills most of the frame height, head to toe.",
  },
  {
    id: "model-back", label: "On model · back", hint: "Full length, from behind", kind: "model",
    primaryView: "back", requires: ["back"],
    direction: "Full-length photo of the model wearing the garment, seen from directly behind, hair moved aside so the back neckline is visible.",
  },
  {
    id: "model-side", label: "On model · three-quarter", hint: "Turned slightly, shows the drape", kind: "model",
    primaryView: "side", requires: ["front"],
    direction: "Full-length photo of the model wearing the garment, turned about 45 degrees from the camera in a natural walking pose that shows how the fabric falls.",
  },
  {
    id: "flat-front", label: "Without model · front", hint: "Garment only, clean backdrop", kind: "flat",
    primaryView: "front", requires: ["front"],
    direction: "The garment only, shown from the front as an invisible-mannequin (ghost mannequin) product photo so it holds its natural shape, with no person, no model, no mannequin and no hanger visible, floating upright against the backdrop.",
  },
  {
    id: "flat-back", label: "Without model · back", hint: "Garment only, from behind", kind: "flat",
    primaryView: "back", requires: ["back"],
    direction: "The garment only, shown from the back as an invisible-mannequin (ghost mannequin) product photo so it holds its natural shape, with no person, no model, no mannequin and no hanger visible, floating upright against the backdrop.",
  },
  {
    id: "detail", label: "Fabric detail", hint: "Close-up of fabric and finish", kind: "detail",
    primaryView: "front", requires: ["front"],
    direction: "A close-up of the garment's neckline and upper body, with no person visible, showing the fabric texture, print and stitching clearly with shallow depth of field.",
  },
];

export const getShot = (id: string): Shot | undefined => SHOTS.find((s) => s.id === id);

export function missingViews(shot: Shot, uploaded: readonly SourceView[]): SourceView[] {
  return shot.requires.filter((v) => !uploaded.includes(v));
}

/** Primary view first, then the other photos as supporting references. */
export function pickSources<T extends { view: SourceView }>(shot: Shot, photos: readonly T[]): T[] {
  return [...photos].sort((a, b) => Number(b.view === shot.primaryView) - Number(a.view === shot.primaryView));
}

/** Staff-entered text goes into the prompt as plain description only: single line, no quotes. */
function clean(text: string, max: number): string {
  return text.replace(/[\r\n"`]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export interface PromptOptions {
  /** True when the studio model photo is attached after the garment photos. */
  modelReference?: boolean;
}

/** Only model shots use the studio model photo. */
export const usesModelReference = (shot: Shot): boolean => shot.kind === "model";

export function buildPrompt(
  shot: Shot,
  garment: GarmentInfo,
  views: readonly SourceView[] = [shot.primaryView],
  options: PromptOptions = {},
): string {
  const about = [
    `Garment: ${clean(garment.title, 120)} (${clean(garment.category, 40)}).`,
    garment.materials.length ? `Fabric: ${clean(garment.materials.join(", "), 160)}.` : "",
    garment.summary ? `Notes: ${clean(garment.summary, 200)}` : "",
  ].filter(Boolean).join(" ");

  const styling = "Plain, simple footwear; no jewellery that hides the garment.";
  const subject = !usesModelReference(shot)
    ? ""
    : options.modelReference
      ? `Image ${views.length + 1} shows the model who wears the garment. She must be the same person: same face, hair, skin tone and build. ` +
        `Take only her identity from that image and ignore her clothes, pose, framing and background. ${styling}`
      : `The model is ${STUDIO.model}. ${styling}`;
  return [
    "Create a professional e-commerce fashion photograph of the garment in the reference photos.",
    describeReferences(views),
    FIDELITY,
    about,
    isSaree(garment.category) ? sareeDirection(shot) : shot.direction,
    subject,
    `Setting: ${STUDIO.backdrop}. Lighting: ${STUDIO.light}.`,
    FRAME,
  ].filter(Boolean).join("\n");
}
