/**
 * Catalog Sync Script
 *
 * Reads the local catalog/ folder structure and syncs models to Supabase.
 *
 * Folder structure:
 *   catalog/{category}/{sku}/info          — model metadata (plain text)
 *   catalog/{category}/{sku}/{ColorName}/  — photos for that color
 *     1.JPG, 2.JPG, ...                   — product photos
 *     Опис.png                            — description section photo
 *     Правила доставки.png                — delivery section photo
 *
 * Info file format:
 *   Артикул: 1371
 *   Название: Куртка по пояс
 *   Цена: 4500
 *   Цвета:
 *       hex #f0ebf1 (Білий)
 *       hex #282628 (Чорний)
 *   розміри:
 *       42,44,46,48,50,52,54
 *   Опис:
 *       - фасон oversize
 *       - 100% плащівка
 *   Склад і догляд:
 *       Склад головної тканини: 100% спілка шкіра
 *       НЕ ПРАТИ
 *   Правила доставки:
 *       (delivery text...)
 *   Правила повернення:
 *       (return text...)
 *   Таблиця розмірів:
 *       Розмір  Обхват грудей  ...  В наявності
 *       42      75-84          ...  16 шт.
 *
 * Usage:
 *   npx tsx scripts/sync-catalog.ts
 *   npm run sync
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// ---- Config ----
const CATALOG_DIR = path.resolve(__dirname, "..", "style", "catalog");
const BUCKET = "media";

// ---- Load env ----
function loadEnv() {
  const envPath = path.resolve(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("Missing .env.local");
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---- Info file parser ----
interface ParsedInfo {
  sku: string;
  name: string;
  price: number;
  wholesalePrice: number;
  colors: { name: string; hex: string }[];
  sizes: string[];
  description: string[];
  fabric: string;
  care: string[];
  deliveryInfo: string;
  returnInfo: string;
  sizeChart: string;
  sizeStock: Record<string, number>; // size_label -> stock quantity from table
}

// Section headers that can appear at any indentation level
const SECTION_PATTERNS: [RegExp, string][] = [
  [/^Артикул:\s*/i, "sku"],
  [/^(Название|Назва):\s*/i, "name"],
  [/^(Цена|Ціна):\s*/i, "price"],
  [/^(Оптова ціна|Оптовая цена):\s*/i, "wholesale_price"],
  [/^(Цвета|Кольори|Цвіти)\s*:/i, "colors"],
  [/^(розміри|Размеры)\s*:/i, "sizes"],
  [/^(Опис|Описание)\s*:/i, "description"],
  [/^(Склад і догляд|Состав)\s*:/i, "care"],
  [/^Правила доставки\s*:/i, "delivery"],
  [/^Правила повернення\s*:?/i, "return"],
  [/^(Таблиця розмірів|Размерная сетка)\s*:?/i, "sizechart"],
];

function parseInfoFile(content: string): ParsedInfo {
  const lines = content.split("\n");
  const result: ParsedInfo = {
    sku: "",
    name: "",
    price: 0,
    wholesalePrice: 0,
    colors: [],
    sizes: [],
    description: [],
    fabric: "",
    care: [],
    deliveryInfo: "",
    returnInfo: "",
    sizeChart: "",
    sizeStock: {},
  };

  let section = "";

  for (const raw of lines) {
    const trimmed = raw.trim();

    // Check if this line is a section header
    let isHeader = false;
    for (const [pattern, sectionName] of SECTION_PATTERNS) {
      if (pattern.test(trimmed)) {
        // For inline headers (Артикул: 1371), extract value immediately
        if (sectionName === "sku") {
          result.sku = trimmed.replace(/^Артикул:\s*/i, "").trim();
        } else if (sectionName === "name") {
          result.name = trimmed.replace(/^(Название|Назва):\s*/i, "").trim();
        } else if (sectionName === "price") {
          result.price = parseInt(trimmed.replace(/^(Цена|Ціна):\s*/i, "").trim(), 10) || 0;
        } else if (sectionName === "wholesale_price") {
          result.wholesalePrice = parseInt(trimmed.replace(/^(Оптова ціна|Оптовая цена):\s*/i, "").trim(), 10) || 0;
        }
        section = sectionName;
        isHeader = true;
        break;
      }
    }
    if (isHeader) continue;

    // Skip empty lines (but preserve in multi-line text sections)
    if (!trimmed) {
      if (section === "delivery" && result.deliveryInfo) result.deliveryInfo += "\n";
      if (section === "return" && result.returnInfo) result.returnInfo += "\n";
      continue;
    }

    // Parse section content
    switch (section) {
      case "colors": {
        const match = trimmed.match(/hex\s+(#[0-9a-fA-F]{3,8})\s*\(([^)]+)\)/);
        if (match) {
          result.colors.push({ hex: match[1], name: match[2].trim() });
        }
        break;
      }
      case "sizes": {
        const parts = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
        result.sizes.push(...parts);
        break;
      }
      case "description": {
        result.description.push(trimmed.replace(/^-\s*/, ""));
        break;
      }
      case "care": {
        // Separate fabric lines from care instructions
        if (/тканин|шкіра|бавовна|поліестер|вовна|шовк|льон|нейлон|плащівка/i.test(trimmed) && !/^НЕ /i.test(trimmed)) {
          // It's a fabric/composition line
          if (!result.fabric) {
            result.fabric = trimmed;
          } else {
            result.fabric += "\n" + trimmed;
          }
        }
        result.care.push(trimmed);
        break;
      }
      case "delivery": {
        result.deliveryInfo += (result.deliveryInfo ? "\n" : "") + trimmed;
        break;
      }
      case "return": {
        result.returnInfo += (result.returnInfo ? "\n" : "") + trimmed;
        break;
      }
      case "sizechart": {
        result.sizeChart += (result.sizeChart ? "\n" : "") + trimmed;
        // Try to extract stock quantities from size chart rows
        // Format: "42    75-84    60-62    84-86    16 шт."
        const sizeMatch = trimmed.match(/^(\d{2,3})\s+.*?(\d+)\s*шт\.?\s*$/);
        if (sizeMatch) {
          result.sizeStock[sizeMatch[1]] = parseInt(sizeMatch[2], 10);
        }
        break;
      }
    }
  }

  return result;
}

// ---- Upload file to Supabase Storage ----
async function uploadFile(
  localPath: string,
  storagePath: string,
): Promise<string> {
  const fileBuffer = fs.readFileSync(localPath);
  const ext = path.extname(localPath).toLowerCase();
  const contentType =
    ext === ".png" ? "image/png" :
    ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
    ext === ".webp" ? "image/webp" :
    "application/octet-stream";

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error(`  Upload error for ${storagePath}:`, error.message);
    throw error;
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return urlData.publicUrl;
}

// ---- Get color directories for a model ----
function getColorDirs(modelDir: string): string[] {
  return fs
    .readdirSync(modelDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "." && d.name !== "..")
    .map((d) => d.name);
}

// ---- Main sync ----
async function syncCatalog() {
  console.log("Starting catalog sync...\n");

  if (!fs.existsSync(CATALOG_DIR)) {
    console.error(`Catalog directory not found: ${CATALOG_DIR}`);
    process.exit(1);
  }

  // Walk: catalog/{category}/{sku}/
  const categories = fs
    .readdirSync(CATALOG_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let totalModels = 0;

  for (const category of categories) {
    const categoryDir = path.join(CATALOG_DIR, category);
    const skuDirs = fs
      .readdirSync(categoryDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const skuDir of skuDirs) {
      const modelDir = path.join(categoryDir, skuDir);
      const infoPath = path.join(modelDir, "info");

      if (!fs.existsSync(infoPath)) {
        console.warn(`  Skipping ${category}/${skuDir} — no info file`);
        continue;
      }

      console.log(`Processing: ${category}/${skuDir}`);

      const infoContent = fs.readFileSync(infoPath, "utf-8");
      const info = parseInfoFile(infoContent);

      console.log(`  Parsed: "${info.name}", ${info.price} UAH, ${info.colors.length} colors, ${info.sizes.length} sizes`);
      if (Object.keys(info.sizeStock).length > 0) {
        console.log(`  Stock from size chart:`, info.sizeStock);
      }

      const sku = info.sku || skuDir;

      // Get actual color directories on disk
      const colorDirNames = getColorDirs(modelDir);
      console.log(`  Colors on disk: ${colorDirNames.join(", ") || "none"}`);

      // Upload first image of first color as the main model image
      let mainImageUrls: string[] = [];
      if (colorDirNames.length > 0) {
        const firstColorDir = path.join(modelDir, colorDirNames[0]);
        const jpgs = fs
          .readdirSync(firstColorDir)
          .filter((f) => /^\d+\.(jpg|jpeg|png|webp)$/i.test(f))
          .sort((a, b) => parseInt(a) - parseInt(b));

        if (jpgs.length > 0) {
          const url = await uploadFile(
            path.join(firstColorDir, jpgs[0]),
            toStoragePath("catalog", sku, colorDirNames[0], jpgs[0]),
          );
          mainImageUrls = [url];
          console.log(`  Main image: ${jpgs[0]}`);
        }
      }

      // Build description text
      const descriptionText = info.description.length > 0
        ? info.description.map((d) => `- ${d}`).join("\n")
        : null;

      // Care: only the НЕ lines
      const careOnlyLines = info.care.filter((l) => /^НЕ /i.test(l.trim()));
      const careText = careOnlyLines.length > 0 ? careOnlyLines.join("\n") : null;

      // Upsert the catalog model
      const { data: existingModel } = await supabase
        .from("catalog_models")
        .select("id")
        .eq("sku", sku)
        .maybeSingle();

      let modelId: string;

      const modelData = {
        sku,
        name: info.name || skuDir,
        category: mapCategory(category),
        style: "Класичний",
        season: "Весна-Осінь",
        year: new Date().getFullYear(),
        description: descriptionText,
        base_price: info.price || 0,
        wholesale_price: info.wholesalePrice || 0,
        discount_percent: 0,
        image_urls: mainImageUrls,
        detail_images: [],
        is_active: true,
        is_out_of_stock: false,
        fabric: info.fabric || null,
        filling: null,
        care_instructions: careText,
        delivery_info: info.deliveryInfo || null,
        return_info: info.returnInfo || null,
        size_chart: info.sizeChart || null,
      };

      if (existingModel) {
        modelId = existingModel.id;
        const { error } = await supabase
          .from("catalog_models")
          .update(modelData)
          .eq("id", modelId);
        if (error) {
          console.error(`  Error updating model ${sku}:`, error.message);
          continue;
        }
        console.log(`  Updated model: ${sku} (${modelId})`);

        // Delete old sizes and colors for re-creation
        await supabase.from("model_sizes").delete().eq("model_id", modelId);
        await supabase.from("model_colors").delete().eq("model_id", modelId);
      } else {
        const { data: newModel, error } = await supabase
          .from("catalog_models")
          .insert(modelData)
          .select("id")
          .single();
        if (error || !newModel) {
          console.error(`  Error creating model ${sku}:`, error?.message);
          continue;
        }
        modelId = newModel.id;
        console.log(`  Created model: ${sku} (${modelId})`);
      }

      // Create sizes with stock from size chart (or default 100)
      if (info.sizes.length > 0) {
        const sizeRows = info.sizes.map((s) => ({
          model_id: modelId,
          size_label: s,
          total_stock: info.sizeStock[s] || 100,
          sold_stock: 0,
          reserved_stock: 0,
        }));
        const { error: sizeError } = await supabase.from("model_sizes").insert(sizeRows);
        if (sizeError) {
          console.error(`  Error creating sizes:`, sizeError.message);
        } else {
          console.log(`  Sizes: ${info.sizes.map((s) => `${s}(${info.sizeStock[s] || 100})`).join(", ")}`);
        }
      }

      // Process each color directory
      for (let i = 0; i < colorDirNames.length; i++) {
        const colorName = colorDirNames[i];
        const colorDir = path.join(modelDir, colorName);

        // Find matching hex from info file
        const infoColor = info.colors.find((c) => c.name === colorName);
        const hex = infoColor?.hex || generateDefaultHex(i);

        // Upload numbered JPGs
        const jpgs = fs
          .readdirSync(colorDir)
          .filter((f) => /^\d+\.(jpg|jpeg|png|webp)$/i.test(f))
          .sort((a, b) => parseInt(a) - parseInt(b));

        const imageUrls: string[] = [];
        for (const jpg of jpgs) {
          const url = await uploadFile(
            path.join(colorDir, jpg),
            toStoragePath("catalog", sku, colorName, jpg),
          );
          imageUrls.push(url);
        }
        console.log(`  Color "${colorName}": ${jpgs.length} photos uploaded`);

        // Upload description image if exists
        let descriptionImage: string | null = null;
        const opisPath = path.join(colorDir, "Опис.png");
        if (fs.existsSync(opisPath)) {
          descriptionImage = await uploadFile(
            opisPath,
            toStoragePath("catalog", sku, colorName, "Opys.png"),
          );
          console.log(`  Color "${colorName}": Опис.png uploaded`);
        }

        // Upload delivery image if exists
        let deliveryImage: string | null = null;
        const deliveryPath = path.join(colorDir, "Правила доставки.png");
        if (fs.existsSync(deliveryPath)) {
          deliveryImage = await uploadFile(
            deliveryPath,
            toStoragePath("catalog", sku, colorName, "Pravyla_dostavky.png"),
          );
          console.log(`  Color "${colorName}": Правила доставки.png uploaded`);
        }

        // Insert model_color row
        const { error: colorError } = await supabase.from("model_colors").insert({
          model_id: modelId,
          name: colorName,
          hex,
          image_urls: imageUrls,
          description_image: descriptionImage,
          delivery_image: deliveryImage,
          is_default: i === 0,
        });

        if (colorError) {
          console.error(`  Error creating color ${colorName}:`, colorError.message);
        }
      }

      totalModels++;
      console.log();
    }
  }

  console.log(`\nSync complete. ${totalModels} model(s) processed.`);
}

// ---- Transliterate Cyrillic to Latin for storage paths ----
function transliterate(text: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ye",
    ж: "zh", з: "z", и: "y", і: "i", ї: "yi", й: "y", к: "k", л: "l",
    м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
    ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ь: "",
    ю: "yu", я: "ya", "'": "", "ʼ": "",
    А: "A", Б: "B", В: "V", Г: "H", Ґ: "G", Д: "D", Е: "E", Є: "Ye",
    Ж: "Zh", З: "Z", И: "Y", І: "I", Ї: "Yi", Й: "Y", К: "K", Л: "L",
    М: "M", Н: "N", О: "O", П: "P", Р: "R", С: "S", Т: "T", У: "U",
    Ф: "F", Х: "Kh", Ц: "Ts", Ч: "Ch", Ш: "Sh", Щ: "Shch", Ь: "",
    Ю: "Yu", Я: "Ya",
    " ": "_",
  };
  return text
    .split("")
    .map((ch) => (ch in map ? map[ch] : ch))
    .join("");
}

function toStoragePath(...parts: string[]): string {
  return parts.map((p) => transliterate(p)).join("/");
}

// ---- Helpers ----
function mapCategory(folderName: string): string {
  const map: Record<string, string> = {
    puhovik: "Пуховик",
    palto: "Пальто",
    kurtka: "Куртка",
    trench: "Тренч",
    zhilet: "Жилет",
    shuba: "Шуба",
  };
  return map[folderName.toLowerCase()] || folderName;
}

function generateDefaultHex(index: number): string {
  const defaults = ["#f5f5f0", "#1a1a1a", "#4a3728", "#8b1a3a", "#d4c5a9", "#2d4a3e"];
  return defaults[index % defaults.length];
}

// ---- Run ----
syncCatalog().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
