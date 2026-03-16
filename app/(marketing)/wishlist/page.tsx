"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Heart, Loader2 } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { ProductCard } from "@/components/catalog/product-card";
import { useWishlist } from "@/lib/wishlist-store";
import { createClient } from "@/lib/supabase/client";
import type { CatalogModel } from "@/lib/types";

export default function WishlistPage() {
  const { t } = useLanguage();
  const { ids } = useWishlist();
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) {
      setModels([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("catalog_models")
          .select("*, model_sizes(*), model_colors(*)")
          .in("id", ids);

        if (!cancelled) {
          setModels((data as CatalogModel[]) ?? []);
        }
      } catch {
        // fallback — empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ids]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
        <Heart className="h-12 w-12 text-muted-foreground/30" />
        <h1 className="mt-4 text-xl font-light uppercase tracking-[0.15em]">
          Список бажань порожній
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Додайте моделі натиснувши на серце
        </p>
        <Link
          href="/catalog"
          className="mt-6 border border-foreground px-8 py-3 text-xs font-medium uppercase tracking-[0.1em] transition hover:bg-foreground hover:text-background"
        >
          {t("nav.catalog")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-3 py-10 lg:px-4 lg:py-14">
      <h1 className="text-xl font-light uppercase tracking-[0.15em] md:text-2xl">
        Список бажань
      </h1>
      <p className="mt-2 text-xs text-muted-foreground">
        {models.length} {t("catalog.models")}
      </p>

      <div className="mt-8 grid gap-x-3 gap-y-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {models.map((model) => (
          <ProductCard key={model.id} model={model} />
        ))}
      </div>
    </div>
  );
}
