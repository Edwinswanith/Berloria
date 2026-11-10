"use client";

import Link from "next/link";
import { BagIcon } from "@/components/ui/icons";
import { useBagCount } from "./bag-store";

/** Header bag button with a live count that pops when it changes. */
export function BagLink() {
  const count = useBagCount();
  return (
    <Link href="/bag" className="relative inline-flex h-10 items-center gap-3 transition-colors hover:text-accent" aria-label={count === 0 ? "Bag, empty" : `Bag, ${count} ${count === 1 ? "item" : "items"}`}>
      <span className="relative">
        <BagIcon />
        {count > 0 && (
          <span key={count} data-testid="bag-count" className="bump absolute -top-2 -right-2.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-accent px-1 text-[10px] font-medium text-paper tabular-nums">
            {count}
          </span>
        )}
      </span>
      <span className="hidden sm:inline">Bag</span>
    </Link>
  );
}
