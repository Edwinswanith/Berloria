import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/config/brand";

export const metadata: Metadata = { title: "Help & delivery" };

/** Garment measurements in inches. Placeholder chart — replace with the studio's own block measurements. */
const SIZE_CHART = [
  ["XS", "32", "26", "35"],
  ["S", "34", "28", "37"],
  ["M", "36", "30", "39"],
  ["L", "38", "32", "41"],
  ["XL", "40", "34", "43"],
  ["XXL", "42", "36", "45"],
] as const;

const SECTIONS = [
  {
    id: "delivery",
    title: "Delivery",
    body: [
      "Orders are packed in our Chennai workroom, usually the next working day, and sent by tracked courier.",
      "Most parcels reach addresses in India within 3–6 days. Delivery is free on orders of ₹1,999 or more; below that a flat fee is shown in your bag.",
    ],
  },
  {
    id: "payment",
    title: "Payment",
    body: [
      "There is nothing to pay when you place an order. Our team calls or messages you on the mobile number you gave to confirm the order and agree how you'd like to pay: UPI, bank transfer or cash.",
      "All prices include GST. We never ask for card numbers, PINs or OTPs over the phone.",
    ],
  },
  {
    id: "tracking",
    title: "Track an order",
    body: [
      "Your confirmation page shows each step: confirmed, packed, shipped and delivered, with the courier's tracking number once it leaves us.",
      "Every order you place is listed under Account → My orders, so you can come back to it any time.",
    ],
  },
  {
    id: "returns",
    title: "Returns & exchanges",
    body: ["Our returns and exchange policy is being finalised and will be published here before launch."],
  },
  {
    id: "contact",
    title: "Contact us",
    body: [`Write to ${BRAND.supportEmail} with your order number and we'll reply within one working day.`],
  },
];

export default function HelpPage() {
  return (
    <div className="container-page grid gap-12 pt-14 lg:grid-cols-[16rem_1fr]">
      <aside>
        <p className="eyebrow">Help</p>
        <h1 className="mt-3 font-serif text-5xl">How it works</h1>
        <nav aria-label="Help topics" className="mt-8 hidden space-y-2 text-sm lg:block">
          <a href="#sizes" className="block text-ink-soft hover:text-ink">Size guide</a>
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="block text-ink-soft hover:text-ink">{s.title}</a>
          ))}
        </nav>
      </aside>
      <div className="max-w-2xl divide-y divide-line border-y border-line">
        <section id="sizes" className="scroll-mt-24 py-10">
          <h2 className="font-serif text-3xl">Size guide</h2>
          <p className="mt-4 leading-relaxed text-ink-soft">Body measurements in inches. If you are between sizes, choose the larger one.</p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[20rem] text-left text-sm tabular-nums">
              <thead>
                <tr className="border-b border-ink text-muted">
                  <th scope="col" className="py-2 font-normal">Size</th>
                  <th scope="col" className="py-2 font-normal">Bust</th>
                  <th scope="col" className="py-2 font-normal">Waist</th>
                  <th scope="col" className="py-2 font-normal">Hip</th>
                </tr>
              </thead>
              <tbody>
                {SIZE_CHART.map(([size, bust, waist, hip]) => (
                  <tr key={size} className="border-b border-line">
                    <th scope="row" className="py-2.5 font-medium">{size}</th>
                    <td>{bust}</td>
                    <td>{waist}</td>
                    <td>{hip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-24 py-10">
            <h2 className="font-serif text-3xl">{s.title}</h2>
            <div className="mt-4 space-y-3 leading-relaxed text-ink-soft">
              {s.body.map((p) => <p key={p}>{p}</p>)}
            </div>
          </section>
        ))}
        <div className="py-10">
          <Link href="/shop" className="btn-ghost">Back to the shop</Link>
        </div>
      </div>
    </div>
  );
}
