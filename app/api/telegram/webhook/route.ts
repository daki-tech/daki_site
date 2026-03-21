import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

// Only this user can create "Личное" expenses
const PERSONAL_EXPENSE_CREATOR_ID = 729892588;
// These users can see "Личное" in reports
const PERSONAL_EXPENSE_VIEWERS = [330206846, 729892588];

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

  // Fallback to env var
  if (chatIds.length === 0) {
    const allowedStr = process.env.TELEGRAM_ALLOWED_USERS || process.env.TELEGRAM_CHAT_ID || "";
    const ids = allowedStr.split(",").map((id) => id.trim()).filter(Boolean).map(Number).filter((n) => !isNaN(n));
    chatIds.push(...ids);
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
  if (chatId === PERSONAL_EXPENSE_CREATOR_ID) {
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
}) {
  // "Личное" goes to separate personal sheet
  const isPersonal = record.category === "Личное";
  const webhookUrl = isPersonal
    ? process.env.GOOGLE_PERSONAL_WEBHOOK_URL
    : process.env.GOOGLE_FINANCE_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn(`[Finance] ${isPersonal ? "GOOGLE_PERSONAL_WEBHOOK_URL" : "GOOGLE_FINANCE_WEBHOOK_URL"} not configured`);
    return;
  }
  try {
    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addFinance", ...record }),
    });
    const text = await resp.text();
    console.log(`[Finance Sheet] Response: ${resp.status} ${text.slice(0, 200)}`);
  } catch (err) {
    console.error("[Finance Sheet] Failed:", err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const botToken = (process.env.TELEGRAM_BOT_TOKEN || "").trim();

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

    // /start command — show welcome + persistent "Финансы" button
    if (text.startsWith("/start")) {
      await sendMessage(
        botToken,
        chatId,
        `Привет, ${firstName || "друг"}! Вы подписаны на уведомления DaKi.`,
        { keyboard: [[{ text: "Финансы" }]], resize_keyboard: true, is_persistent: true }
      );
      return NextResponse.json({ ok: true });
    }

    // /finance command — show finance menu (delete the command message itself to keep chat clean)
    if (text === "/finance" || text === "Финансы" || text === "📒 Финансы") {
      await deleteMessage(botToken, chatId, message.message_id);
      await sendMessage(botToken, chatId, "💼 <b>Финансовый учет:</b>", getFinanceMenuKeyboard());
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
      .single();

    if (state) {
      // Track user's input message ID for cleanup
      const userMsgId = message.message_id;
      const existingMsgIds = (state.data?.msg_ids as number[]) || [];
      if (userMsgId) {
        state.data = { ...state.data, msg_ids: [...existingMsgIds, userMsgId] };
      }
      return handleFinanceStep(admin, botToken, chatId, state, text);
    }

    // Default: unknown text — just acknowledge
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
      .single();

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
      .single();

    if (!state || state.step !== "currency") {
      await answerCallback(botToken, callbackQuery.id, "Сессия устарела");
      return NextResponse.json({ ok: true });
    }

    const currencyLabel = currency === "дол" ? "💵 Доллар" : "🇺🇦 Гривна";
    await editMessage(botToken, chatId, messageId, `💱 Валюта: ${currencyLabel}`);

    const promptMsgId = await sendMessageAndTrack(botToken, chatId, "💰 Сума:");
    const msgIds = (state.data?.msg_ids as number[]) || [];
    await admin.from("telegram_bot_state").update({
      step: "amount",
      data: { ...state.data, currency, msg_ids: [...msgIds, ...(promptMsgId ? [promptMsgId] : [])] },
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
      .single();

    if (!state || state.step !== "expense_description") {
      await answerCallback(botToken, callbackQuery.id, "Сессия устарела");
      return NextResponse.json({ ok: true });
    }

    await editMessage(botToken, chatId, messageId, "📝 Описание: —");

    const amount = state.data.amount as number;
    const currency = (state.data.currency as string) || "грн";
    const category = state.data.category as string;
    const msgIds = (state.data.msg_ids as number[]) || [];

    await answerCallback(botToken, callbackQuery.id, "");
    return saveFinanceRecord(admin, botToken, chatId, "expense", "", amount, currency, category, msgIds);
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
    await sendMessage(botToken, chatId, "❌ Ошибка. Попробуйте снова. Нажмите 📒 Финансы.");
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
    return saveFinanceRecord(admin, botToken, chatId, state.action, descStr, amount, currency, undefined, msgIds);
  }

  // Expense description step (optional text or skip)
  if (state.step === "expense_description") {
    const description = input.trim() || "";
    const amount = state.data.amount as number;
    const currency = (state.data.currency as string) || "грн";
    const category = state.data.category as string;
    return saveFinanceRecord(admin, botToken, chatId, "expense", description, amount, currency, category, msgIds);
  }

  // Unknown step — reset
  await admin.from("telegram_bot_state").delete().eq("chat_id", chatId);
  await sendMessage(botToken, chatId, "❌ Ошибка. Нажмите 📒 Финансы.");
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
) {
  const today = new Date();
  const sheetDate = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;
  const isExpense = action === "expense";

  appendToFinanceSheet({
    type: action,
    date: sheetDate,
    description: isExpense ? description : description,
    amount,
    currency,
    ...(isExpense && category ? { category } : {}),
  });

  await admin.from("telegram_bot_state").delete().eq("chat_id", chatId);

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

  await sendToAllSubscribers(botToken, summaryText);
  return NextResponse.json({ ok: true });
}

async function handleReport(
  admin: ReturnType<typeof createAdminClient>,
  botToken: string,
  chatId: number,
) {
  // Read report data from Google Sheet (single source of truth)
  const webhookUrl = process.env.GOOGLE_FINANCE_WEBHOOK_URL;
  if (!webhookUrl) {
    await sendMessage(botToken, chatId, "❌ GOOGLE_FINANCE_WEBHOOK_URL не настроен.");
    return NextResponse.json({ ok: true });
  }

  try {
    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "getReport" }),
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
      await sendMessage(botToken, chatId, "📊 Пока нет записей в таблице.");
      return NextResponse.json({ ok: true });
    }

    let totalIncome = result.totalIncome || 0;
    let totalExpense = result.totalExpense || 0;
    let totalIncomeUsd = result.totalIncomeUsd || 0;
    let totalExpenseUsd = result.totalExpenseUsd || 0;
    const incomeByPerson: Record<string, number> = result.incomeByPerson || {};
    const expenseByCategory: Record<string, number> = result.expenseByCategory || {};
    const incomeByPersonUsd: Record<string, number> = result.incomeByPersonUsd || {};
    const expenseByCategoryUsd: Record<string, number> = result.expenseByCategoryUsd || {};
    let count = result.count || 0;

    // Fetch personal expenses for allowed viewers
    const canSeePersonal = PERSONAL_EXPENSE_VIEWERS.includes(chatId);
    if (canSeePersonal && process.env.GOOGLE_PERSONAL_WEBHOOK_URL) {
      try {
        const pResp = await fetch(process.env.GOOGLE_PERSONAL_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "getReport" }),
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
          count += pResult.count || 0;
          if (pExp > 0) expenseByCategory["Личное"] = (expenseByCategory["Личное"] || 0) + pExp;
          if (pExpUsd > 0) expenseByCategoryUsd["Личное"] = (expenseByCategoryUsd["Личное"] || 0) + pExpUsd;
        }
      } catch { /* personal sheet not available */ }
    }

    const profit = totalIncome - totalExpense;
    const profitUsd = totalIncomeUsd - totalExpenseUsd;

    const fmt = (n: number) => n.toLocaleString("ru-RU");

    let report = `📊 <b>Финансовый отчет</b>\n`;

    // UAH section
    report += `\n🇺🇦 <b>Гривна:</b>\n`;
    report += `📈 Доходы: ${fmt(totalIncome)} грн\n`;
    report += `📉 Расходы: ${fmt(totalExpense)} грн\n`;
    report += `${profit >= 0 ? "✅" : "🔴"} Разница: ${fmt(profit)} грн\n`;

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
      report += `📈 Доходы: ${fmt(totalIncomeUsd)} $\n`;
      report += `📉 Расходы: ${fmt(totalExpenseUsd)} $\n`;
      report += `${profitUsd >= 0 ? "✅" : "🔴"} Разница: ${fmt(profitUsd)} $\n`;

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
