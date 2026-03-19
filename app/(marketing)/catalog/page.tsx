import type { Metadata } from "next";

import { CatalogGrid } from "@/components/catalog/catalog-grid";
import { getCatalogModels } from "@/lib/data";

export const metadata: Metadata = {
  title: "Каталог",
  description: "Каталог верхнього жіночого одягу DaKi — пальта, пуховики, куртки, жилети. Ціни від виробника.",
  openGraph: {
    title: "Каталог — DaKi",
    description: "Верхній жіночий одяг від українського виробника. Пальта, пуховики, куртки.",
  },
};

interface CatalogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;

  const isSale = params.sale === "true";

  const filters = {
    query: typeof params.query === "string" ? params.query : undefined,
    category: typeof params.category === "string" ? params.category : undefined,
    style: typeof params.style === "string" ? params.style : undefined,
    season: typeof params.season === "string" ? params.season : undefined,
    year: typeof params.year === "string" ? Number(params.year) : undefined,
    minDiscount: isSale ? 1 : typeof params.minDiscount === "string" ? Number(params.minDiscount) : undefined,
    onlyAvailable: params.onlyAvailable === "true",
  };

  const models = await getCatalogModels(filters);

  return (
    <div className="mx-auto max-w-[1800px] px-2 py-6 lg:px-3 lg:py-8">
      <CatalogGrid models={models} />
    </div>
  );
}
