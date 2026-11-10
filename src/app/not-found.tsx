import { ComingSoon } from "@/components/layout/coming-soon";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <ComingSoon
      eyebrow="404"
      title="This one isn't here."
          body="It may have sold out — small runs come and go. Have a look at what's in the shop now."
        />
      </main>
      <SiteFooter />
    </>
  );
}
