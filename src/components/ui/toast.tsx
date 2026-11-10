"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { CheckIcon } from "./icons";

interface Toast {
  id: number;
  message: string;
  action?: { href: string; label: string };
}

const listeners = new Set<() => void>();
let current: Toast | null = null;
let nextId = 1;

function set(toast: Toast | null): void {
  current = toast;
  listeners.forEach((notify) => notify());
}

/** Show a short confirmation at the bottom of the screen. A new toast replaces the old one. */
export function showToast(message: string, action?: Toast["action"]): void {
  set({ id: nextId++, message, action });
}

const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => void listeners.delete(notify);
};

const VISIBLE_MS = 4000;

export function Toaster() {
  const toast = useSyncExternalStore(subscribe, () => current, () => null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => set(null), VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex justify-center px-4">
      {toast && (
        <div key={toast.id} className="toast-in pointer-events-auto flex items-center gap-3 rounded-full bg-ink py-2.5 pr-3 pl-4 text-sm text-paper shadow-lg">
          <CheckIcon className="h-4 w-4 shrink-0" />
          <span>{toast.message}</span>
          {toast.action && (
            <Link href={toast.action.href} onClick={() => set(null)} className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink">
              {toast.action.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
