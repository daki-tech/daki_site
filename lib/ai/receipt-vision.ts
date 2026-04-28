/**
 * Photo-receipt parser. Sends a photo to Gemini, extracts items + totals,
 * and maps each item to one of DaKi's 6 expense categories.
 *
 * The webhook then asks the user to confirm before writing each item to
 * the Google Sheet (photo recognition is more error-prone than voice).
 */

import { mediaToJSON, extractJSON, AIUnavailableError } from "./router";
import { CATEGORY_LABELS } from "./voice-intent";

export interface ReceiptItem {
  name: string;
  amount: number;
  /** AI category key (one of CATEGORY_LABELS keys). */
  category: string;
}

export interface ParsedReceipt {
  store: string | null;
  date: string | null;
  total: number;
  currency: string;
  items: ReceiptItem[];
}

const SYSTEM_PROMPT = `Ты — AI-ассистент для распознавания чеков швейного производства DaKi. Получаешь фото чека.

Извлеки:
- store: название магазина / поставщика (или null)
- date: дата покупки в формате YYYY-MM-DD (или null если не видно)
- total: итоговая сумма
- currency: "грн" если ₴/UAH/гривны, "дол" если $/USD/доллары
- items: массив позиций { name, amount, category }

КАТЕГОРИИ для каждой позиции (используй именно эти ключи):
- "personal" → личные покупки владельца (продукты, бытовое)
- "salary" → зарплатные выплаты (если в чеке)
- "hardware" → молнии, пуговицы, кнопки, бирки, фурнитура
- "fabric" → ткани, материалы для пошива
- "workshop" → коммуналка, аренда, инструменты, ремонт оборудования
- "newcollection" → лекала, образцы, услуги дизайнера

Если позицию не удаётся отнести однозначно — выбери ближайшую по смыслу категорию. Например, чек из магазина тканей → fabric для всех тканевых позиций.

Если фото нечитаемое или это не чек — верни {"items":[],"total":0,"store":null,"date":null,"currency":"грн"}.

Ответ ТОЛЬКО один JSON, без markdown:
{"store":"...","date":"YYYY-MM-DD","total":1234.56,"currency":"грн","items":[{"name":"...","amount":...,"category":"..."}]}`;

export async function parsePhotoReceipt(imageBase64: string, mimeType: string): Promise<ParsedReceipt> {
  const { data: raw } = await mediaToJSON({
    mediaBase64: imageBase64,
    mimeType,
    systemPrompt: SYSTEM_PROMPT,
  });
  const parsed = extractJSON<Record<string, unknown>>(raw);
  if (!parsed) throw new AIUnavailableError(`Unparseable receipt: ${raw.slice(0, 200)}`, []);

  const items = Array.isArray(parsed.items)
    ? (parsed.items as Record<string, unknown>[])
        .map((it) => ({
          name: String(it.name ?? "").trim(),
          amount: Number(it.amount) || 0,
          category: String(it.category ?? "").toLowerCase(),
        }))
        .filter((it) => it.name && it.amount > 0)
        .map((it) => ({
          ...it,
          category: CATEGORY_LABELS[it.category] ? it.category : "hardware",
        }))
    : [];

  return {
    store: (parsed.store as string | null) ?? null,
    date: (parsed.date as string | null) ?? null,
    total: Number(parsed.total) || items.reduce((s, i) => s + i.amount, 0),
    currency: (parsed.currency as string) === "дол" ? "дол" : "грн",
    items,
  };
}
