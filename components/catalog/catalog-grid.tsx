"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import type { CatalogModel } from "@/lib/types";
import { CATALOG_CATEGORIES } from "@/lib/constants";
import { ProductCard } from "@/components/catalog/product-card";
import { useLanguage } from "@/components/providers/language-provider";

type SortOption = "default" | "price_asc" | "price_desc";

interface CatalogGridProps {
  models: CatalogModel[];
  /** Hide category filter on season-specific or sale pages */
  hideCategoryFilter?: boolean;
}

export function CatalogGrid({ models, hideCategoryFilter }: CatalogGridProps) {
  const { t } = useLanguage();
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sort, setSort] = useState<SortOption>("default");
  const [catOpen, setCatOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const availableCategories = useMemo(() => {
    const cats = new Set(models.map((m) => m.category));
    return CATALOG_CATEGORIES.filter((c) => c !== "Розпродаж" && cats.has(c));
  }, [models]);

  const filtered = useMemo(() => {
    let result = models;

    if (categoryFilter) {
      result = result.filter((m) => m.category === categoryFilter);
    }

    if (sort === "price_asc") {
      result = [...result].sort((a, b) => {
        const priceA = a.base_price * (1 - (a.discount_percent || 0) / 100);
        const priceB = b.base_price * (1 - (b.discount_percent || 0) / 100);
        return priceA - priceB;
      });
    } else if (sort === "price_desc") {
      result = [...result].sort((a, b) => {
        const priceA = a.base_price * (1 - (a.discount_percent || 0) / 100);
        const priceB = b.base_price * (1 - (b.discount_percent || 0) / 100);
        return priceB - priceA;
      });
    }

    return result;
  }, [models, categoryFilter, sort]);

  const sortLabels: Record<SortOption, string> = {
    default: t("catalog.sortDefault"),
    price_asc: t("catalog.sortPriceAsc"),
    price_desc: t("catalog.sortPriceDesc"),
  };

  const showCategoryFilter = !hideCategoryFilter && availableCategories.length > 1;

  return (
    <div>
      {/* Filters row — two styled dropdowns */}
      <div className="mb-6 flex items-center justify-end gap-3">
        {/* Category dropdown */}
        {showCategoryFilter && (
          <div className="relative">
            <button
              onClick={() => { setCatOpen(!catOpen); setSortOpen(false); }}
              className="flex items-center gap-2 border border-neutral-200 rounded-full px-5 py-2.5 text-sm transition-colors hover:border-neutral-400 bg-white"
            >
              <span className="font-medium">{categoryFilter || t("catalog.allCategories")}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${catOpen ? "rotate-180" : ""}`} />
            </button>
            {catOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setCatOpen(false)} />
                <div className="absolute left-0 top-full mt-1 z-20 min-w-[180px] rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={() => { setCategoryFilter(""); setCatOpen(false); }}
                    className={`block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-neutral-50 ${!categoryFilter ? "font-medium text-neutral-900" : "text-neutral-600"}`}
                  >
                    {t("catalog.allCategories")}
                  </button>
                  {availableCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setCategoryFilter(cat); setCatOpen(false); }}
                      className={`block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-neutral-50 ${categoryFilter === cat ? "font-medium text-neutral-900" : "text-neutral-600"}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => { setSortOpen(!sortOpen); setCatOpen(false); }}
            className="flex items-center gap-2 border border-neutral-200 rounded-full px-5 py-2.5 text-sm transition-colors hover:border-neutral-400 bg-white"
          >
            <span className="font-medium">{sortLabels[sort]}</span>
            <ChevronDown className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
          </button>
          {sortOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 min-w-[200px] rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
                {(Object.entries(sortLabels) as [SortOption, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => { setSort(key); setSortOpen(false); }}
                    className={`block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-neutral-50 ${sort === key ? "font-medium text-neutral-900" : "text-neutral-600"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed py-20 text-center text-sm text-muted-foreground">
          {t("catalog.empty")}
        </div>
      ) : (
        <div className="grid gap-x-3 gap-y-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((model) => (
            <ProductCard key={model.id} model={model} />
          ))}
        </div>
      )}
    </div>
  );
}
