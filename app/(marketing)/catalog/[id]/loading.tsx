export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-4 lg:px-8 lg:py-6">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="animate-pulse">
          <div className="aspect-[3/4] rounded-xl bg-neutral-200" />
        </div>
        <div className="animate-pulse space-y-4 py-4">
          <div className="h-4 w-24 rounded bg-neutral-200" />
          <div className="h-6 w-48 rounded bg-neutral-200" />
          <div className="h-8 w-32 rounded bg-neutral-200" />
          <div className="mt-6 flex gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 w-10 rounded-full bg-neutral-200" />
            ))}
          </div>
          <div className="mt-6 h-12 w-full rounded-xl bg-neutral-200" />
        </div>
      </div>
    </div>
  );
}
