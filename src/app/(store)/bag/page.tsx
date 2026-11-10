import type { Metadata } from "next";
import { BagView } from "@/components/bag/bag-view";

export const metadata: Metadata = { title: "Your bag" };

export default function BagPage() {
  return (
    <div className="container-page pt-10 sm:pt-14">
      <h1 className="mb-8 font-serif text-5xl sm:text-6xl">Your bag</h1>
      <BagView />
    </div>
  );
}
