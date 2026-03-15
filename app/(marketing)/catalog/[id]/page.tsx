import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCatalogModelById, getRelatedModels, getHomepageSettings } from "@/lib/data";
import { formatCurrency, toDirectImageUrl } from "@/lib/utils";
import { ProductPageClient } from "./product-page-client";
import { RelatedModels } from "@/components/catalog/related-models";
import { ProductJsonLd } from "@/components/catalog/product-json-ld";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const model = await getCatalogModelById(id);
  if (!model) return {};

  const price = formatCurrency(model.base_price * (1 - model.discount_percent / 100));
  const image = toDirectImageUrl(model.image_urls?.[0] ?? "");

  return {
    title: `${model.name} — ${model.sku}`,
    description: `${model.name} (арт. ${model.sku}) — ${price}. Верхній жіночий одяг DaKi. Замовити онлайн.`,
    openGraph: {
      title: `${model.name} — DaKi`,
      description: `${model.name} за ${price}. Артикул ${model.sku}.`,
      ...(image ? { images: [{ url: image, width: 800, height: 1000, alt: model.name }] } : {}),
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const model = await getCatalogModelById(id);
  if (!model) notFound();

  const [related, settings] = await Promise.all([getRelatedModels(id), getHomepageSettings()]);

  return (
    <>
      <ProductJsonLd model={model} />

      {/* Blocks 1-4 with shared color state */}
      <ProductPageClient model={model} contacts={settings} />

      {/* BLOCK 5: Related models */}
      {related.length > 0 && (
        <section className="bg-white">
          <div className="mx-auto max-w-[1400px] px-4 py-12 lg:px-8 lg:py-16">
            <RelatedModels models={related} />
          </div>
        </section>
      )}
    </>
  );
}
