export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6" aria-busy="true" aria-label="Loading product">
      <div className="h-10 w-2/3 animate-pulse rounded-lg bg-paper" />
      <div className="h-24 animate-pulse rounded-2xl bg-paper" />
      <div className="h-64 animate-pulse rounded-2xl bg-paper" />
      <div className="h-96 animate-pulse rounded-2xl bg-paper" />
    </div>
  );
}
