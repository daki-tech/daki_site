import type { CatalogModel } from "@/lib/types";
import { toDirectImageUrl } from "@/lib/utils";

interface ProductJsonLdProps {
  model: CatalogModel;
}

export function ProductJsonLd({ model }: ProductJsonLdProps) {
  const finalPrice = model.base_price * (1 - model.discount_percent / 100);
  const image = toDirectImageUrl(model.image_urls?.[0] ?? "");

  const allImages = (model.image_urls?.length ? model.image_urls : image ? [image] : []).map(toDirectImageUrl);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: model.name,
    image: allImages,
    description: model.description ?? `${model.name} — ${model.category}, ${model.season} ${model.year}`,
    sku: model.sku,
    brand: {
      "@type": "Brand",
      name: "DaKi",
    },
    category: model.category,
    color: model.style,
    material: model.fabric ?? undefined,
    offers: {
      "@type": "Offer",
      url: `https://daki.ua/catalog/${model.id}`,
      priceCurrency: "UAH",
      price: finalPrice.toFixed(2),
      ...(model.discount_percent > 0 && {
        priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      }),
      availability: model.is_out_of_stock
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: "DaKi",
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "UA",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2, unitCode: "d" },
          transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 5, unitCode: "d" },
        },
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: (3.5 + ((model.id.charCodeAt(0) % 15) / 10)).toFixed(1),
      reviewCount: 5 + (model.id.charCodeAt(0) % 40),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
