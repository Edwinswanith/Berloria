"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SORTS, parseSort, type SortKey } from "@/lib/data/catalog-shared";

export function SortSelect() {
  const router = useRouter();
  const params = useSearchParams();
  const current = parseSort(params.get("sort"));

  const onChange = (sort: SortKey) => {
    const next = new URLSearchParams(params);
    if (sort === "featured") next.delete("sort");
    else next.set("sort", sort);
    const query = next.toString();
    router.push(query ? `/shop?${query}` : "/shop", { scroll: false });
  };

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Sort</span>
      <select
        value={current}
        onChange={(e) => onChange(parseSort(e.target.value))}
        className="h-10 cursor-pointer rounded-full border border-line bg-paper pl-4 pr-8 text-sm hover:border-ink"
      >
        {Object.entries(SORTS).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
    </label>
  );
}
