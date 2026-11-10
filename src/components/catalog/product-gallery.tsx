"use client";

import { useRef, useState } from "react";
import Image from "next/image";

interface ProductGalleryProps {
  images: { url: string; alt: string }[];
}

/** Phones: swipeable strip with dots. Desktop: images stacked for an editorial read. */
export function ProductGallery({ images }: ProductGalleryProps) {
  const [index, setIndex] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);

  const goTo = (i: number) => {
    const strip = stripRef.current;
    if (!strip) return;
    strip.scrollTo({ left: i * strip.clientWidth, behavior: "smooth" });
  };

  return (
    <div>
      <div
        ref={stripRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
        className="snap-gallery -mx-4 flex outline-offset-[-2px] snap-x snap-mandatory overflow-x-auto sm:mx-0 lg:grid lg:snap-none lg:gap-4 lg:overflow-visible"
        aria-label="Product images"
        role="region"
        tabIndex={0}
      >
        {images.map((img, i) => (
          <div key={img.url} className="relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden bg-mist">
            <Image src={img.url} alt={img.alt} fill priority={i === 0} sizes="(min-width:1024px) 55vw, 100vw" className="object-cover" />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className="mt-4 flex justify-center gap-2 lg:hidden">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show image ${i + 1} of ${images.length}`}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-ink" : "w-1.5 bg-ink/25"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
