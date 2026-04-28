/**
 * DaKi-specific voice/text intent parser for the Telegram finance bot.
 *
 * Recognizes:
 *   - expense  — record an expense in one of 6 fixed categories
 *   - income   — record an income (description = who paid)
 *   - report   — show financial summary
 *   - unknown  — couldn't parse
 *
 * Currency is UAH ("грн") or USD ("дол") only — these are the two columns
 * the existing Google Sheet supports. No EUR conversion.
 */

import { mediaToJSON, textToJSON, extractJSON, AIUnavailableError } from "./router";

export type IntentAction = "expense" | "income" | "report" | "unknown";

const VALID_ACTIONS: IntentAction[] = ["expense", "income", "report", "unknown"];

/** AI-side category keys → human labels stored in the Google Sheet. */
export const CATEGORY_LABELS: Record<string, string> = {
  personal: "Личное",
  salary: "Зарплата",
  hardware: "Фурнитура/кнопки",
  fabric: "Ткань",
  workshop: "Цех",
  newcollection: "Разработка новой коллекции",
};

export type ReportPeriod =
  | "day"
  | "yesterday"
  | "week"
  | "month"
  | "quarter"
  | "half_year"
  | "year"
  | "all";

export type PaymentMethod = "cash" | "bank";

export interface FinanceIntent {
  action: IntentAction;
  /** Human-readable summary, optional. */
  text: string;
  amount: number | null;
  /** AI category key (one of CATEGORY_LABELS keys), only for expense. */
  category: string | null;
  /** "От кого" for income; короткое описание для расхода. */
  description: string | null;
  /** "грн" | "дол". Default "грн" if missing. */
  currency: string | null;
  /** YYYY-MM-DD if user mentioned past date ("вчера", "5 апреля"). null = today. */
  txn_date: string | null;
  /** For action="report": which period to show. Default "all". */
  query_period: ReportPeriod | null;
  /** "cash" (наличка) | "bank" (безнал/перевод/карта). null → default to "bank". */
  payment_method: PaymentMethod | null;
  raw_transcript: string;
  confidence: number;
  /** Multiple records in one message ("ткань 5000 и пуговицы 800"). */
  items?: Partial<FinanceIntent>[] | null;
}

const SYSTEM_PROMPT_TEMPLATE = `Ты — AI-ассистент финансового учёта швейного производства DaKi. Получаешь голосовое или текстовое сообщение и извлекаешь финансовую запись.

КАТЕГОРИИ РАСХОДОВ (используй именно эти ключи):
- "personal" → Личное (личные расходы владельцев бизнеса)
- "salary" → Зарплата (выплаты швеям, конструкторам, любому персоналу)
- "hardware" → Фурнитура/кнопки (молнии, пуговицы, кнопки, бирки)
- "fabric" → Ткань (любые ткани, материалы для пошива)
- "workshop" → Цех (аренда, коммуналка, инструменты, ремонт оборудования)
- "newcollection" → Разработка новой коллекции (лекала, образцы, дизайнер)

ВАЛЮТА: "доллар(а/ов) / usd / $" → currency="дол", иначе "грн".

СПОСОБ ОПЛАТЫ (payment_method):
- "наличкой / налом / кешем / наличными" → "cash"
- "безналом / переводом / картой / на карту / на счёт / по безналу" → "bank"
- Если не упомянуто → null (бот применит "безнал" по умолчанию)

ДАТЫ:
- По умолчанию txn_date = null (= сегодня).
- Если упомянуто "вчера", "позавчера", "5 апреля", "12 числа", конкретная дата — извлеки в формате YYYY-MM-DD.
- {{NOW_KYIV}} — сегодняшняя дата по Киеву.

МНОЖЕСТВЕННЫЕ ЗАПИСИ: если в одном сообщении несколько разных трат/доходов ("ткань 5000 и пуговицы 800"), верни массив items[]. На верхнем уровне action = "expense"/"income" если все одного типа, иначе "unknown".

ДЕЙСТВИЯ:
- "expense" — расход. Нужны: amount, category. Опционально: description, currency, txn_date.
- "income" — доход (приход денег). Нужны: amount, description (от кого). Опционально: currency, txn_date.
- "report" — пользователь просит отчёт. Опционально query_period:
   • "day"       — "сегодня", "за день", "за сегодня", "сегодняшний"
   • "yesterday" — "вчера", "за вчера", "вчерашние", "а вчера?"
   • "week"      — "за неделю", "эту неделю", "недельный отчёт", "с понедельника"
   • "month"     — "за месяц", "месячный", "в этом месяце"
   • "quarter"   — "за квартал", "за три месяца", "квартальный отчёт"
   • "half_year" — "за полгода", "за пол года", "за шесть месяцев"
   • "year"      — "за год", "годовой отчёт", "за этот год"
   • "all"       — "общий", "за всё время", "вообще", или ничего не указано
- "unknown" — не понял.

ВАЖНО:
- Если категорию из 6 определить невозможно (бытовое "купил молоко" и т.п.) — action = "unknown".
- "Цех" — это про производственное помещение, не про работу/зарплату.
- Зарплата всегда расход категории "salary", даже если описание содержит имя получателя.

ПРИМЕРЫ (ответ ВСЕГДА один JSON, без markdown):

"купил ткань 5000":
{"action":"expense","amount":5000,"category":"fabric","description":"ткань","currency":"грн","raw_transcript":"...","confidence":0.95}

"купил ткань 5000 наличкой":
{"action":"expense","amount":5000,"category":"fabric","description":"ткань","currency":"грн","payment_method":"cash","raw_transcript":"...","confidence":0.95}

"оплатил ткань 5000 переводом":
{"action":"expense","amount":5000,"category":"fabric","description":"ткань","currency":"грн","payment_method":"bank","raw_transcript":"...","confidence":0.95}

"вчера зарплата Маше 12 тысяч":
{"action":"expense","amount":12000,"category":"salary","description":"Маша","currency":"грн","txn_date":"YYYY-MM-DD-вчера","raw_transcript":"...","confidence":0.95}

"коммуналка цех 4500 за апрель":
{"action":"expense","amount":4500,"category":"workshop","description":"коммуналка за апрель","currency":"грн","raw_transcript":"...","confidence":0.95}

"получил предоплату от Иры 8000":
{"action":"income","amount":8000,"description":"Ира (предоплата)","currency":"грн","raw_transcript":"...","confidence":0.95}

"пришло на карту от Иры 8000":
{"action":"income","amount":8000,"description":"Ира","currency":"грн","payment_method":"bank","raw_transcript":"...","confidence":0.95}

"молнии и пуговицы 1500":
{"action":"expense","amount":1500,"category":"hardware","description":"молнии и пуговицы","currency":"грн","raw_transcript":"...","confidence":0.95}

"200 долларов на лекала":
{"action":"expense","amount":200,"category":"newcollection","description":"лекала","currency":"дол","raw_transcript":"...","confidence":0.9}

"ткань 5000 и пуговицы 800":
{"action":"expense","items":[{"action":"expense","amount":5000,"category":"fabric","description":"ткань","currency":"грн"},{"action":"expense","amount":800,"category":"hardware","description":"пуговицы","currency":"грн"}],"raw_transcript":"...","confidence":0.95}

"личное продукты 2500":
{"action":"expense","amount":2500,"category":"personal","description":"продукты","currency":"грн","raw_transcript":"...","confidence":0.9}

"покажи отчёт":
{"action":"report","query_period":"all","raw_transcript":"...","confidence":0.95}

"какие сегодня были расходы":
{"action":"report","query_period":"day","raw_transcript":"...","confidence":0.95}

"а вчера?":
{"action":"report","query_period":"yesterday","raw_transcript":"...","confidence":0.95}

"сколько вчера потратили":
{"action":"report","query_period":"yesterday","raw_transcript":"...","confidence":0.95}

"сколько потратили за неделю":
{"action":"report","query_period":"week","raw_transcript":"...","confidence":0.95}

"отчёт за месяц":
{"action":"report","query_period":"month","raw_transcript":"...","confidence":0.95}

"за квартал":
{"action":"report","query_period":"quarter","raw_transcript":"...","confidence":0.95}

"отчёт за полгода":
{"action":"report","query_period":"half_year","raw_transcript":"...","confidence":0.95}

"за год сколько потратили":
{"action":"report","query_period":"year","raw_transcript":"...","confidence":0.95}

"общий отчёт":
{"action":"report","query_period":"all","raw_transcript":"...","confidence":0.95}

"что за хрень":
{"action":"unknown","raw_transcript":"...","confidence":0.3}

Верни ТОЛЬКО один JSON-объект, без markdown.`;

function buildPrompt(): string {
  const now = new Date();
  const nowKyiv = now.toLocaleString("uk-UA", { timeZone: "Europe/Kyiv", dateStyle: "full" });
  return SYSTEM_PROMPT_TEMPLATE.replaceAll("{{NOW_KYIV}}", nowKyiv);
}

function normalize(obj: Record<string, unknown>): FinanceIntent {
  const action = (VALID_ACTIONS as string[]).includes(obj.action as string)
    ? (obj.action as IntentAction)
    : "unknown";

  const validPaymentMethods: PaymentMethod[] = ["cash", "bank"];
  const extractPaymentMethod = (raw: unknown): PaymentMethod | null => {
    const s = typeof raw === "string" ? raw.toLowerCase() : "";
    return s && (validPaymentMethods as string[]).includes(s) ? (s as PaymentMethod) : null;
  };

  const items = Array.isArray(obj.items)
    ? (obj.items as Record<string, unknown>[]).map((it) => ({
        action: ((VALID_ACTIONS as string[]).includes(it.action as string)
          ? (it.action as IntentAction)
          : action) as IntentAction,
        amount: it.amount != null ? Number(it.amount) : null,
        category: (it.category as string | null) ?? null,
        description: (it.description as string | null) ?? null,
        currency: (it.currency as string | null) ?? null,
        txn_date: (it.txn_date as string | null) ?? null,
        payment_method: extractPaymentMethod(it.payment_method),
      }))
    : null;

  const validPeriods: ReportPeriod[] = ["day", "yesterday", "week", "month", "quarter", "half_year", "year", "all"];
  const rawPeriod = obj.query_period as string | null | undefined;
  const queryPeriod = rawPeriod && (validPeriods as string[]).includes(rawPeriod)
    ? (rawPeriod as ReportPeriod)
    : null;

  return {
    action,
    text: String(obj.text ?? obj.raw_transcript ?? ""),
    amount: obj.amount != null ? Number(obj.amount) : null,
    category: (obj.category as string | null) ?? null,
    description: (obj.description as string | null) ?? null,
    currency: (obj.currency as string | null) ?? null,
    txn_date: (obj.txn_date as string | null) ?? null,
    query_period: queryPeriod,
    payment_method: extractPaymentMethod(obj.payment_method),
    raw_transcript: String(obj.raw_transcript ?? obj.text ?? ""),
    confidence: Number(obj.confidence ?? 0.5),
    items,
  };
}

/**
 * Compute a date range for a report period. Returns inclusive [from, to] in DD.MM.YYYY,
 * plus a human-readable label. For "all" returns null bounds + "За всё время" label.
 */
export function periodToRange(period: ReportPeriod | null): {
  fromDate: string | null;
  toDate: string | null;
  label: string;
} {
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ruMonths = [
    "январь", "февраль", "март", "апрель", "май", "июнь",
    "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
  ];

  if (period === "day") {
    const s = fmt(today);
    return { fromDate: s, toDate: s, label: `Сегодня (${s})` };
  }

  if (period === "yesterday") {
    const y = new Date(today);
    y.setDate(today.getDate() - 1);
    const s = fmt(y);
    return { fromDate: s, toDate: s, label: `Вчера (${s})` };
  }

  if (period === "week") {
    // Monday as start of week
    const dow = today.getDay();
    const daysSinceMon = (dow + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysSinceMon);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      fromDate: fmt(monday),
      toDate: fmt(sunday),
      label: `За неделю (${fmt(monday)} — ${fmt(sunday)})`,
    };
  }

  if (period === "month") {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const monthName = ruMonths[today.getMonth()];
    const monthCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    return {
      fromDate: fmt(first),
      toDate: fmt(last),
      label: `${monthCap} ${today.getFullYear()}`,
    };
  }

  if (period === "quarter") {
    // Calendar quarter (Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec)
    const q = Math.floor(today.getMonth() / 3); // 0..3
    const first = new Date(today.getFullYear(), q * 3, 1);
    const last = new Date(today.getFullYear(), q * 3 + 3, 0);
    return {
      fromDate: fmt(first),
      toDate: fmt(last),
      label: `Q${q + 1} ${today.getFullYear()} (${fmt(first)} — ${fmt(last)})`,
    };
  }

  if (period === "half_year") {
    // Sliding 6-month window ending today
    const start = new Date(today);
    start.setMonth(today.getMonth() - 5);
    start.setDate(1);
    return {
      fromDate: fmt(start),
      toDate: fmt(today),
      label: `За полгода (${fmt(start)} — ${fmt(today)})`,
    };
  }

  if (period === "year") {
    const first = new Date(today.getFullYear(), 0, 1);
    const last = new Date(today.getFullYear(), 11, 31);
    return {
      fromDate: fmt(first),
      toDate: fmt(last),
      label: `${today.getFullYear()} год`,
    };
  }

  return { fromDate: null, toDate: null, label: "За всё время" };
}

export async function parseVoiceIntent(audioBase64: string, mimeType: string): Promise<FinanceIntent> {
  const { data: raw } = await mediaToJSON({ mediaBase64: audioBase64, mimeType, systemPrompt: buildPrompt() });
  const parsed = extractJSON<Record<string, unknown>>(raw);
  if (!parsed) throw new AIUnavailableError(`Unparseable: ${raw.slice(0, 200)}`, []);
  return normalize(parsed);
}

export async function parseTextIntent(userText: string): Promise<FinanceIntent> {
  const { data: raw } = await textToJSON({ systemPrompt: buildPrompt(), userMessage: userText });
  const parsed = extractJSON<Record<string, unknown>>(raw);
  if (!parsed) throw new AIUnavailableError(`Unparseable: ${raw.slice(0, 200)}`, []);
  return normalize(parsed);
}

/**
 * Parse "вчера" / "позавчера" / YYYY-MM-DD / DD.MM.YYYY → DD.MM.YYYY (sheet format).
 * If null/invalid → today's DD.MM.YYYY.
 */
export function parseTxnDateToSheet(txnDate: string | null): string {
  const today = new Date();
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;

  if (!txnDate) return fmt(today);

  const lower = txnDate.toLowerCase();
  if (lower.includes("вчера") || lower === "yesterday") {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return fmt(d);
  }
  if (lower.includes("позавчера")) {
    const d = new Date(today);
    d.setDate(d.getDate() - 2);
    return fmt(d);
  }

  // ISO YYYY-MM-DD
  const iso = txnDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}.${iso[2]}.${iso[1]}`;

  // DD.MM.YYYY already
  const dot = txnDate.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (dot) return `${dot[1]}.${dot[2]}.${dot[3]}`;

  return fmt(today);
}
