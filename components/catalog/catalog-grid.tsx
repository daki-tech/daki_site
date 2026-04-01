"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, Search } from "lucide-react";

import type { CatalogModel } from "@/lib/types";
import { CATALOG_CATEGORIES } from "@/lib/constants";
import { ProductCard } from "@/components/catalog/product-card";
import { useLanguage } from "@/components/providers/language-provider";

type SortOption = "default" | "price_asc" | "price_desc";

interface CatalogGridProps {
  models: CatalogModel[];
}

export function CatalogGrid({ models }: CatalogGridProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sort, setSort] = useState<SortOption>("default");

  // Categories present in the current model set (exclude Розпродаж from filter chips — it's a separate tab)
  const availableCategories = useMemo(() => {
    const cats = new Set(models.map((m) => m.category));
    return CATALOG_CATEGORIES.filter((c) => c !== "Розпродаж" && cats.has(c));
  }, [models]);

  const filtered = useMemo(() => {
    let result = models;

    if (categoryFilter) {
      result = result.filter((m) => m.category === categoryFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.sku.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q),
      );
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
  }, [models, categoryFilter, search, sort]);

  return (
    <div>
      {/* Filters row */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("catalog.searchPlaceholder")}
            className="w-full border-b border-neutral-300 bg-transparent py-2 pl-6 pr-4 text-sm outline-none transition-colors focus:border-neutral-900 placeholder:text-neutral-400"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <ArrowDownUp className="h-4 w-4 text-neutral-400" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="border-b border-neutral-300 bg-transparent py-1.5 text-sm outline-none transition-colors focus:border-neutral-900"
          >
            <option value="default">{t("catalog.sortDefault")}</option>
            <option value="price_asc">{t("catalog.sortPriceAsc")}</option>
            <option value="price_desc">{t("catalog.sortPriceDesc")}</option>
          </select>
        </div>
      </div>

      {/* Category chips */}
      {availableCategories.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter("")}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              !categoryFilter
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 text-neutral-600 hover:border-neutral-500"
            }`}
          >
            {t("catalog.allCategories")}
          </button>
          {availableCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? "" : cat)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                categoryFilter === cat
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 text-neutral-600 hover:border-neutral-500"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

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
