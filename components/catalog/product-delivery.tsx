"use client";

import type { CatalogModel, ModelColor } from "@/lib/types";
import { SmartMedia } from "@/components/ui/smart-image";

const DEFAULT_DELIVERY_INFO = `Пункти відбору Meest ПОШТА (7-11 робочих днів)
160 UAH / Оплата онлайн

Пункти відбору Нова ПОШТА (7-11 робочих днів)
160 UAH / Оплата онлайн

Пункти відбору Meest ПОШТА (7-11 робочих днів)
199 UAH / Оплата при отриманні
(99 грн при покупці на суму понад 1600 грн)

Кур'єр Meest ПОШТА (7-11 робочих днів)
170 UAH / Оплата онлайн

Кур'єр Meest ПОШТА (7-11 робочих днів)
199 UAH / Оплата при отриманні
(99 грн при покупці на суму понад 1600 грн)

Безкоштовна доставка при замовленні товарів на суму від 1600 грн.`;

const DEFAULT_RETURN_INFO = `Ви можете повернути товар в інтернет-магазин протягом 30 днів, заповнивши форму на сайті.`;

const isHtml = (text: string): boolean => /<[a-z][\s\S]*>/i.test(text);

interface ProductDeliveryProps {
  model: CatalogModel;
  selectedColor?: ModelColor | null;
}

function renderDeliveryLines(text: string) {
  const lines = text.split("\n").map((l) => l.trim());
  const nonEmpty = lines.filter(Boolean);

  return nonEmpty.map((line, idx) => {
    if (/^безкоштовна/i.test(line)) {
      return (
        <p
          key={idx}
          className="mt-6 rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-2.5 text-xs tracking-wide text-neutral-700"
        >
          {line}
        </p>
      );
    }

    if (/UAH|грн|Оплата/i.test(line) && !/^Пункти|^Кур/i.test(line)) {
      return (
        <p key={idx} className="mt-1.5 pl-5 text-sm text-neutral-500">
          {line}
        </p>
      );
    }

    if (line.startsWith("(")) {
      return (
        <p key={idx} className="mt-0.5 pl-5 text-xs italic text-neutral-400">
          {line}
        </p>
      );
    }

    if (/Попереджаємо|→/i.test(line)) {
      return (
        <p key={idx} className="mt-3 text-xs text-neutral-400 leading-relaxed">
          {line}
        </p>
      );
    }

    return (
      <p
        key={idx}
        className={`text-sm font-medium text-neutral-800 ${idx === 0 ? "" : "mt-6"}`}
      >
        {line}
      </p>
    );
  });
}

export function ProductDelivery({ model, selectedColor }: ProductDeliveryProps) {
  const deliveryText = model.delivery_info || DEFAULT_DELIVERY_INFO;
  const returnText = model.return_info || DEFAULT_RETURN_INFO;
  const deliveryIsHtml = isHtml(deliveryText);
  const returnIsHtml = isHtml(returnText);

  const rawDeliveryMedia =
    selectedColor?.delivery_image ??
    model.detail_images?.[1] ??
    null;

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-16 items-start">
      {/* Left: Delivery & return text */}
      <div>
        <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-neutral-400 mb-6">
          Правила доставки
        </p>
        {deliveryIsHtml ? (
          <div
            className="text-sm text-neutral-700 leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: deliveryText }}
          />
        ) : (
          <div>{renderDeliveryLines(deliveryText)}</div>
        )}

        <div className="mt-10">
          <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-neutral-400 mb-4">
            Правила повернення
          </p>
          {returnIsHtml ? (
            <div
              className="text-sm text-neutral-700 leading-relaxed prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: returnText }}
            />
          ) : (
            <p className="text-sm text-neutral-700 leading-relaxed">{returnText}</p>
          )}
        </div>
      </div>

      {/* Right: Photo / Video */}
      {rawDeliveryMedia && (
        <div
          className="relative w-full overflow-hidden rounded-xl bg-neutral-100"
          style={{ maxHeight: "80vh", aspectRatio: "3/4", pointerEvents: "none" }}
        >
          <SmartMedia
            src={rawDeliveryMedia}
            alt={`${model.name} — доставка`}
            fill
            className="object-cover object-top"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      )}
    </div>
  );
}
