import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envPath = path.resolve(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) { console.error("Missing .env.local"); process.exit(1); }
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim(), v = t.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

const BUCKET = "media";

function storagePathFromUrl(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.slice(idx + marker.length));
}

async function getHomepageMediaPaths(): Promise<Set<string>> {
  const { data } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", ["hero_bg_url", "about_media_url"]);

  const paths = new Set<string>();
  for (const row of data ?? []) {
    if (row.value) {
      const p = storagePathFromUrl(row.value);
      if (p) {
        paths.add(p);
        console.log(`Keeping: ${p}`);
      }
    }
  }
  return paths;
}

async function collectAllFiles(folder: string, depth = 0): Promise<string[]> {
  if (depth > 10) return [];
  const { data: files, error } = await supabase.storage
    .from(BUCKET)
    .list(folder, { limit: 1000 });

  if (error || !files) return [];

  const result: string[] = [];
  const realFiles = files.filter((f) => f.metadata != null);
  const folders = files.filter((f) => f.metadata == null && f.name !== ".emptyFolderPlaceholder");

  for (const f of realFiles) {
    result.push(folder ? `${folder}/${f.name}` : f.name);
  }
  for (const sf of folders) {
    const subPath = folder ? `${folder}/${sf.name}` : sf.name;
    result.push(...await collectAllFiles(subPath, depth + 1));
  }
  return result;
}

async function main() {
  console.log("Collecting homepage media paths to keep...\n");
  const keepPaths = await getHomepageMediaPaths();

  console.log("\nCollecting all files in storage...\n");
  const allFiles = await collectAllFiles("");
  console.log(`Total files in storage: ${allFiles.length}`);

  const toDelete = allFiles.filter((p) => !keepPaths.has(p));
  console.log(`Files to delete: ${toDelete.length}`);
  console.log(`Files to keep: ${allFiles.length - toDelete.length}`);

  if (toDelete.length === 0) {
    console.log("\nNothing to delete!");
    return;
  }

  // Delete in batches of 100
  for (let i = 0; i < toDelete.length; i += 100) {
    const batch = toDelete.slice(i, i + 100);
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) console.error(`Batch delete error:`, error.message);
    else console.log(`Deleted batch ${Math.floor(i / 100) + 1}: ${batch.length} files`);
  }

  console.log(`\nDone! Deleted ${toDelete.length} files. Storage will free up shortly.`);
}

main().catch(console.error);
