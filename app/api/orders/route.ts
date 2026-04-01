import { NextResponse } from "next/server";
import { after } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { dakiEmailWrapper } from "@/lib/email-template";

// GET /api/orders — fetch authenticated user's orders (bypasses RLS via admin client)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: orders, error } = await admin
      .from("orders")
      .select("*, order_items(*, catalog_models(name, sku, image_urls))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Orders fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }

    return NextResponse.json(orders ?? []);
  } catch (err) {
    console.error("Orders GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Send order notification to Telegram — sends to ALL subscribers
async function sendTelegramNotification(order: {
  id: string;
  orderNumber?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  paymentMethod?: string;
  delivery?: { oblast: string; city: string; branch: string };
  items: { modelName: string; sku: string; color?: string; sizes: { sizeLabel: string; quantity: number }[]; unitPrice: number }[];
  totalAmount: number;
  notes?: string;
  contactMe?: boolean;
}) {
  const botToken = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  if (!botToken) {
    console.error("Telegram env var missing: TELEGRAM_BOT_TOKEN");
    return;
  }

  // Get subscribers: try DB table first, fallback to env var
  // chat_id can be bigint in Postgres — Supabase returns as string, so use string type
  const chatIds: string[] = [];
  try {
    const admin = createAdminClient();
    const { data: subscribers, error } = await admin
      .from("telegram_subscribers")
      .select("chat_id")
      .eq("is_active", true);

    if (!error && subscribers && subscribers.length > 0) {
      for (const s of subscribers) {
        const cid = String(s.chat_id ?? "").trim();
        if (cid && cid !== "null" && cid !== "undefined" && cid !== "NaN") {
          chatIds.push(cid);
        }
      }
    }
    console.log(`[Telegram] DB subscribers found: ${chatIds.length}, raw:`, subscribers?.map((s: { chat_id: unknown }) => s.chat_id));
  } catch (e) {
    console.log("[Telegram] telegram_subscribers table error:", e);
  }

  // Always include ALL env var chat IDs (comma-separated) — ensures delivery even if DB has bad data
  const envChatIdStr = (process.env.TELEGRAM_CHAT_ID || "").trim();
  if (envChatIdStr) {
    const envIds = envChatIdStr.split(",").map((id) => id.trim()).filter(Boolean);
    for (const eid of envIds) {
      if (eid && eid !== "NaN" && !chatIds.includes(eid)) {
        chatIds.push(eid);
      }
    }
  }

  if (chatIds.length === 0) {
    console.error("No Telegram chat IDs configured");
    return;
  }

  console.log(`[Telegram] Sending order #${order.orderNumber || order.id.slice(0, 8)} to ${chatIds.length} recipient(s)`);

  const itemLines = order.items.flatMap((item) =>
    item.sizes.map((sz) =>
      `📦 Товары: ${item.sku} | ${sz.sizeLabel}${item.color ? ` | ${item.color}` : ""} | ${sz.quantity} шт.`
    )
  );

  const paymentLabel = order.paymentMethod === "cod"
    ? "Наложенный платёж"
    : order.paymentMethod === "online"
      ? "Оплата на сайте"
      : "Не указано";

  const deliveryStr = order.delivery?.city
    ? `${order.delivery.oblast}, ${order.delivery.city}, ${order.delivery.branch}`
    : "Не указано";

  const text = [
    `🛍 Заказ #${order.orderNumber || order.id.slice(0, 8)}`,
    `👤 ${order.customerName}`,
    `📞 ${order.customerPhone}`,
    order.customerEmail ? `📧 ${order.customerEmail}` : "",
    ...itemLines,
    `💰 Сумма: ${Math.round(order.totalAmount)} UAH`,
    `🚚 Доставка: ${deliveryStr}`,
    `💳 Оплата: ${paymentLabel}`,
    order.contactMe ? `📞 Просит связаться для подтверждения заказа` : "",
    order.notes ? `📝 ${order.notes}` : "",
  ].filter(Boolean).join("\n");

  // Inline buttons for order management
  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: "✅ Подтверждено", callback_data: `order_status:${order.id}:confirmed` },
        { text: "📦 Отправлено", callback_data: `order_status:${order.id}:shipped` },
        { text: "🏠 Доставлено", callback_data: `order_status:${order.id}:completed` },
      ],
    ],
  };

  // Send to all subscribers in parallel
  const results = await Promise.allSettled(
    chatIds.map(async (cid) => {
      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: cid,
            text,
            reply_markup: inlineKeyboard,
          }),
        });
        const json = await res.json();
        if (!json.ok) {
          console.error(`[Telegram] Error sending to ${cid}:`, JSON.stringify(json));
          if (json.error_code === 403) {
            try {
              const adm = createAdminClient();
              await adm.from("telegram_subscribers").update({ is_active: false }).eq("chat_id", cid);
            } catch { /* table may not exist */ }
          }
        } else {
          console.log(`[Telegram] ✓ Sent to ${cid}, message_id: ${json.result?.message_id}`);
          // Save message_id for later button updates
          if (json.result?.message_id) {
            try {
              const adm = createAdminClient();
              await adm.from("telegram_order_messages").insert({
                order_id: order.id,
                chat_id: cid,
                message_id: json.result.message_id,
              });
            } catch { /* table may not exist yet */ }
          }
        }
      } catch (err) {
        console.error(`[Telegram] Failed to send to ${cid}:`, err);
      }
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  console.log(`[Telegram] Sent to ${sent}/${chatIds.length} subscribers`);
}

// Append order to Google Sheets via Apps Script webhook
async function appendToGoogleSheets(order: {
  id: string;
  orderNumber?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  paymentMethod?: string;
  delivery?: { oblast: string; city: string; branch: string };
  items: { modelName: string; sku: string; color?: string; sizes: { sizeLabel: string; quantity: number }[]; unitPrice: number }[];
  totalAmount: number;
  createdAt: string;
  notes?: string;
  contactMe?: boolean;
}) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[Google Sheets] GOOGLE_SHEETS_WEBHOOK_URL not configured, skipping");
    return;
  }
  console.log(`[Google Sheets] Sending ${order.items.length} item(s) to webhook`);

  const nameParts = order.customerName.trim().split(/\s+/);
  const lastName = nameParts[0] || "";
  const firstName = nameParts.slice(1).join(" ") || "";

  const paymentLabel = order.paymentMethod === "cod"
    ? "Наложенный платёж"
    : order.paymentMethod === "online"
      ? "Оплата на сайте"
      : "";

  const rows: Record<string, string | number>[] = [];
  for (const item of order.items) {
    for (const sz of item.sizes) {
      rows.push({
        orderId: order.orderNumber || order.id.slice(0, 8),
        date: new Date(order.createdAt).toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" }),
        lastName,
        firstName,
        phone: order.customerPhone,
        email: order.customerEmail || "",
        model: item.sku,
        size: sz.sizeLabel,
        color: item.color || "",
        quantity: sz.quantity,
        amount: Math.round(item.unitPrice * sz.quantity),
        oblast: order.delivery?.oblast || "",
        city: order.delivery?.city || "",
        branch: order.delivery?.branch || "",
        payment: paymentLabel,
        contactMe: order.contactMe ? "Да" : "",
        notes: order.notes || "",
        source: "Сайт",
      });
    }
  }

  try {
    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "appendOrder", rows }),
    });
    const text = await resp.text();
    console.log(`[Google Sheets] Response: ${resp.status} ${text.slice(0, 200)}`);
  } catch (err) {
    console.error("[Google Sheets] Append failed:", err);
  }
}

// Send order confirmation email to customer (unified DaKi style — clean, no color)
async function sendOrderConfirmationEmail(order: {
  id: string;
  orderNumber?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  paymentMethod?: string;
  delivery?: { oblast: string; city: string; branch: string };
  items: { modelName: string; sku: string; color?: string; sizes: { sizeLabel: string; quantity: number }[]; unitPrice: number }[];
  totalAmount: number;
}) {
  if (!order.customerEmail) return;

  const itemRows = order.items.map((item) => {
    return item.sizes.map((sz) =>
      `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;font-size:14px">${item.modelName} (${item.sku})</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;font-size:14px;text-align:center">${sz.sizeLabel}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;font-size:14px;text-align:center">${sz.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;font-size:14px;text-align:right">${Math.round(item.unitPrice * sz.quantity)} UAH</td>
      </tr>`
    ).join("");
  }).join("");

  const paymentLabel = order.paymentMethod === "cod" ? "Накладений платіж" : order.paymentMethod === "online" ? "Оплата на сайті" : "";
  const deliveryStr = order.delivery?.city
    ? `${order.delivery.oblast}, ${order.delivery.city}, ${order.delivery.branch}`
    : "";

  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#000">Замовлення оформлено!</h2>
    <p style="color:#666;margin:0 0 24px;font-size:14px">Номер замовлення: <strong style="color:#000">#${order.orderNumber || order.id.slice(0, 8)}</strong></p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead>
        <tr>
          <th style="padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#666;border-bottom:2px solid #000">Товар</th>
          <th style="padding:10px 12px;text-align:center;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#666;border-bottom:2px solid #000">Розмір</th>
          <th style="padding:10px 12px;text-align:center;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#666;border-bottom:2px solid #000">Кількість</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#666;border-bottom:2px solid #000">Сума</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div style="border:1px solid #e5e5e5;padding:20px;margin-bottom:24px">
      <p style="margin:0 0 4px;font-size:18px;font-weight:600;color:#000">Разом: ${Math.round(order.totalAmount)} UAH</p>
      ${paymentLabel ? `<p style="margin:4px 0 0;color:#666;font-size:14px">Оплата: ${paymentLabel}</p>` : ""}
      ${deliveryStr ? `<p style="margin:4px 0 0;color:#666;font-size:14px">Доставка: ${deliveryStr}</p>` : ""}
    </div>

    <p style="color:#666;font-size:14px;line-height:1.6;margin:0">
      Ми зв'яжемося з вами найближчим часом для підтвердження замовлення.
    </p>
  `;

  const html = dakiEmailWrapper(content);

  try {
    await sendEmail({
      to: order.customerEmail,
      subject: `DaKi — Замовлення #${order.orderNumber || order.id.slice(0, 8)} оформлено`,
      html,
    });
  } catch (err) {
    console.error("Order confirmation email failed:", err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, customerName, customerPhone, customerEmail, delivery, paymentMethod, notes, contactMe, welcomeDiscount: clientWelcomeDiscount } = body as {
      items: {
        modelId: string;
        modelName: string;
        sku: string;
        basePrice: number;
        discountPercent: number;
        color?: string;
        sizes: { sizeLabel: string; quantity: number }[];
      }[];
      customerName: string;
      customerPhone: string;
      customerEmail: string;
      delivery?: { oblast: string; city: string; branch: string };
      paymentMethod?: string;
      notes?: string;
      contactMe?: boolean;
      welcomeDiscount?: number;
    };

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }
    if (!customerName || !customerPhone || !customerEmail) {
      return NextResponse.json({ error: "Name, phone and email required" }, { status: 400 });
    }

    // Calculate total
    let totalAmount = 0;
    const orderItems: {
      model_id: string;
      size_label: string;
      quantity: number;
      unit_price: number;
      discount_percent: number;
      color: string | null;
    }[] = [];

    const notificationItems: {
      modelName: string;
      sku: string;
      color?: string;
      sizes: { sizeLabel: string; quantity: number }[];
      unitPrice: number;
    }[] = [];

    for (const item of items) {
      const finalPrice = item.basePrice * (1 - item.discountPercent / 100);
      notificationItems.push({
        modelName: item.modelName,
        sku: item.sku,
        color: item.color,
        sizes: item.sizes,
        unitPrice: finalPrice,
      });
      for (const size of item.sizes) {
        totalAmount += finalPrice * size.quantity;
        orderItems.push({
          model_id: item.modelId,
          size_label: size.sizeLabel,
          quantity: size.quantity,
          unit_price: finalPrice,
          discount_percent: item.discountPercent,
          color: item.color || null,
        });
      }
    }

    // Try to get authenticated user (optional — guest checkout allowed)
    let userId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      // No auth — guest order
    }

    // Verify and apply welcome discount (server-side validation)
    let appliedWelcomeDiscount = 0;
    if (clientWelcomeDiscount && clientWelcomeDiscount > 0 && userId) {
      const { getWelcomeDiscount, markWelcomeDiscountUsed } = await import("@/lib/data");
      const serverDiscount = await getWelcomeDiscount(userId);
      if (serverDiscount > 0 && serverDiscount === clientWelcomeDiscount) {
        appliedWelcomeDiscount = serverDiscount;
        totalAmount = Math.round(totalAmount * (1 - serverDiscount / 100) * 100) / 100;
        await markWelcomeDiscountUsed(userId);
      }
    }

    // Save to Supabase (use admin client to bypass RLS for guest orders)
    let orderId = crypto.randomUUID();
    let orderNumber = "";
    const createdAt = new Date().toISOString();

    try {
      const admin = createAdminClient();
      const { data: order, error: orderError } = await admin
        .from("orders")
        .insert({
          user_id: userId || null,
          status: "draft",
          total_amount: totalAmount,
          currency: "UAH",
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail || null,
          delivery_oblast: delivery?.oblast || null,
          delivery_city: delivery?.city || null,
          delivery_branch: delivery?.branch || null,
          payment_method: paymentMethod || null,
          notes: notes || null,
          source: "Сайт",
        })
        .select("id, order_number")
        .single();

      if (orderError) {
        console.error("Order insert error:", orderError);
      }

      if (!orderError && order) {
        orderId = order.id;
        orderNumber = String(order.order_number || "");
        const itemsWithOrderId = orderItems.map((item) => ({
          ...item,
          order_id: order.id,
        }));
        const { error: itemsError } = await admin.from("order_items").insert(itemsWithOrderId);
        if (itemsError) {
          console.error("Order items insert error:", itemsError);
        }
      }
    } catch (err) {
      console.error("Supabase order creation failed:", err);
    }

    // Decrement stock for each ordered item (same as admin retail orders)
    if (orderId) {
      const admin = createAdminClient();
      for (const item of items) {
        for (const size of item.sizes) {
          // Decrement model_colors.stock_per_size
          if (item.color) {
            const { data: colorRows } = await admin
              .from("model_colors")
              .select("id, stock_per_size")
              .eq("model_id", item.modelId)
              .eq("name", item.color);

            if (colorRows && colorRows.length > 0) {
              const colorRow = colorRows[0];
              const stockPerSize = (colorRow.stock_per_size as Record<string, number>) || {};
              const currentStock = stockPerSize[size.sizeLabel] || 0;
              stockPerSize[size.sizeLabel] = Math.max(0, currentStock - size.quantity);
              await admin.from("model_colors").update({ stock_per_size: stockPerSize }).eq("id", colorRow.id);
            }
          }

          // Decrement model_sizes.total_stock
          const { data: sizeRows } = await admin
            .from("model_sizes")
            .select("id, total_stock")
            .eq("model_id", item.modelId)
            .eq("size_label", size.sizeLabel);

          if (sizeRows && sizeRows.length > 0) {
            const sizeRow = sizeRows[0];
            await admin.from("model_sizes").update({
              total_stock: Math.max(0, sizeRow.total_stock - size.quantity),
            }).eq("id", sizeRow.id);
          }
        }
      }
    }

    const orderData = {
      id: orderId,
      orderNumber,
      customerName,
      customerPhone,
      customerEmail,
      paymentMethod,
      delivery,
      items: notificationItems,
      totalAmount,
      createdAt,
      notes,
      contactMe,
    };

    // Send notifications AFTER response — user doesn't wait for Telegram/Sheets/Email
    after(async () => {
      const { syncStockToGoogleSheets } = await import("@/lib/google-sheets-stock");
      await Promise.allSettled([
        sendTelegramNotification(orderData),
        appendToGoogleSheets(orderData),
        sendOrderConfirmationEmail(orderData),
        syncStockToGoogleSheets(),
      ]);

      // Auto-subscribe customer email to newsletter
      if (customerEmail) {
        try {
          const admin = createAdminClient();
          await admin
            .from("newsletter_subscribers")
            .upsert(
              { email: customerEmail.toLowerCase().trim() },
              { onConflict: "email" }
            );
          console.log(`[Newsletter] Subscribed ${customerEmail}`);
        } catch (err) {
          console.error("[Newsletter] Auto-subscribe failed:", err);
        }
      }
    });

    return NextResponse.json({ orderId, orderNumber, totalAmount });
  } catch (err) {
    console.error("Order API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
