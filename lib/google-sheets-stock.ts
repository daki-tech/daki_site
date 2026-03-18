import { createAdminClient } from "@/lib/supabase/admin";

interface ColorStock {
  colorName: string;
  hex: string;
  stockPerSize: Record<string, number>;
}

interface ModelStock {
  sku: string;
  name: string;
  sizes: string[];
  colors: ColorStock[];
}

/**
 * Fetch all models with stock data and push to Google Sheets "Залишки" tab
 */
export async function syncStockToGoogleSheets() {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[Stock Sync] GOOGLE_SHEETS_WEBHOOK_URL not configured");
    return;
  }

  const admin = createAdminClient();
  const { data: models, error } = await admin
    .from("catalog_models")
    .select("*, model_sizes(*), model_colors(*)")
    .eq("is_active", true)
    .order("sku", { ascending: true });

  if (error || !models) {
    console.error("[Stock Sync] Failed to fetch models:", error?.message);
    return;
  }

  // Build stock data per model
  const stockData: ModelStock[] = models.map((m) => {
    const sizes = (m.model_sizes ?? [])
      .map((s: { size_label: string }) => s.size_label)
      .sort((a: string, b: string) => Number(a) - Number(b));

    const colors: ColorStock[] = (m.model_colors ?? []).map((c: Record<string, unknown>) => ({
      colorName: (c.name as string) || "",
      hex: (c.hex as string) || "",
      stockPerSize: (c.stock_per_size as Record<string, number>) ?? {},
    }));

    return { sku: m.sku, name: m.name, sizes, colors };
  });

  // Build rows for the sheet: one row per model+color, columns = sizes
  // Header: Артикул | Модель | Колір | 42 | 44 | 46 | 48 | 50 | 52 | 54 | 56 | Всього
  const allSizes = ["42", "44", "46", "48", "50", "52", "54", "56"];
  const rows: Record<string, string | number>[] = [];

  for (const model of stockData) {
    if (model.colors.length === 0) continue;

    for (const color of model.colors) {
      const row: Record<string, string | number> = {
        sku: model.sku,
        model: model.name,
        color: color.colorName,
      };

      let total = 0;
      for (const sz of allSizes) {
        const qty = color.stockPerSize[sz] || 0;
        row[`size_${sz}`] = qty;
        if (model.sizes.includes(sz)) total += qty;
      }
      row.total = total;
      rows.push(row);
    }

    // Add subtotal row per model
    const subtotalRow: Record<string, string | number> = {
      sku: model.sku,
      model: model.name,
      color: "ВСЬОГО",
    };
    let modelTotal = 0;
    for (const sz of allSizes) {
      const szTotal = model.colors.reduce((sum, c) => sum + (c.stockPerSize[sz] || 0), 0);
      subtotalRow[`size_${sz}`] = szTotal || "";
      if (model.sizes.includes(sz)) modelTotal += szTotal;
    }
    subtotalRow.total = modelTotal;
    rows.push(subtotalRow);
  }

  try {
    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updateStock", rows }),
    });
    const text = await resp.text();
    console.log(`[Stock Sync] Response: ${resp.status} ${text.slice(0, 200)}`);
  } catch (err) {
    console.error("[Stock Sync] Failed:", err);
  }
}
