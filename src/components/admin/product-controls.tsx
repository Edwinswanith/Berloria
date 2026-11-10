"use client";
/* eslint-disable @next/next/no-img-element -- gallery thumbnails in the staff area */

import { useState, useTransition } from "react";
import { deleteProductAction, makeFirstAction, removeGalleryImageAction, setStatusAction, type ActionState } from "@/app/admin/actions";

interface PublishBarProps {
  id: string;
  status: string;
  slug: string;
  blockers: string[];
}

/** Go live / take down / delete, with the reasons a product can't be published yet. */
export function PublishBar({ id, status, slug, blockers }: PublishBarProps) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const live = status === "active";

  const run = (action: () => Promise<ActionState>) =>
    start(async () => {
      setError(null);
      const result = await action();
      if (result?.error) setError(result.error);
    });

  return (
    <div className="card" data-testid="publish-bar">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">
            {live ? "Live in the shop" : "Not in the shop yet"}
            <span className={`ml-2 rounded-full px-2.5 py-1 text-xs ${live ? "bg-ok/10 text-ok" : "bg-warn/10 text-warn"}`} data-testid="status-pill">
              {live ? "Live" : "Draft"}
            </span>
          </p>
          {live ? (
            <a href={`/products/${slug}`} target="_blank" rel="noreferrer" className="link-underline mt-1 inline-block text-sm">View in shop ↗</a>
          ) : blockers.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-muted" data-testid="blockers">
              {blockers.map((b) => <li key={b}>• {b}</li>)}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted">Everything needed is here. Publish when you&rsquo;re happy with the photos.</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {live ? (
            <button type="button" className="btn-ghost" disabled={pending} onClick={() => run(() => setStatusAction(id, "draft"))}>Take down</button>
          ) : (
            <>
              {confirmDelete ? (
                <>
                  <span className="text-sm">Delete this product and its photos?</span>
                  <button type="button" className="btn-sm" disabled={pending} onClick={() => run(() => deleteProductAction(id))}>Yes, delete</button>
                  <button type="button" className="btn-sm" onClick={() => setConfirmDelete(false)}>Keep</button>
                </>
              ) : (
                <button type="button" className="text-sm text-muted underline underline-offset-4" onClick={() => setConfirmDelete(true)}>Delete</button>
              )}
              <button type="button" className="btn-primary" disabled={pending || blockers.length > 0} onClick={() => run(() => setStatusAction(id, "active"))}>
                {pending ? "Working…" : "Publish to shop"}
              </button>
            </>
          )}
        </div>
      </div>
      {error && <p role="alert" className="field-error mt-3">{error}</p>}
    </div>
  );
}

interface GalleryManagerProps {
  id: string;
  images: { url: string; alt: string; ai: boolean }[];
}

/** The photos customers see, in order. The first one is the cover. */
export function GalleryManager({ id, images }: GalleryManagerProps) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: () => Promise<ActionState>) =>
    start(async () => {
      setError(null);
      const result = await action();
      if (result?.error) setError(result.error);
    });

  if (images.length === 0) {
    return <p className="text-sm text-muted" data-testid="gallery-empty">No photos yet. Approve photos in the studio below and they&rsquo;ll appear here.</p>;
  }

  return (
    <>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5" data-testid="gallery">
        {images.map((img, i) => (
          <li key={img.url}>
            <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-mist">
              <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-ink px-2 py-0.5 text-[10px] text-paper">Cover</span>}
              {img.ai && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-paper/90 px-2 py-0.5 text-[10px]">AI</span>}
            </div>
            <div className="mt-1.5 flex gap-3 text-xs">
              {i > 0 && (
                <button type="button" disabled={pending} className="underline underline-offset-2" onClick={() => run(() => makeFirstAction(id, img.url))}>Make cover</button>
              )}
              <button type="button" disabled={pending} className="text-muted underline underline-offset-2" onClick={() => run(() => removeGalleryImageAction(id, img.url))} aria-label={`Remove photo ${i + 1} from gallery`}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="field-error mt-3">{error}</p>}
    </>
  );
}
