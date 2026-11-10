"use client";
/* eslint-disable @next/next/no-img-element -- staff-only media is served with the session cookie, not through the image optimiser */

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeSourcePhotoAction, reviewCandidateAction } from "@/app/admin/actions";

type View = "front" | "back" | "side";

export interface StudioShot {
  id: string;
  label: string;
  hint: string;
  kind: "model" | "flat" | "detail";
  requires: View[];
}

export interface StudioCandidate {
  id: string;
  shot: string;
  status: "generating" | "ready" | "approved" | "rejected" | "failed";
  url: string | null;
  error: string | null;
}

interface PhotoStudioProps {
  productId: string;
  sourcePhotos: { url: string; view: View }[];
  candidates: StudioCandidate[];
  shots: StudioShot[];
  aiConfigured: boolean;
}

const VIEWS: { view: View; label: string; note: string }[] = [
  { view: "front", label: "Front", note: "Required" },
  { view: "back", label: "Back", note: "For back shots" },
  { view: "side", label: "Side", note: "Optional, helps the drape" },
];
const KIND_HEADING = { model: "On a model", flat: "Without a model", detail: "Detail" } as const;
const PARALLEL = 3;

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function postJson<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, { method: "POST", ...init });
  const body = (await res.json().catch(() => null)) as ApiResult<T> | null;
  if (!res.ok || !body?.success || body.data === undefined) throw new Error(body?.error ?? "Something went wrong. Please try again.");
  return body.data;
}

export function PhotoStudio({ productId, sourcePhotos, candidates, shots, aiConfigured }: PhotoStudioProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [uploading, setUploading] = useState<Partial<Record<View, boolean>>>({});
  const [busyShots, setBusyShots] = useState<ReadonlySet<string>>(new Set());
  const [shotErrors, setShotErrors] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const uploaded = sourcePhotos.map((p) => p.view);
  const missing = (shot: StudioShot) => shot.requires.filter((v) => !uploaded.includes(v));
  const candidateFor = (shotId: string) => candidates.find((c) => c.shot === shotId);
  const refresh = () => startTransition(() => router.refresh());

  async function upload(view: View, file: File | undefined) {
    if (!file) return;
    setMessage(null);
    setUploading((u) => ({ ...u, [view]: true }));
    try {
      const form = new FormData();
      form.set("view", view);
      form.set("file", file);
      await postJson(`/api/admin/products/${productId}/photos`, { body: form });
      refresh();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading((u) => ({ ...u, [view]: false }));
    }
  }

  async function generate(shotId: string) {
    setBusyShots((s) => new Set(s).add(shotId));
    setShotErrors((e) => Object.fromEntries(Object.entries(e).filter(([id]) => id !== shotId)));
    try {
      const result = await postJson<StudioCandidate>(`/api/admin/products/${productId}/generate`, {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shot: shotId }),
      });
      if (result.status === "failed") setShotErrors((e) => ({ ...e, [shotId]: result.error ?? "This photo couldn't be made." }));
    } catch (error: unknown) {
      setShotErrors((e) => ({ ...e, [shotId]: error instanceof Error ? error.message : "This photo couldn't be made." }));
    } finally {
      setBusyShots((s) => new Set([...s].filter((id) => id !== shotId)));
      refresh();
    }
  }

  async function generateAll() {
    const queue = shots.filter((s) => missing(s).length === 0 && candidateFor(s.id)?.status !== "approved" && !busyShots.has(s.id)).map((s) => s.id);
    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) await generate(next);
    };
    await Promise.all(Array.from({ length: PARALLEL }, worker));
  }

  async function review(candidateId: string, decision: "approve" | "reject") {
    setReviewing(candidateId);
    setMessage(null);
    const result = await reviewCandidateAction(candidateId, decision);
    if (result.error) setMessage(result.error);
    setReviewing(null);
  }

  async function removeSource(view: View) {
    const result = await removeSourcePhotoAction(productId, view);
    if (result.error) setMessage(result.error);
  }

  const canGenerateAny = shots.some((s) => missing(s).length === 0);
  const anyBusy = busyShots.size > 0;

  return (
    <div className="space-y-10">
      <section aria-labelledby="studio-step-1">
        <h3 id="studio-step-1" className="text-sm font-medium"><StepDot n={1} /> Upload photos of the real dress</h3>
        <p className="mt-1 text-sm text-muted">
          Plain background, good light, the whole garment in frame, on a hanger or laid flat. These are never shown to customers.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:gap-4">
          {VIEWS.map(({ view, label, note }) => (
            <SourceSlot
              key={view}
              label={label}
              note={note}
              url={sourcePhotos.find((p) => p.view === view)?.url}
              busy={Boolean(uploading[view])}
              onPick={(file) => upload(view, file)}
              onRemove={() => removeSource(view)}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="studio-step-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 id="studio-step-2" className="text-sm font-medium"><StepDot n={2} /> Create shop photos</h3>
            <p className="mt-1 text-sm text-muted">Each photo takes about 20–40 seconds. Compare every result with the real dress before approving it.</p>
          </div>
          <button type="button" className="btn-sm-primary" disabled={!canGenerateAny || anyBusy} onClick={generateAll}>
            {anyBusy ? "Working…" : "Create all photos"}
          </button>
        </div>

        {!aiConfigured && (
          <p className="mt-4 rounded-lg border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-warn" data-testid="ai-not-configured">
            Sample mode: no Gemini API key is set, so results are labelled samples made from your upload. Add GEMINI_API_KEY to turn on real AI photos.
          </p>
        )}
        {message && <p role="alert" className="mt-4 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">{message}</p>}

        {(["model", "flat", "detail"] as const).map((kind) => (
          <div key={kind} className="mt-6">
            <p className="eyebrow mb-3">{KIND_HEADING[kind]}</p>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {shots.filter((s) => s.kind === kind).map((shot) => (
                <ShotCard
                  key={shot.id}
                  shot={shot}
                  candidate={candidateFor(shot.id)}
                  missing={missing(shot)}
                  busy={busyShots.has(shot.id)}
                  error={shotErrors[shot.id]}
                  reviewing={reviewing === candidateFor(shot.id)?.id}
                  onGenerate={() => generate(shot.id)}
                  onReview={(decision) => review(candidateFor(shot.id)!.id, decision)}
                />
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}

function StepDot({ n }: { n: number }) {
  return <span className="mr-2 inline-grid h-5 w-5 place-items-center rounded-full bg-ink text-[11px] text-paper">{n}</span>;
}

interface SourceSlotProps {
  label: string;
  note: string;
  url?: string;
  busy: boolean;
  onPick: (file: File | undefined) => void;
  onRemove: () => void;
}

function SourceSlot({ label, note, url, busy, onPick, onRemove }: SourceSlotProps) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-dashed border-ink/25 bg-mist/70">
        {url ? (
          <img src={url} alt={`${label} photo of the garment`} className="h-full w-full object-cover" />
        ) : (
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className="grid h-full w-full place-items-center p-2 text-center text-xs text-muted hover:text-ink">
            <span>
              <span aria-hidden className="mb-1 block text-2xl leading-none">+</span>
              {busy ? "Uploading…" : `Add ${label.toLowerCase()} photo`}
            </span>
          </button>
        )}
        {busy && url && <div className="absolute inset-0 grid place-items-center bg-paper/70 text-xs">Uploading…</div>}
      </div>
      <input
        ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={`${label} photo`}
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="mt-2 flex flex-wrap items-start justify-between gap-x-2 gap-y-1 text-xs">
        <span>
          <span className="font-medium">{label}</span>
          <span className="block text-muted">{note}</span>
        </span>
        {url && (
          <span className="flex gap-2">
            <button type="button" onClick={() => input.current?.click()} className="underline underline-offset-2">Replace</button>
            <button type="button" onClick={onRemove} className="text-muted underline underline-offset-2" aria-label={`Remove ${label.toLowerCase()} photo`}>Remove</button>
          </span>
        )}
      </div>
    </div>
  );
}

interface ShotCardProps {
  shot: StudioShot;
  candidate?: StudioCandidate;
  missing: View[];
  busy: boolean;
  error?: string;
  reviewing: boolean;
  onGenerate: () => void;
  onReview: (decision: "approve" | "reject") => void;
}

function ShotCard({ shot, candidate, missing, busy, error, reviewing, onGenerate, onReview }: ShotCardProps) {
  const status = busy ? "generating" : candidate?.status;
  const failure = error ?? (status === "failed" ? candidate?.error : null);
  const blocked = missing.length > 0;

  return (
    <li className="flex flex-col" data-testid={`shot-${shot.id}`} data-status={status ?? "empty"}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-mist">
        {candidate?.url && status !== "generating" && <img src={candidate.url} alt={`${shot.label}, AI result`} className="h-full w-full object-cover" />}
        {status === "generating" && (
          <div className="absolute inset-0 grid place-items-center text-center text-xs text-muted" role="status">
            <span>
              <span className="mx-auto mb-2 block h-5 w-5 animate-spin rounded-full border-2 border-ink/20 border-t-ink" aria-hidden />
              Making photo…
            </span>
          </div>
        )}
        {!candidate?.url && status !== "generating" && (
          <div className="absolute inset-0 grid place-items-center p-3 text-center text-xs text-muted">
            {blocked ? `Needs the ${missing.join(" and ")} photo` : failure ? "No photo yet" : shot.hint}
          </div>
        )}
        {status === "approved" && <span className="absolute left-2 top-2 rounded-full bg-ok px-2 py-0.5 text-[11px] text-paper">In gallery</span>}
        {status === "ready" && <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 text-[11px] text-paper">Check this</span>}
      </div>

      <p className="mt-2 text-xs font-medium">{shot.label}</p>
      {failure && <p role="alert" className="mt-1 text-xs text-accent">{failure}</p>}

      <div className="mt-2 flex flex-wrap gap-2">
        {status === "ready" ? (
          <>
            <button type="button" className="btn-sm-primary" disabled={reviewing} onClick={() => onReview("approve")}>Approve</button>
            <button type="button" className="btn-sm" disabled={reviewing} onClick={onGenerate}>Try again</button>
            <button type="button" className="btn-sm" disabled={reviewing} onClick={() => onReview("reject")} aria-label={`Reject ${shot.label}`}>Reject</button>
          </>
        ) : (
          <button type="button" className="btn-sm" disabled={blocked || status === "generating"} onClick={onGenerate}>
            {status === "approved" ? "Make another" : status === "failed" || status === "rejected" ? "Try again" : "Create"}
          </button>
        )}
      </div>
    </li>
  );
}
