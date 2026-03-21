"use client";

import type { CatalogModel } from "@/lib/types";

interface ProductShareProps {
  model: CatalogModel;
}

export function ProductShare({ model }: ProductShareProps) {
  const url = typeof window !== "undefined"
    ? window.location.href
    : `https://dakifashion.com/catalog/${model.id}`;
  const text = encodeURIComponent(`${model.name} — DaKi`);
  const encodedUrl = encodeURIComponent(url);

  return (
    <div className="mt-6 flex items-center gap-3">
      <span className="text-xs text-neutral-400">Поділитися:</span>
      <div className="flex items-center gap-2.5">
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-400 transition-colors hover:text-neutral-900"
          aria-label="Facebook"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </a>
        <a
          href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${text}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-400 transition-colors hover:text-neutral-900"
          aria-label="Twitter"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
        <a
          href={`https://t.me/share/url?url=${encodedUrl}&text=${text}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-400 transition-colors hover:text-neutral-900"
          aria-label="Telegram"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.283c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.48 14.6l-2.95-.924c-.642-.203-.654-.642.136-.952l11.526-4.443c.535-.194 1.003.131.83.967z" />
          </svg>
        </a>
        <a
          href={`viber://forward?text=${text}%20${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-400 transition-colors hover:text-neutral-900"
          aria-label="Viber"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.398.002C9.473.028 5.331.344 3.014 2.467 1.294 4.177.693 6.698.623 9.82c-.07 3.121-.154 8.972 5.48 10.574H6.1l-.003 2.43s-.04.985.618 1.184c.79.243 1.253-.502 2.007-1.308.413-.443.981-1.098 1.412-1.588 3.89.326 6.885-.42 7.23-.53.787-.254 5.237-.823 5.961-6.719.747-6.078-.363-9.912-2.343-11.644-.516-.451-2.59-1.825-7.43-1.84l-.154.002v-.359z" />
          </svg>
        </a>
      </div>
    </div>
  );
}
