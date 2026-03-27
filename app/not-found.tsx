import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4">
      {/* Large decorative 404 */}
      <div className="relative select-none">
        <p className="font-serif text-[160px] font-bold leading-none tracking-tight text-neutral-100 sm:text-[220px]">
          404
        </p>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="font-serif text-5xl font-semibold tracking-tight sm:text-6xl">
            DAKI
          </p>
        </div>
      </div>

      {/* Message */}
      <div className="mt-2 max-w-md text-center">
        <h1 className="text-lg font-light uppercase tracking-[0.2em]">
          Сторінку не знайдено
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Можливо, сторінку було переміщено або вона більше не існує.
          Перейдіть до каталогу або на головну сторінку.
        </p>
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/catalog"
          className="rounded-xl bg-black px-8 py-3 text-center text-xs font-medium uppercase tracking-[0.15em] text-white transition hover:bg-neutral-800"
        >
          Каталог
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-neutral-200 px-8 py-3 text-center text-xs font-medium uppercase tracking-[0.15em] transition hover:bg-neutral-50"
        >
          На головну
        </Link>
      </div>
    </div>
  );
}
