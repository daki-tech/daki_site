export default function CatalogLoading() {
  return (
    <div className="mx-auto max-w-[1800px] px-2 py-6 lg:px-3 lg:py-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[3/4] rounded-xl bg-neutral-200" />
            <div className="mt-2.5 space-y-2">
              <div className="h-3 w-16 rounded bg-neutral-200" />
              <div className="h-4 w-32 rounded bg-neutral-200" />
              <div className="h-4 w-20 rounded bg-neutral-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
