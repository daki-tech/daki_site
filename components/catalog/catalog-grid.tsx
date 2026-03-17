"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import type { CatalogModel } from "@/lib/types";
import { ProductCard } from "@/components/catalog/product-card";
import { useLanguage } from "@/components/providers/language-provider";
import { useCustomerType } from "@/hooks/use-customer-type";

interface CatalogGridProps {
  models: CatalogModel[];
}

export function CatalogGrid({ models }: CatalogGridProps) {
  const { t } = useLanguage();
  const { customerType } = useCustomerType();
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? models.filter((m) => {
        const q = search.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.sku.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q)
        );
      })
    : models;

  return (
    <div>
      {/* Search bar — minimal underline style, no model count */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("catalog.searchPlaceholder")}
            className="w-full border-b border-neutral-300 bg-transparent py-2 pl-6 pr-4 text-sm outline-none transition-colors focus:border-neutral-900 placeholder:text-neutral-400"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed py-20 text-center text-sm text-muted-foreground">
          {t("catalog.empty")}
        </div>
      ) : (
        <div className="grid gap-x-3 gap-y-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((model) => (
            <ProductCard key={model.id} model={model} customerType={customerType} />
          ))}
        </div>
      )}
    </div>
  );
}
