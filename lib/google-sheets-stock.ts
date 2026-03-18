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
 * Fetch all models with stock data and push to Google Sheets "Склад" tab
 * Format: matrix per model — sizes vertically, colors horizontally
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
    const sizeRows = (m.model_sizes ?? []) as Array<{ size_label: string; total_stock: number }>;
    const sizes = sizeRows
      .map((s) => s.size_label)
      .sort((a: string, b: string) => Number(a) - Number(b));

    const rawColors: ColorStock[] = (m.model_colors ?? []).map((c: Record<string, unknown>) => ({
      colorName: (c.name as string) || "",
      hex: (c.hex as string) || "",
      stockPerSize: (c.stock_per_size as Record<string, number>) ?? {},
    }));

    // Check if ANY color has non-empty stock_per_size
    const hasPerColorStock = rawColors.some((c) =>
      Object.values(c.stockPerSize).some((v) => v > 0)
    );

    let colors: ColorStock[];
    if (hasPerColorStock) {
      // Use per-color stock data as-is
      colors = rawColors;
    } else {
      // Fallback: use model_sizes total_stock as a single "Всего" column
      const totalPerSize: Record<string, number> = {};
      for (const sr of sizeRows) {
        totalPerSize[sr.size_label] = sr.total_stock ?? 0;
      }
      colors = [{ colorName: "Всего", hex: "", stockPerSize: totalPerSize }];
    }

    return { sku: m.sku, name: m.name, sizes, colors };
  });

  // Send models array with full structure for matrix rendering
  const payload = {
    action: "updateStock",
    models: stockData.map((m) => ({
      sku: m.sku,
      name: m.name,
      sizes: m.sizes,
      colors: m.colors.map((c) => ({
        colorName: c.colorName,
        stockPerSize: c.stockPerSize,
      })),
    })),
  };

  try {
    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await resp.text();
    console.log(`[Stock Sync] Response: ${resp.status} ${text.slice(0, 200)}`);
  } catch (err) {
    console.error("[Stock Sync] Failed:", err);
  }
}
