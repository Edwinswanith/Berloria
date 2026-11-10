import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Studio admin", template: "%s · Studio admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-full flex-1 flex-col bg-mist/60">{children}</div>;
}
