/**
 * One-time script to fix missing 561 Шоколад stock for model 1368.
 * The cancel-order timeout caused sizes 50, 52, 54 to not get their stock returned (187 each).
 *
 * Run: npx tsx scripts/fix-stock-1368.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Manual .env.local parsing (no dotenv dependency)
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx > 0) process.env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey);

async function fixStock() {
  // 1. Find model 1368
  const { data: model } = await admin
    .from("catalog_models")
    .select("id, sku, name")
    .eq("sku", "1368")
    .single();

  if (!model) {
    console.error("Model 1368 not found");
    process.exit(1);
  }
  console.log(`Found model: ${model.sku} ${model.name} (${model.id})`);

  // 2. Fix model_colors stock_per_size for Шоколад
  const { data: colorRow } = await admin
    .from("model_colors")
    .select("id, name, stock_per_size")
    .eq("model_id", model.id)
    .eq("name", "Шоколад")
    .single();

  if (!colorRow) {
    console.error("Color Шоколад not found for model 1368");
    process.exit(1);
  }

  const stockPerSize = (colorRow.stock_per_size as Record<string, number>) || {};
  console.log("Current stock_per_size:", stockPerSize);

  const sizesToFix = ["50", "52", "54"];
  for (const size of sizesToFix) {
    const current = stockPerSize[size] || 0;
    stockPerSize[size] = current + 187;
    console.log(`  ${size}: ${current} → ${stockPerSize[size]}`);
  }

  await admin.from("model_colors").update({ stock_per_size: stockPerSize }).eq("id", colorRow.id);
  console.log("Updated model_colors stock_per_size ✓");

  // 3. Fix model_sizes total_stock for sizes 50, 52, 54
  const { data: sizeRows } = await admin
    .from("model_sizes")
    .select("id, size_label, total_stock")
    .eq("model_id", model.id)
    .in("size_label", sizesToFix);

  if (sizeRows) {
    for (const row of sizeRows) {
      const newStock = row.total_stock + 187;
      console.log(`  model_sizes ${row.size_label}: ${row.total_stock} → ${newStock}`);
      await admin.from("model_sizes").update({ total_stock: newStock }).eq("id", row.id);
    }
  }
  console.log("Updated model_sizes ✓");

  console.log("\nDone! 561 Шоколад stock restored.");
}

fixStock().catch(console.error);
