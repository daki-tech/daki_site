import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const STATUS_LABELS: Record<string, string> = {
  draft: "🆕 Новый",
  confirmed: "✅ Подтверждено",
  shipped: "📦 Отправлено",
  completed: "🏠 Доставлено",
  cancelled: "❌ Отменено",
};

const FINANCE_ACTIONS: Record<string, { label: string; stepLabels: [string, string, string] }> = {
  income_cash: {
    label: "💵 Наличка (приход)",
    stepLabels: ["📅 Введите дату (дд.мм.гггг или \"сегодня\"):", "👤 От кого:", "💰 Сумма (грн):"],
  },
  income_card: {
    label: "💳 Карта (приход)",
    stepLabels: ["📅 Введите дату (дд.мм.гггг или \"сегодня\"):", "👤 От кого:", "💰 Сумма (грн):"],
  },
  expense: {
    label: "📉 Расход",
    stepLabels: ["📅 Введите дату (дд.мм.гггг или \"сегодня\"):", "📝 Описание (на что):", "💰 Сумма (грн):"],
  },
};

const STEPS = ["date", "description", "amount"] as const;

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

function getIncomeSubKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "💵 Наличка", callback_data: "fin:income_cash" },
        { text: "💳 Карта", callback_data: "fin:income_card" },
      ],
      [{ text: "◀️ Назад", callback_data: "fin:back" }],
    ],
  };
}

function parseDate(input: string): string | null {
  const today = new Date();
  const lower = input.trim().toLowerCase();
  if (["сегодня", "сьогодні", "today"].includes(lower)) {
    return today.toISOString().split("T")[0];
  }
  const match = input.trim().match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})$/);
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  let year = parseInt(match[3], 10);
  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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
}) {
  const webhookUrl = process.env.GOOGLE_FINANCE_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[Finance] GOOGLE_FINANCE_WEBHOOK_URL not configured");
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

    // /start command — show welcome + finance menu
    if (text.startsWith("/start")) {
      // Remove any reply keyboard first
      await sendMessage(botToken, chatId, "👋", { remove_keyboard: true });
      await sendMessage(
        botToken,
        chatId,
        `Привет, ${firstName || "друг"}! Вы подписаны на уведомления DaKi.\n\n💼 <b>Финансовый учет:</b>`,
        getFinanceMenuKeyboard()
      );
      return NextResponse.json({ ok: true });
    }

    // /finance command — show finance menu
    if (text === "/finance" || text === "📒 Финансы") {
      await sendMessage(botToken, chatId, "💼 <b>Финансовый учет:</b>", getFinanceMenuKeyboard());
      return NextResponse.json({ ok: true });
    }

    // /cancel command
    if (text === "/cancel" || text.toLowerCase() === "отмена") {
      await admin.from("telegram_bot_state").delete().eq("chat_id", chatId);
      await sendMessage(botToken, chatId, "❌ Отменено.\n\n💼 <b>Финансовый учет:</b>", getFinanceMenuKeyboard());
      return NextResponse.json({ ok: true });
    }

    // Check if user is in a finance input flow
    const { data: state } = await admin
      .from("telegram_bot_state")
      .select("*")
      .eq("chat_id", chatId)
      .single();

    if (state) {
      return handleFinanceStep(admin, botToken, chatId, state, text);
    }

    // Default: unknown text — show finance menu
    await sendMessage(botToken, chatId, "💼 <b>Финансовый учет:</b>", getFinanceMenuKeyboard());
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

  // "Доход" → show sub-menu (edit existing message)
  if (action === "income") {
    await editMessage(botToken, chatId, messageId, "💰 <b>Выберите тип дохода:</b>", getIncomeSubKeyboard());
    await answerCallback(botToken, callbackQuery.id, "");
    return NextResponse.json({ ok: true });
  }

  // "Назад" → back to main finance menu
  if (action === "back") {
    await editMessage(botToken, chatId, messageId, "💼 <b>Финансовый учет:</b>", getFinanceMenuKeyboard());
    await answerCallback(botToken, callbackQuery.id, "");
    return NextResponse.json({ ok: true });
  }

  // "Отчет" → show report
  if (action === "report") {
    await answerCallback(botToken, callbackQuery.id, "Формирую отчет...");
    return handleReport(admin, botToken, chatId);
  }

  // Start finance input flow (income_cash, income_card, expense)
  if (FINANCE_ACTIONS[action]) {
    // Save state to DB
    await admin.from("telegram_bot_state").upsert(
      { chat_id: chatId, action, step: "date", data: {}, updated_at: new Date().toISOString() },
      { onConflict: "chat_id" }
    );
    const actionInfo = FINANCE_ACTIONS[action];
    // Edit menu message to show what was selected, then send input prompt
    await editMessage(botToken, chatId, messageId, `${actionInfo.label}\n\n<i>Заполните данные ниже. /cancel для отмены.</i>`);
    await sendMessage(botToken, chatId, actionInfo.stepLabels[0]);
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
  state: { action: string; step: string; data: Record<string, string> },
  input: string
) {
  const actionInfo = FINANCE_ACTIONS[state.action];
  if (!actionInfo) {
    await admin.from("telegram_bot_state").delete().eq("chat_id", chatId);
    await sendMessage(botToken, chatId, "❌ Ошибка. Попробуйте снова.\n\n💼 <b>Финансовый учет:</b>", getFinanceMenuKeyboard());
    return NextResponse.json({ ok: true });
  }

  if (state.step === "date") {
    const parsed = parseDate(input);
    if (!parsed) {
      await sendMessage(botToken, chatId, "⚠️ Неверный формат. Введите дд.мм.гггг или \"сегодня\":");
      return NextResponse.json({ ok: true });
    }
    await admin.from("telegram_bot_state").update({
      step: "description",
      data: { ...state.data, date: parsed },
      updated_at: new Date().toISOString(),
    }).eq("chat_id", chatId);
    await sendMessage(botToken, chatId, actionInfo.stepLabels[1]);
    return NextResponse.json({ ok: true });
  }

  if (state.step === "description") {
    if (!input || input.length < 1) {
      await sendMessage(botToken, chatId, "⚠️ Введите описание:");
      return NextResponse.json({ ok: true });
    }
    await admin.from("telegram_bot_state").update({
      step: "amount",
      data: { ...state.data, description: input },
      updated_at: new Date().toISOString(),
    }).eq("chat_id", chatId);
    await sendMessage(botToken, chatId, actionInfo.stepLabels[2]);
    return NextResponse.json({ ok: true });
  }

  if (state.step === "amount") {
    const amount = parseAmount(input);
    if (!amount) {
      await sendMessage(botToken, chatId, "⚠️ Неверная сумма. Введите число (например: 1500 или 2500.50):");
      return NextResponse.json({ ok: true });
    }

    // Save record to DB
    const record = {
      type: state.action,
      date: state.data.date,
      description: state.data.description,
      amount,
      recorded_by: chatId,
    };

    const { error: insertErr } = await admin.from("finance_records").insert(record);
    if (insertErr) {
      console.error("[Finance] Insert error:", insertErr);
      await sendMessage(botToken, chatId, "❌ Ошибка сохранения. Попробуйте снова.\n\n💼 <b>Финансовый учет:</b>", getFinanceMenuKeyboard());
      await admin.from("telegram_bot_state").delete().eq("chat_id", chatId);
      return NextResponse.json({ ok: true });
    }

    // Append to Google Sheets (fire-and-forget)
    appendToFinanceSheet({
      type: state.action,
      date: state.data.date,
      description: state.data.description,
      amount,
    });

    // Clear state
    await admin.from("telegram_bot_state").delete().eq("chat_id", chatId);

    // Final confirmation message with all info + menu
    const dateFormatted = state.data.date.split("-").reverse().join(".");
    const typeEmoji = state.action === "expense" ? "📉" : state.action === "income_cash" ? "💵" : "💳";
    const typeLabel = state.action === "expense" ? "Расход" : state.action === "income_cash" ? "Наличка" : "Карта";
    const descLabel = state.action === "expense" ? "На что" : "От кого";

    await sendMessage(
      botToken,
      chatId,
      `✅ <b>${typeLabel} записано!</b>\n\n${typeEmoji} Тип: ${typeLabel}\n📅 Дата: ${dateFormatted}\n${state.action === "expense" ? "📝" : "👤"} ${descLabel}: ${state.data.description}\n💰 Сумма: ${amount.toLocaleString("ru-RU")} грн\n\n💼 <b>Финансовый учет:</b>`,
      getFinanceMenuKeyboard()
    );
    return NextResponse.json({ ok: true });
  }

  // Unknown step — reset
  await admin.from("telegram_bot_state").delete().eq("chat_id", chatId);
  await sendMessage(botToken, chatId, "💼 <b>Финансовый учет:</b>", getFinanceMenuKeyboard());
  return NextResponse.json({ ok: true });
}

async function handleReport(
  admin: ReturnType<typeof createAdminClient>,
  botToken: string,
  chatId: number,
) {
  const { data: records, error } = await admin
    .from("finance_records")
    .select("type, date, description, amount")
    .order("date", { ascending: false });

  if (error || !records || records.length === 0) {
    await sendMessage(botToken, chatId, "📊 Пока нет записей.\n\n💼 <b>Финансовый учет:</b>", getFinanceMenuKeyboard());
    return NextResponse.json({ ok: true });
  }

  let totalIncomeCash = 0;
  let totalIncomeCard = 0;
  let totalExpense = 0;
  const incomeByPerson: Record<string, number> = {};
  const expenseByCategory: Record<string, number> = {};

  for (const r of records) {
    const amt = Number(r.amount);
    if (r.type === "income_cash") {
      totalIncomeCash += amt;
      incomeByPerson[r.description] = (incomeByPerson[r.description] || 0) + amt;
    } else if (r.type === "income_card") {
      totalIncomeCard += amt;
      incomeByPerson[r.description] = (incomeByPerson[r.description] || 0) + amt;
    } else if (r.type === "expense") {
      totalExpense += amt;
      expenseByCategory[r.description] = (expenseByCategory[r.description] || 0) + amt;
    }
  }

  const totalIncome = totalIncomeCash + totalIncomeCard;
  const profit = totalIncome - totalExpense;

  const topExpenses = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topIncome = Object.entries(incomeByPerson)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const fmt = (n: number) => n.toLocaleString("ru-RU");

  let report = `📊 <b>Финансовый отчет</b>\n\n`;
  report += `💵 Наличка: ${fmt(totalIncomeCash)} грн\n`;
  report += `💳 Карта: ${fmt(totalIncomeCard)} грн\n`;
  report += `📈 <b>Всего доходов: ${fmt(totalIncome)} грн</b>\n\n`;
  report += `📉 <b>Всего расходов: ${fmt(totalExpense)} грн</b>\n\n`;
  report += `${profit >= 0 ? "✅" : "🔴"} <b>Прибыль: ${fmt(profit)} грн</b>\n`;

  if (topExpenses.length > 0) {
    report += `\n📉 <b>Топ расходов:</b>\n`;
    for (const [cat, amt] of topExpenses) {
      report += `  • ${cat}: ${fmt(amt)} грн\n`;
    }
  }

  if (topIncome.length > 0) {
    report += `\n💰 <b>От кого поступления:</b>\n`;
    for (const [person, amt] of topIncome) {
      report += `  • ${person}: ${fmt(amt)} грн\n`;
    }
  }

  report += `\n📋 Всего записей: ${records.length}`;

  await sendMessage(botToken, chatId, report, getFinanceMenuKeyboard());
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
