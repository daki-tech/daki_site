import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDuplicateUpdate } from "@/lib/telegram-dedupe";
import { downloadTelegramFile } from "@/lib/ai/router";
import { parseVoiceIntent, parseTextIntent, parseTxnDateToSheet, periodToRange, CATEGORY_LABELS, type FinanceIntent, type ReportPeriod, type PaymentMethod } from "@/lib/ai/voice-intent";
import { parsePhotoReceipt, type ParsedReceipt } from "@/lib/ai/receipt-vision";

const STATUS_LABELS: Record<string, string> = {
  draft: "🆕 Новый",
  confirmed: "✅ Подтверждено",
  shipped: "📦 Отправлено",
  completed: "🏠 Доставлено",
  cancelled: "❌ Отменено",
};

const EXPENSE_CATEGORIES: Record<string, { label: string; emoji: string; hint?: string }> = {
  personal: { label: "Личное", emoji: "👤" },
  salary: { label: "Зарплата", emoji: "💰" },
  hardware: { label: "Фурнитура/кнопки", emoji: "🔘" },
  fabric: { label: "Ткань", emoji: "🧵" },
  workshop: { label: "Цех", emoji: "🏭", hint: "коммуналка, аренда и прочие расходы по цеху" },
  newcollection: { label: "Разработка новой коллекции", emoji: "✨", hint: "лекала и прочее" },
};

// Users who can create "Личное" expenses (see the button + voice/photo for personal category)
const PERSONAL_EXPENSE_CREATORS = [729892588, 330206846];
// Users who can see "Личное" in reports + receive notifications
const PERSONAL_EXPENSE_VIEWERS = [330206846, 729892588];

function canCreatePersonal(chatId: number): boolean {
  return PERSONAL_EXPENSE_CREATORS.includes(chatId);
}

function isAllowedUser(chatId: number): boolean {
  const allowedStr = process.env.TELEGRAM_ALLOWED_USERS || process.env.TELEGRAM_CHAT_ID || "";
  if (!allowedStr.trim()) return false;
  const allowedIds = allowedStr.split(",").map((id) => id.trim()).filter(Boolean);
  return allowedIds.includes(String(chatId));
}

async function sendMessage(botToken: string, chatId: number, text: string, replyMarkup?: object) {
  if (!botToken) return;
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });
}

async function sendToAllSubscribers(botToken: string, text: string, parse_mode?: string) {
  if (!botToken) return [];

  const chatIds: number[] = [];

  // Try DB table first
  try {
    const admin = createAdminClient();
    const { data: subscribers, error } = await admin
      .from("telegram_subscribers")
      .select("chat_id")
      .eq("is_active", true);

    if (!error && subscribers && subscribers.length > 0) {
      chatIds.push(...subscribers.map((s: { chat_id: number }) => s.chat_id));
    }
  } catch {
    // Table may not exist yet
  }

  // Always include ALL env var chat IDs (not just fallback)
  const allowedStr = process.env.TELEGRAM_ALLOWED_USERS || process.env.TELEGRAM_CHAT_ID || "";
  const envIds = allowedStr.split(",").map((id) => id.trim()).filter(Boolean).map(Number).filter((n) => !isNaN(n));
  for (const eid of envIds) {
    if (!chatIds.includes(eid)) {
      chatIds.push(eid);
    }
  }

  if (chatIds.length === 0) return [];

  const results = await Promise.allSettled(
    chatIds.map(async (cid) => {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: cid,
          text,
          parse_mode: parse_mode || "HTML",
        }),
      });
      return res.json();
    })
  );

  return results;
}

async function editMessage(botToken: string, chatId: number, messageId: number, text: string, replyMarkup?: object) {
  if (!botToken) return;
  await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });
}

async function deleteMessage(botToken: string, chatId: number, messageId: number) {
  if (!botToken) return;
  await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
  }).catch(() => {});
}

async function sendMessageAndTrack(botToken: string, chatId: number, text: string, replyMarkup?: object): Promise<number | null> {
  if (!botToken) return null;
  const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });
  const data = await resp.json();
  return data.result?.message_id || null;
}

function getFinanceMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "💰 Доход", callback_data: "fin:income" },
        { text: "📉 Расход", callback_data: "fin:expense" },
      ],
      [{ text: "📊 Отчет", callback_data: "fin:report" }],
    ],
  };
}

function getExpenseCategoryKeyboard(chatId: number) {
  const rows: { text: string; callback_data: string }[][] = [];
  if (canCreatePersonal(chatId)) {
    rows.push([
      { text: "👤 Личное", callback_data: "fin:cat:personal" },
      { text: "💰 Зарплата", callback_data: "fin:cat:salary" },
    ]);
  } else {
    rows.push([
      { text: "💰 Зарплата", callback_data: "fin:cat:salary" },
    ]);
  }
  rows.push([
    { text: "🔘 Фурнитура/кнопки", callback_data: "fin:cat:hardware" },
    { text: "🧵 Ткань", callback_data: "fin:cat:fabric" },
  ]);
  rows.push([
    { text: "🏭 Цех", callback_data: "fin:cat:workshop" },
  ]);
  rows.push([
    { text: "✨ Разработка новой коллекции", callback_data: "fin:cat:newcollection" },
  ]);
  return { inline_keyboard: rows };
}

function parseAmount(input: string): number | null {
  const cleaned = input.trim().replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return null;
  return num;
}

async function appendToFinanceSheet(record: {
  type: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  category?: string;
  paymentMethod?: string;
}): Promise<{ ok: boolean; error?: string }> {
  // "Личное" goes to separate personal sheet
  const isPersonal = record.category === "Личное";
  const webhookUrl = isPersonal
    ? process.env.GOOGLE_PERSONAL_WEBHOOK_URL
    : process.env.GOOGLE_FINANCE_WEBHOOK_URL;

  if (!webhookUrl) {
    const missing = isPersonal ? "GOOGLE_PERSONAL_WEBHOOK_URL" : "GOOGLE_FINANCE_WEBHOOK_URL";
    console.warn(`[Finance] ${missing} not configured`);
    return { ok: false, error: `${missing} not configured` };
  }
  try {
    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addFinance", ...record }),
    });
    const text = await resp.text();
    console.log(`[Finance Sheet] Response: ${resp.status} ${text.slice(0, 200)}`);
    if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
    try {
      const parsed = JSON.parse(text);
      if (parsed.ok === false) return { ok: false, error: String(parsed.error || "sheet rejected") };
    } catch {
      // Apps Script may redirect to a non-JSON page; treat 2xx as success.
    }
    return { ok: true };
  } catch (err) {
    console.error("[Finance Sheet] Failed:", err);
    return { ok: false, error: (err as Error).message };
  }
}

export async function POST(req: Request) {
  try {
    // Verify Telegram webhook secret if configured
    const expectedSecret = (process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
    if (expectedSecret) {
      const got = req.headers.get("x-telegram-bot-api-secret-token");
      if (got !== expectedSecret) {
        return NextResponse.json({ ok: true });
      }
    }

    const body = await req.json();
    const botToken = (process.env.TELEGRAM_BOT_TOKEN || "").trim();

    // Suppress duplicate Telegram retries (60s window)
    const updateId = body.update_id;
    if (updateId != null && isDuplicateUpdate(`u:${updateId}`)) {
      return NextResponse.json({ ok: true });
    }

    // Handle inline button callback
    if (body.callback_query) {
      const callbackChatId = body.callback_query.from?.id;
      if (!isAllowedUser(callbackChatId)) {
        await answerCallback(botToken, body.callback_query.id, "⛔ У вас нет доступа");
        return NextResponse.json({ ok: true });
      }

      const cbData = body.callback_query.data || "";

      // Finance menu callbacks
      if (cbData.startsWith("fin:")) {
        return handleFinanceCallback(body.callback_query, botToken);
      }

      // Receipt confirmation callbacks
      if (cbData.startsWith("rcpt:")) {
        return handleReceiptCallback(body.callback_query, botToken);
      }

      // Order status callbacks
      if (cbData.startsWith("order_status:")) {
        return handleOrderStatusCallback(body.callback_query, botToken);
      }

      await answerCallback(botToken, body.callback_query.id, "Неизвестное действие");
      return NextResponse.json({ ok: true });
    }

    // Handle regular messages
    const message = body.message;
    if (!message?.chat?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const username = message.from?.username || null;
    const firstName = message.from?.first_name || null;
    const text = (message.text || "").trim();

    // Access check
    if (!isAllowedUser(chatId)) {
      if (botToken) {
        await sendMessage(botToken, chatId,
          `⛔ Извините, ${firstName || ""}. Этот бот доступен только для администраторов DaKi.\n\nВаш Chat ID: ${chatId}\nОбратитесь к владельцу для получения доступа.`
        );
      }
      return NextResponse.json({ ok: true });
    }

    const admin = createAdminClient();

    // Save subscriber
    await admin.from("telegram_subscribers").upsert(
      { chat_id: chatId, username, first_name: firstName, is_active: true },
      { onConflict: "chat_id" }
    );

    // Voice message → AI parse → save without confirmation
    if (message.voice?.file_id) {
      return handleVoiceMessage(admin, botToken, chatId, message.voice.file_id);
    }

    // Photo → AI parse → confirmation buttons
    if (Array.isArray(message.photo) && message.photo.length > 0) {
      const photos = message.photo as { file_id: string }[];
      const largest = photos[photos.length - 1];
      return handlePhotoMessage(admin, botToken, chatId, largest.file_id);
    }

    // /start command — welcome + remove any old persistent reply keyboard
    if (text.startsWith("/start")) {
      await sendMessage(
        botToken,
        chatId,
        `Привет, ${firstName || "друг"}! Вы подписаны на уведомления DaKi.\n\n💬 Пиши расходы/доходы текстом, голосом или присылай фото чека — я всё запишу.\n📊 Спроси «покажи отчёт» / «сколько потратили сегодня» — выдам сводку.`,
        { remove_keyboard: true }
      );
      return NextResponse.json({ ok: true });
    }

    // /finance — silent fallback for power users (typed manually). Not advertised in UI.
    if (text === "/finance") {
      await deleteMessage(botToken, chatId, message.message_id);
      await sendMessage(botToken, chatId, "💼 <b>Финансовый учёт:</b>", getFinanceMenuKeyboard());
      return NextResponse.json({ ok: true });
    }

    // /cancel command
    if (text === "/cancel" || text.toLowerCase() === "отмена") {
      await admin.from("telegram_bot_state").delete().eq("chat_id", chatId);
      await sendMessage(botToken, chatId, "❌ Отменено.");
      return NextResponse.json({ ok: true });
    }

    // Check if user is in a finance input flow
    const { data: state } = await admin
      .from("telegram_bot_state")
      .select("*")
      .eq("chat_id", chatId)
      .maybeSingle();

    if (state && state.action !== "receipt_pending") {
      // Track user's input message ID for cleanup
      const userMsgId = message.message_id;
      const existingMsgIds = (state.data?.msg_ids as number[]) || [];
      if (userMsgId) {
        state.data = { ...state.data, msg_ids: [...existingMsgIds, userMsgId] };
      }
      return handleFinanceStep(admin, botToken, chatId, state, text);
    }

    // No active flow — try to parse text as a finance entry via AI
    if (text && !text.startsWith("/")) {
      return handleTextAI(admin, botToken, chatId, text);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Telegram Webhook] Error:", err);
    return NextResponse.json({ ok: true });
  }
}

// Handle finance inline button callbacks (menu navigation without extra messages)
async function handleFinanceCallback(
  callbackQuery: {
    id: string;
    from: { id: number };
    message?: { chat: { id: number }; message_id: number };
    data?: string;
  },
  botToken: string
) {
  const chatId = callbackQuery.message?.chat?.id;
  const messageId = callbackQuery.message?.message_id;
  const action = (callbackQuery.data || "").replace("fin:", "");

  if (!chatId || !messageId) {
    await answerCallback(botToken, callbackQuery.id, "Ошибка");
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();

  // Category selection callback (expense)
  if (action.startsWith("cat:")) {
    const categoryKey = action.replace("cat:", "");
    const category = EXPENSE_CATEGORIES[categoryKey];
    if (!category) {
      await answerCallback(botToken, callbackQuery.id, "Неизвестная категория");
      return NextResponse.json({ ok: true });
    }

    const { data: state } = await admin
      .from("telegram_bot_state")
      .select("*")
      .eq("chat_id", chatId)
      .maybeSingle();

    if (!state || state.step !== "category") {
      await answerCallback(botToken, callbackQuery.id, "Сессия устарела");
      return NextResponse.json({ ok: true });
    }

    await editMessage(botToken, chatId, messageId, `📝 Категория: ${category.emoji} ${category.label}`);

    const currencyKeyboard = {
      inline_keyboard: [
        [
          { text: "🇺🇦 Гривна", callback_data: "fin:cur:грн" },
          { text: "💵 Доллар", callback_data: "fin:cur:дол" },
        ],
      ],
    };
    const promptMsgId = await sendMessageAndTrack(botToken, chatId, "💱 Выберите валюту:", currencyKeyboard);
    const msgIds = (state.data?.msg_ids as number[]) || [];
    await admin.from("telegram_bot_state").update({
      step: "currency",
      data: { ...state.data, category: category.label, msg_ids: [...msgIds, ...(promptMsgId ? [promptMsgId] : [])] },
      updated_at: new Date().toISOString(),
    }).eq("chat_id", chatId);

    await answerCallback(botToken, callbackQuery.id, "");
    return NextResponse.json({ ok: true });
  }

  // Currency selection callback
  if (action.startsWith("cur:")) {
    const currency = action.replace("cur:", "");
    const { data: state } = await admin
      .from("telegram_bot_state")
      .select("*")
      .eq("chat_id", chatId)
      .maybeSingle();

    if (!state || state.step !== "currency") {
      await answerCallback(botToken, callbackQuery.id, "Сессия устарела");
      return NextResponse.json({ ok: true });
    }

    const currencyLabel = currency === "дол" ? "💵 Доллар" : "🇺🇦 Гривна";
    await editMessage(botToken, chatId, messageId, `💱 Валюта: ${currencyLabel}`);

    const paymentKeyboard = {
      inline_keyboard: [
        [
          { text: "💵 Наличка", callback_data: "fin:pay:cash" },
          { text: "💳 Безнал", callback_data: "fin:pay:bank" },
        ],
      ],
    };
    const promptMsgId = await sendMessageAndTrack(botToken, chatId, "💳 Способ оплаты:", paymentKeyboard);
    const msgIds = (state.data?.msg_ids as number[]) || [];
    await admin.from("telegram_bot_state").update({
      step: "payment",
      data: { ...state.data, currency, msg_ids: [...msgIds, ...(promptMsgId ? [promptMsgId] : [])] },
      updated_at: new Date().toISOString(),
    }).eq("chat_id", chatId);

    await answerCallback(botToken, callbackQuery.id, "");
    return NextResponse.json({ ok: true });
  }

  // Payment method selection callback
  if (action.startsWith("pay:")) {
    const paymentMethod = action.replace("pay:", ""); // "cash" or "bank"
    const { data: state } = await admin
      .from("telegram_bot_state")
      .select("*")
      .eq("chat_id", chatId)
      .maybeSingle();

    if (!state || state.step !== "payment") {
      await answerCallback(botToken, callbackQuery.id, "Сессия устарела");
      return NextResponse.json({ ok: true });
    }

    const pmLabel = paymentMethod === "cash" ? "💵 Наличка" : "💳 Безнал";
    await editMessage(botToken, chatId, messageId, `💳 Способ оплаты: ${pmLabel}`);

    const promptMsgId = await sendMessageAndTrack(botToken, chatId, "💰 Сумма:");
    const msgIds = (state.data?.msg_ids as number[]) || [];
    await admin.from("telegram_bot_state").update({
      step: "amount",
      data: { ...state.data, payment_method: paymentMethod, msg_ids: [...msgIds, ...(promptMsgId ? [promptMsgId] : [])] },
      updated_at: new Date().toISOString(),
    }).eq("chat_id", chatId);

    await answerCallback(botToken, callbackQuery.id, "");
    return NextResponse.json({ ok: true });
  }

  // Skip description for expense
  if (action === "skipdesc") {
    const { data: state } = await admin
      .from("telegram_bot_state")
      .select("*")
      .eq("chat_id", chatId)
      .maybeSingle();

    if (!state || state.step !== "expense_description") {
      await answerCallback(botToken, callbackQuery.id, "Сессия устарела");
      return NextResponse.json({ ok: true });
    }

    await editMessage(botToken, chatId, messageId, "📝 Описание: —");

    const amount = state.data.amount as number;
    const currency = (state.data.currency as string) || "грн";
    const category = state.data.category as string;
    const paymentMethod = (state.data.payment_method as PaymentMethod | undefined) ?? "bank";
    const msgIds = (state.data.msg_ids as number[]) || [];

    await answerCallback(botToken, callbackQuery.id, "");
    return saveFinanceRecord(admin, botToken, chatId, "expense", "", amount, currency, category, msgIds, undefined, paymentMethod);
  }

  // "Отчет" → show report
  if (action === "report") {
    await answerCallback(botToken, callbackQuery.id, "Формирую отчет...");
    return handleReport(admin, botToken, chatId);
  }

  // Start income flow — ask for description (from whom)
  if (action === "income") {
    await editMessage(botToken, chatId, messageId, `💰 Доход\n\n<i>Заполните данные ниже. /cancel для отмены.</i>`);
    const promptMsgId = await sendMessageAndTrack(botToken, chatId, "👤 От кого:");
    await admin.from("telegram_bot_state").upsert(
      { chat_id: chatId, action: "income", step: "description", data: { msg_ids: [messageId, ...(promptMsgId ? [promptMsgId] : [])] }, updated_at: new Date().toISOString() },
      { onConflict: "chat_id" }
    );
    await answerCallback(botToken, callbackQuery.id, "");
    return NextResponse.json({ ok: true });
  }

  // Start expense flow — show category buttons
  if (action === "expense") {
    const catText = `📉 <b>Расход</b>\n\n<i>Выберите категорию. /cancel для отмены.</i>\n\n🏭 <b>Цех</b> — коммуналка, аренда и прочие расходы по цеху\n✨ <b>Разработка новой коллекции</b> — лекала и прочее`;
    await editMessage(botToken, chatId, messageId, catText, getExpenseCategoryKeyboard(chatId));
    await admin.from("telegram_bot_state").upsert(
      { chat_id: chatId, action: "expense", step: "category", data: { msg_ids: [messageId] }, updated_at: new Date().toISOString() },
      { onConflict: "chat_id" }
    );
    await answerCallback(botToken, callbackQuery.id, "");
    return NextResponse.json({ ok: true });
  }

  await answerCallback(botToken, callbackQuery.id, "Неизвестное действие");
  return NextResponse.json({ ok: true });
}

// Handle text input steps for finance recording
async function handleFinanceStep(
  admin: ReturnType<typeof createAdminClient>,
  botToken: string,
  chatId: number,
  state: { action: string; step: string; data: Record<string, unknown> },
  input: string
) {
  if (!["income", "expense"].includes(state.action)) {
    await admin.from("telegram_bot_state").delete().eq("chat_id", chatId);
    await sendMessage(botToken, chatId, "❌ Ошибка. Попробуй ещё раз — напиши голосом или текстом.");
    return NextResponse.json({ ok: true });
  }

  const msgIds = (state.data.msg_ids as number[]) || [];

  // Income: description step (text input)
  if (state.step === "description" && state.action === "income") {
    if (!input || input.length < 1) {
      await sendMessage(botToken, chatId, "⚠️ Введите описание:");
      return NextResponse.json({ ok: true });
    }
    const currencyKeyboard = {
      inline_keyboard: [
        [
          { text: "🇺🇦 Гривна", callback_data: "fin:cur:грн" },
          { text: "💵 Доллар", callback_data: "fin:cur:дол" },
        ],
      ],
    };
    const promptMsgId = await sendMessageAndTrack(botToken, chatId, "💱 Выберите валюту:", currencyKeyboard);
    await admin.from("telegram_bot_state").update({
      step: "currency",
      data: { ...state.data, description: input, msg_ids: [...msgIds, ...(promptMsgId ? [promptMsgId] : [])] },
      updated_at: new Date().toISOString(),
    }).eq("chat_id", chatId);
    return NextResponse.json({ ok: true });
  }

  // Expense: category step — user must click a button
  if (state.step === "category") {
    await sendMessage(botToken, chatId, "⚠️ Выберите категорию, нажав кнопку выше ☝️");
    return NextResponse.json({ ok: true });
  }

  // Currency step — user must click a button
  if (state.step === "currency") {
    await sendMessage(botToken, chatId, "⚠️ Выберите валюту, нажав кнопку выше ☝️");
    return NextResponse.json({ ok: true });
  }

  // Payment method step — user must click a button
  if (state.step === "payment") {
    await sendMessage(botToken, chatId, "⚠️ Выберите способ оплаты, нажав кнопку выше ☝️");
    return NextResponse.json({ ok: true });
  }

  if (state.step === "amount") {
    const amount = parseAmount(input);
    if (!amount) {
      await sendMessage(botToken, chatId, "⚠️ Неверная сумма. Введите число (например: 1500 или 2500.50):");
      return NextResponse.json({ ok: true });
    }

    const isExpense = state.action === "expense";

    if (isExpense) {
      // After amount, ask for optional description
      const skipKeyboard = {
        inline_keyboard: [[{ text: "⏭ Пропустить", callback_data: "fin:skipdesc" }]],
      };
      const promptMsgId = await sendMessageAndTrack(botToken, chatId, "📝 Описание (необязательно):", skipKeyboard);
      await admin.from("telegram_bot_state").update({
        step: "expense_description",
        data: { ...state.data, amount, msg_ids: [...msgIds, ...(promptMsgId ? [promptMsgId] : [])] },
        updated_at: new Date().toISOString(),
      }).eq("chat_id", chatId);
      return NextResponse.json({ ok: true });
    }

    // Income — save immediately
    const currency = (state.data.currency as string) || "грн";
    const descStr = state.data.description as string;
    const paymentMethod = (state.data.payment_method as PaymentMethod | undefined) ?? "bank";
    return saveFinanceRecord(admin, botToken, chatId, state.action, descStr, amount, currency, undefined, msgIds, undefined, paymentMethod);
  }

  // Expense description step (optional text or skip)
  if (state.step === "expense_description") {
    const description = input.trim() || "";
    const amount = state.data.amount as number;
    const currency = (state.data.currency as string) || "грн";
    const category = state.data.category as string;
    const paymentMethod = (state.data.payment_method as PaymentMethod | undefined) ?? "bank";
    return saveFinanceRecord(admin, botToken, chatId, "expense", description, amount, currency, category, msgIds, undefined, paymentMethod);
  }

  // Unknown step — reset
  await admin.from("telegram_bot_state").delete().eq("chat_id", chatId);
  await sendMessage(botToken, chatId, "❌ Ошибка. Попробуй ещё раз — напиши голосом или текстом.");
  return NextResponse.json({ ok: true });
}

async function saveFinanceRecord(
  admin: ReturnType<typeof createAdminClient>,
  botToken: string,
  chatId: number,
  action: string,
  description: string,
  amount: number,
  currency: string,
  category: string | undefined,
  msgIds: number[],
  sheetDateOverride?: string,
  paymentMethod?: PaymentMethod,
) {
  const today = new Date();
  const sheetDate = sheetDateOverride
    ?? `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;
  const isExpense = action === "expense";
  const pm = paymentMethod ?? "bank"; // default for B2B
  const pmLabel = pm === "cash" ? "наличка" : "безнал";

  const writeResult = await appendToFinanceSheet({
    type: action,
    date: sheetDate,
    description,
    amount,
    currency,
    paymentMethod: pmLabel,
    ...(isExpense && category ? { category } : {}),
  });

  if (!writeResult.ok) {
    await sendMessage(botToken, chatId, `❌ Не записал в таблицу: ${writeResult.error || "ошибка"}\n\nПовтори запрос.`);
    return NextResponse.json({ ok: true });
  }

  // Only clear finance flow state — never touch a pending receipt confirmation
  await admin.from("telegram_bot_state").delete()
    .eq("chat_id", chatId)
    .in("action", ["income", "expense"]);

  for (const mid of msgIds) {
    await deleteMessage(botToken, chatId, mid);
  }

  const typeEmoji = isExpense ? "📉" : "💰";
  const typeLabel = isExpense ? "Расход" : "Доход";
  const currencySymbol = currency === "дол" ? "$" : "грн";

  let summaryText = `${typeEmoji} ${typeLabel}\n📅 ${sheetDate}`;
  if (isExpense && category) {
    summaryText += `\n📂 ${category}`;
  }
  if (description) {
    const descIcon = isExpense ? "📝" : "👤";
    summaryText += `\n${descIcon} ${description}`;
  }
  summaryText += `\n💰 ${amount.toLocaleString("ru-RU")} ${currencySymbol}`;
  summaryText += `\n${pm === "cash" ? "💵 Наличка" : "💳 Безнал"}`;

  // "Личное" notifications only go to allowed viewers
  if (isExpense && category === "Личное") {
    await Promise.allSettled(
      PERSONAL_EXPENSE_VIEWERS.map((cid) =>
        sendMessage(botToken, cid, summaryText)
      )
    );
  } else {
    await sendToAllSubscribers(botToken, summaryText);
  }
  return NextResponse.json({ ok: true });
}

async function handleReport(
  admin: ReturnType<typeof createAdminClient>,
  botToken: string,
  chatId: number,
  period: ReportPeriod | null = null,
) {
  // Read report data from Google Sheet (single source of truth)
  const webhookUrl = process.env.GOOGLE_FINANCE_WEBHOOK_URL;
  if (!webhookUrl) {
    await sendMessage(botToken, chatId, "❌ GOOGLE_FINANCE_WEBHOOK_URL не настроен.");
    return NextResponse.json({ ok: true });
  }

  const range = periodToRange(period);
  const reportRequest: Record<string, unknown> = { action: "getReport" };
  if (range.fromDate) reportRequest.fromDate = range.fromDate;
  if (range.toDate) reportRequest.toDate = range.toDate;

  try {
    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reportRequest),
    });

    // Apps Script redirects, follow manually
    let jsonText = await resp.text();
    if (resp.status === 302 || resp.headers.get("location")) {
      const loc = resp.headers.get("location");
      if (loc) {
        const r2 = await fetch(loc);
        jsonText = await r2.text();
      }
    }

    const result = JSON.parse(jsonText);

    if (!result.ok || result.empty) {
      await sendMessage(botToken, chatId, `📊 <b>Финансовый отчёт</b>\n📅 ${range.label}\n\nЗа этот период записей нет.`);
      return NextResponse.json({ ok: true });
    }

    const totalIncome = result.totalIncome || 0;
    let totalExpense = result.totalExpense || 0;
    const totalIncomeUsd = result.totalIncomeUsd || 0;
    let totalExpenseUsd = result.totalExpenseUsd || 0;
    const incomeByPerson: Record<string, number> = result.incomeByPerson || {};
    const expenseByCategory: Record<string, number> = result.expenseByCategory || {};
    const incomeByPersonUsd: Record<string, number> = result.incomeByPersonUsd || {};
    const expenseByCategoryUsd: Record<string, number> = result.expenseByCategoryUsd || {};
    const incomeCash = result.incomeCash || 0;
    const incomeBank = result.incomeBank || 0;
    let expenseCash = result.expenseCash || 0;
    let expenseBank = result.expenseBank || 0;
    const incomeCashUsd = result.incomeCashUsd || 0;
    const incomeBankUsd = result.incomeBankUsd || 0;
    let expenseCashUsd = result.expenseCashUsd || 0;
    let expenseBankUsd = result.expenseBankUsd || 0;
    let count = result.count || 0;

    // Fetch personal expenses for allowed viewers (same period)
    const canSeePersonal = PERSONAL_EXPENSE_VIEWERS.includes(chatId);
    if (canSeePersonal && process.env.GOOGLE_PERSONAL_WEBHOOK_URL) {
      try {
        const pResp = await fetch(process.env.GOOGLE_PERSONAL_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reportRequest),
        });
        let pText = await pResp.text();
        if (pResp.status === 302 || pResp.headers.get("location")) {
          const loc = pResp.headers.get("location");
          if (loc) { const r2 = await fetch(loc); pText = await r2.text(); }
        }
        const pResult = JSON.parse(pText);
        if (pResult.ok && !pResult.empty) {
          const pExp = pResult.totalExpense || 0;
          const pExpUsd = pResult.totalExpenseUsd || 0;
          totalExpense += pExp;
          totalExpenseUsd += pExpUsd;
          expenseCash += pResult.expenseCash || 0;
          expenseBank += pResult.expenseBank || 0;
          expenseCashUsd += pResult.expenseCashUsd || 0;
          expenseBankUsd += pResult.expenseBankUsd || 0;
          count += pResult.count || 0;
          if (pExp > 0) expenseByCategory["Личное"] = (expenseByCategory["Личное"] || 0) + pExp;
          if (pExpUsd > 0) expenseByCategoryUsd["Личное"] = (expenseByCategoryUsd["Личное"] || 0) + pExpUsd;
        }
      } catch { /* personal sheet not available */ }
    }

    const profit = totalIncome - totalExpense;
    const profitUsd = totalIncomeUsd - totalExpenseUsd;

    const fmt = (n: number) => n.toLocaleString("ru-RU");

    let report = `📊 <b>Финансовый отчёт</b>\n📅 ${range.label}\n`;

    // UAH section
    report += `\n🇺🇦 <b>Гривна:</b>\n`;
    report += `📈 Доходы: ${fmt(totalIncome)} грн`;
    if (incomeCash > 0 || incomeBank > 0) {
      report += `  (💵 ${fmt(incomeCash)} / 💳 ${fmt(incomeBank)})`;
    }
    report += `\n📉 Расходы: ${fmt(totalExpense)} грн`;
    if (expenseCash > 0 || expenseBank > 0) {
      report += `  (💵 ${fmt(expenseCash)} / 💳 ${fmt(expenseBank)})`;
    }
    report += `\n${profit >= 0 ? "✅" : "🔴"} Разница: ${fmt(profit)} грн\n`;

    const topIncome = Object.entries(incomeByPerson)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5);
    if (topIncome.length > 0) {
      report += `\n💰 <b>Поступления (₴):</b>\n`;
      for (const [person, amt] of topIncome) {
        report += `  • ${person}: ${fmt(amt as number)} грн\n`;
      }
    }

    const topExpenses = Object.entries(expenseByCategory)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5);
    if (topExpenses.length > 0) {
      report += `\n📉 <b>Расходы (₴):</b>\n`;
      for (const [cat, amt] of topExpenses) {
        report += `  • ${cat}: ${fmt(amt as number)} грн\n`;
      }
    }

    // USD section
    if (totalIncomeUsd > 0 || totalExpenseUsd > 0) {
      report += `\n💵 <b>Доллар:</b>\n`;
      report += `📈 Доходы: ${fmt(totalIncomeUsd)} $`;
      if (incomeCashUsd > 0 || incomeBankUsd > 0) {
        report += `  (💵 ${fmt(incomeCashUsd)} / 💳 ${fmt(incomeBankUsd)})`;
      }
      report += `\n📉 Расходы: ${fmt(totalExpenseUsd)} $`;
      if (expenseCashUsd > 0 || expenseBankUsd > 0) {
        report += `  (💵 ${fmt(expenseCashUsd)} / 💳 ${fmt(expenseBankUsd)})`;
      }
      report += `\n${profitUsd >= 0 ? "✅" : "🔴"} Разница: ${fmt(profitUsd)} $\n`;

      const topIncomeUsd = Object.entries(incomeByPersonUsd)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 5);
      if (topIncomeUsd.length > 0) {
        report += `\n💰 <b>Поступления ($):</b>\n`;
        for (const [person, amt] of topIncomeUsd) {
          report += `  • ${person}: ${fmt(amt as number)} $\n`;
        }
      }

      const topExpensesUsd = Object.entries(expenseByCategoryUsd)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 5);
      if (topExpensesUsd.length > 0) {
        report += `\n📉 <b>Расходы ($):</b>\n`;
        for (const [cat, amt] of topExpensesUsd) {
          report += `  • ${cat}: ${fmt(amt as number)} $\n`;
        }
      }
    }

    report += `\n📋 Всего записей: ${count}`;

    await sendMessage(botToken, chatId, report);
  } catch (err) {
    console.error("[Finance Report] Error fetching from Google Sheet:", err);
    await sendMessage(botToken, chatId, "❌ Ошибка получения отчёта из таблицы.");
  }

  return NextResponse.json({ ok: true });
}

// Handle order status inline button callbacks
async function handleOrderStatusCallback(
  callbackQuery: {
    id: string;
    from: { id: number; first_name?: string };
    message?: { chat: { id: number }; message_id: number; text?: string };
    data?: string;
  },
  botToken: string
) {
  const data = callbackQuery.data || "";
  const parts = data.split(":");
  const orderId = parts[1];
  const newStatus = parts[2];

  if (!orderId || !newStatus) {
    await answerCallback(botToken, callbackQuery.id, "Ошибка данных");
    return NextResponse.json({ ok: true });
  }

  try {
    const admin = createAdminClient();

    const { data: order, error: fetchErr } = await admin
      .from("orders")
      .select("id, status, order_number, customer_name")
      .eq("id", orderId)
      .single();

    if (fetchErr || !order) {
      await answerCallback(botToken, callbackQuery.id, "Заказ не найден");
      return NextResponse.json({ ok: true });
    }

    const statusFlow = ["draft", "confirmed", "shipped", "completed"];
    const currentIdx = statusFlow.indexOf(order.status);
    const finalStatus = order.status === newStatus
      ? (currentIdx > 0 ? statusFlow[currentIdx - 1] : "draft")
      : newStatus;

    const { error: updateErr } = await admin
      .from("orders")
      .update({ status: finalStatus })
      .eq("id", orderId);

    if (updateErr) {
      await answerCallback(botToken, callbackQuery.id, "Ошибка обновления");
      return NextResponse.json({ ok: true });
    }

    const isConfirmed = ["confirmed", "shipped", "completed"].includes(finalStatus);
    const isShipped = ["shipped", "completed"].includes(finalStatus);
    const isDelivered = finalStatus === "completed";

    const updatedKeyboard = {
      inline_keyboard: [
        [
          { text: `${isConfirmed ? "✅" : "⬜"} Подтверждено`, callback_data: `order_status:${orderId}:confirmed` },
          { text: `${isShipped ? "📦" : "⬜"} Отправлено`, callback_data: `order_status:${orderId}:shipped` },
          { text: `${isDelivered ? "🏠" : "⬜"} Доставлено`, callback_data: `order_status:${orderId}:completed` },
        ],
      ],
    };

    const chatId = callbackQuery.message?.chat?.id;
    const messageId = callbackQuery.message?.message_id;

    if (chatId && messageId && botToken) {
      const originalText = callbackQuery.message?.text || "";
      const statusLine = `\n\n📋 Статус: ${STATUS_LABELS[finalStatus] || finalStatus}`;
      const cleanText = originalText.replace(/\n\n📋 Статус:.*$/, "");
      const newText = cleanText + statusLine;

      await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: newText,
          reply_markup: updatedKeyboard,
        }),
      });

      try {
        const { data: otherMessages } = await admin
          .from("telegram_order_messages")
          .select("chat_id, message_id")
          .eq("order_id", orderId)
          .neq("chat_id", chatId);

        if (otherMessages && otherMessages.length > 0) {
          await Promise.allSettled(
            otherMessages.map(async (msg: { chat_id: number; message_id: number }) => {
              await fetch(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: msg.chat_id,
                  message_id: msg.message_id,
                  reply_markup: updatedKeyboard,
                }),
              });
            })
          );
        }
      } catch { /* table may not exist */ }
    }

    const orderLabel = order.order_number ? `#${order.order_number}` : orderId.slice(0, 8);
    await answerCallback(botToken, callbackQuery.id, `Заказ ${orderLabel}: ${STATUS_LABELS[finalStatus] || finalStatus}`);
  } catch (err) {
    console.error("[Telegram] Callback error:", err);
    await answerCallback(botToken, callbackQuery.id, "Ошибка сервера");
  }

  return NextResponse.json({ ok: true });
}

async function answerCallback(botToken: string, callbackQueryId: string, text: string) {
  if (!botToken) return;
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
  });
}

/* ─────────────────────────── AI handlers (voice / text / photo) ─────────────────────────── */

/** Apply intent → save finance record(s). Handles multi-item intents. */
async function applyIntent(
  admin: ReturnType<typeof createAdminClient>,
  botToken: string,
  chatId: number,
  intent: FinanceIntent,
): Promise<NextResponse> {
  // Multi-item: each item gets saved as a separate record
  if (intent.items && intent.items.length > 0) {
    let okCount = 0;
    const errors: string[] = [];
    for (const item of intent.items) {
      const action = (item.action as string) || intent.action;
      if (action !== "expense" && action !== "income") continue;
      const amount = item.amount != null ? Number(item.amount) : null;
      if (!amount || amount <= 0) continue;

      const categoryKey = (item.category as string | null | undefined) || null;
      let categoryLabel: string | undefined;
      if (action === "expense") {
        if (!categoryKey || !CATEGORY_LABELS[categoryKey]) {
          errors.push(`«${item.description || "?"}» — категория не определена`);
          continue;
        }
        if (categoryKey === "personal" && !canCreatePersonal(chatId)) {
          errors.push(`«${item.description || "?"}» — категория «Личное» недоступна`);
          continue;
        }
        categoryLabel = CATEGORY_LABELS[categoryKey];
      }

      const currency = (item.currency as string) === "дол" ? "дол" : "грн";
      const description = (item.description as string) || "";
      const sheetDate = parseTxnDateToSheet((item.txn_date as string | null) || intent.txn_date);
      const itemPayment = (item.payment_method as PaymentMethod | null | undefined) ?? intent.payment_method ?? "bank";
      const itemPaymentLabel = itemPayment === "cash" ? "наличка" : "безнал";

      const result = await appendToFinanceSheet({
        type: action,
        date: sheetDate,
        description,
        amount,
        currency,
        paymentMethod: itemPaymentLabel,
        ...(action === "expense" && categoryLabel ? { category: categoryLabel } : {}),
      });

      if (result.ok) {
        okCount++;
        const summary = formatRecordSummary(action, sheetDate, categoryLabel, description, amount, currency, itemPayment);
        if (categoryLabel === "Личное") {
          await Promise.allSettled(PERSONAL_EXPENSE_VIEWERS.map((cid) => sendMessage(botToken, cid, summary)));
        } else {
          await sendToAllSubscribers(botToken, summary);
        }
      } else {
        errors.push(`«${description || "?"}» — ${result.error || "ошибка"}`);
      }
    }
    if (errors.length > 0) {
      await sendMessage(botToken, chatId, `${okCount > 0 ? `✅ Записано: ${okCount}` : "❌ Ничего не записал"}\n\n⚠️ Не записал:\n• ${errors.join("\n• ")}`);
    }
    return NextResponse.json({ ok: true });
  }

  // Single record
  if (intent.action === "report") {
    return handleReport(admin, botToken, chatId, intent.query_period);
  }

  if (intent.action !== "expense" && intent.action !== "income") {
    await sendMessage(botToken, chatId, `🤔 Не понял. Повтори голосом или текстом — например, «купил ткань 5000».`);
    return NextResponse.json({ ok: true });
  }

  const amount = intent.amount;
  if (!amount || amount <= 0) {
    await sendMessage(botToken, chatId, "🤔 Не уловил сумму, повтори.");
    return NextResponse.json({ ok: true });
  }

  let categoryLabel: string | undefined;
  if (intent.action === "expense") {
    if (!intent.category || !CATEGORY_LABELS[intent.category]) {
      await sendMessage(botToken, chatId, "🤔 Не определил категорию. Уточни описание — например, «купил ткани на 5000» или «пуговицы 800».");
      return NextResponse.json({ ok: true });
    }
    if (intent.category === "personal" && !canCreatePersonal(chatId)) {
      await sendMessage(botToken, chatId, "⛔ Категория «Личное» вам недоступна.");
      return NextResponse.json({ ok: true });
    }
    categoryLabel = CATEGORY_LABELS[intent.category];
  }

  const currency = intent.currency === "дол" ? "дол" : "грн";
  const description = intent.description || "";
  const sheetDate = parseTxnDateToSheet(intent.txn_date);

  return saveFinanceRecord(
    admin,
    botToken,
    chatId,
    intent.action,
    description,
    amount,
    currency,
    categoryLabel,
    [],
    sheetDate,
    intent.payment_method ?? "bank",
  );
}

function formatRecordSummary(
  action: string,
  sheetDate: string,
  categoryLabel: string | undefined,
  description: string,
  amount: number,
  currency: string,
  paymentMethod: PaymentMethod,
): string {
  const isExpense = action === "expense";
  const typeEmoji = isExpense ? "📉" : "💰";
  const typeLabel = isExpense ? "Расход" : "Доход";
  const currencySymbol = currency === "дол" ? "$" : "грн";

  let s = `${typeEmoji} ${typeLabel}\n📅 ${sheetDate}`;
  if (isExpense && categoryLabel) s += `\n📂 ${categoryLabel}`;
  if (description) s += `\n${isExpense ? "📝" : "👤"} ${description}`;
  s += `\n💰 ${amount.toLocaleString("ru-RU")} ${currencySymbol}`;
  s += `\n${paymentMethod === "cash" ? "💵 Наличка" : "💳 Безнал"}`;
  return s;
}

async function handleVoiceMessage(
  admin: ReturnType<typeof createAdminClient>,
  botToken: string,
  chatId: number,
  fileId: string,
): Promise<NextResponse> {
  // Clear any pending finance flow — voice replaces it
  await admin.from("telegram_bot_state").delete().eq("chat_id", chatId);

  try {
    const { base64, mimeType } = await downloadTelegramFile(fileId);
    const intent = await parseVoiceIntent(base64, mimeType);
    return applyIntent(admin, botToken, chatId, intent);
  } catch (err) {
    console.error("[Voice] Failed:", err);
    await sendMessage(botToken, chatId, `❌ Не получилось распознать голос: ${(err as Error).message?.slice(0, 150) || "ошибка"}\n\nПопробуй ещё раз.`);
    return NextResponse.json({ ok: true });
  }
}

async function handleTextAI(
  admin: ReturnType<typeof createAdminClient>,
  botToken: string,
  chatId: number,
  text: string,
): Promise<NextResponse> {
  try {
    const intent = await parseTextIntent(text);
    if (intent.action === "unknown" || intent.confidence < 0.6) {
      // Stay quiet on casual text — don't spam "не понял" for every message
      return NextResponse.json({ ok: true });
    }
    return applyIntent(admin, botToken, chatId, intent);
  } catch (err) {
    console.error("[Text AI] Failed:", err);
    return NextResponse.json({ ok: true });
  }
}

async function handlePhotoMessage(
  admin: ReturnType<typeof createAdminClient>,
  botToken: string,
  chatId: number,
  fileId: string,
): Promise<NextResponse> {
  // Clear any pending finance flow — photo replaces it
  await admin.from("telegram_bot_state").delete().eq("chat_id", chatId);

  try {
    const { base64, mimeType } = await downloadTelegramFile(fileId);
    const receipt = await parsePhotoReceipt(base64, mimeType);

    if (!receipt.items.length) {
      await sendMessage(botToken, chatId, "❌ Не удалось распознать чек. Попробуй сфотографировать чётче.");
      return NextResponse.json({ ok: true });
    }

    // Strip "personal" items for users not allowed to create them — remap to "hardware" silently
    const isAllowedPersonal = canCreatePersonal(chatId);
    if (!isAllowedPersonal) {
      receipt.items = receipt.items.map((it) => (it.category === "personal" ? { ...it, category: "hardware" } : it));
    }

    let preview = "🧾 <b>Распознал чек:</b>\n";
    if (receipt.store) preview += `🏪 ${receipt.store}\n`;
    if (receipt.date) preview += `📅 ${receipt.date}\n`;
    preview += "\n";
    receipt.items.forEach((it, i) => {
      const catLabel = CATEGORY_LABELS[it.category] || it.category;
      preview += `${i + 1}. ${it.name} — ${it.amount.toLocaleString("ru-RU")} ${receipt.currency === "дол" ? "$" : "грн"} → ${catLabel}\n`;
    });
    preview += `\n💳 Итого: ${receipt.total.toLocaleString("ru-RU")} ${receipt.currency === "дол" ? "$" : "грн"}\n\nЗаписать всё?`;

    const sentMsgId = await sendMessageAndTrack(botToken, chatId, preview, {
      inline_keyboard: [[
        { text: "✅ Записать всё", callback_data: "rcpt:ok" },
        { text: "❌ Отмена", callback_data: "rcpt:no" },
      ]],
    });

    await admin.from("telegram_bot_state").upsert(
      {
        chat_id: chatId,
        action: "receipt_pending",
        step: "confirm",
        data: { receipt, preview_msg_id: sentMsgId },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "chat_id" },
    );
  } catch (err) {
    console.error("[Photo] Failed:", err);
    await sendMessage(botToken, chatId, `❌ Не получилось распознать чек: ${(err as Error).message?.slice(0, 150) || "ошибка"}`);
  }

  return NextResponse.json({ ok: true });
}

async function handleReceiptCallback(
  callbackQuery: {
    id: string;
    from: { id: number };
    message?: { chat: { id: number }; message_id: number };
    data?: string;
  },
  botToken: string,
): Promise<NextResponse> {
  const chatId = callbackQuery.message?.chat?.id;
  const messageId = callbackQuery.message?.message_id;
  const action = (callbackQuery.data || "").replace("rcpt:", "");

  if (!chatId || !messageId) {
    await answerCallback(botToken, callbackQuery.id, "Ошибка");
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();

  const { data: state } = await admin
    .from("telegram_bot_state")
    .select("*")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (!state || state.action !== "receipt_pending") {
    await answerCallback(botToken, callbackQuery.id, "⏰ запрос устарел");
    await editMessage(botToken, chatId, messageId, "⏰ Запрос устарел — отправь фото заново.");
    return NextResponse.json({ ok: true });
  }

  if (action === "no") {
    await admin.from("telegram_bot_state").delete().eq("chat_id", chatId);
    await answerCallback(botToken, callbackQuery.id, "Отменено");
    await editMessage(botToken, chatId, messageId, "❌ Чек отменён, ничего не записал.");
    return NextResponse.json({ ok: true });
  }

  if (action === "ok") {
    const receipt = state.data?.receipt as ParsedReceipt | undefined;
    if (!receipt) {
      await answerCallback(botToken, callbackQuery.id, "Данные потеряны");
      await editMessage(botToken, chatId, messageId, "❌ Данные чека потеряны. Отправь фото заново.");
      await admin.from("telegram_bot_state").delete().eq("chat_id", chatId);
      return NextResponse.json({ ok: true });
    }

    await answerCallback(botToken, callbackQuery.id, "Записываю...");

    const sheetDate = parseTxnDateToSheet(receipt.date);
    const lines: string[] = [];
    let okCount = 0;
    for (const item of receipt.items) {
      const categoryLabel = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.hardware;
      const result = await appendToFinanceSheet({
        type: "expense",
        date: sheetDate,
        description: item.name,
        amount: item.amount,
        currency: receipt.currency,
        category: categoryLabel,
        paymentMethod: "безнал", // receipts default to non-cash; user can edit cell manually
      });
      if (result.ok) {
        okCount++;
        lines.push(`• ${item.name} — ${item.amount.toLocaleString("ru-RU")} ${receipt.currency === "дол" ? "$" : "грн"} → ${categoryLabel}`);
      } else {
        lines.push(`❌ ${item.name}: ${result.error || "ошибка"}`);
      }
    }

    await admin.from("telegram_bot_state").delete().eq("chat_id", chatId);

    const header = receipt.store ? `🏪 ${receipt.store}\n` : "";
    const summary = `${header}✅ Записано (${okCount}/${receipt.items.length}):\n${lines.join("\n")}\n\n💳 Итого: ${receipt.total.toLocaleString("ru-RU")} ${receipt.currency === "дол" ? "$" : "грн"}`;
    await editMessage(botToken, chatId, messageId, summary);

    // Notify other subscribers (mirrors the manual flow); "Личное" only goes to viewers
    const hasPersonal = receipt.items.some((it) => CATEGORY_LABELS[it.category] === "Личное");
    if (hasPersonal) {
      await Promise.allSettled(PERSONAL_EXPENSE_VIEWERS.map((cid) => sendMessage(botToken, cid, summary)));
    } else {
      await sendToAllSubscribers(botToken, summary);
    }
    return NextResponse.json({ ok: true });
  }

  await answerCallback(botToken, callbackQuery.id, "Неизвестное действие");
  return NextResponse.json({ ok: true });
}
