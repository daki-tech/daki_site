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

async function listAndDelete(bucket: string, folder: string, depth = 0): Promise<number> {
  if (depth > 10) return 0; // safety limit

  const { data: files, error } = await supabase.storage
    .from(bucket)
    .list(folder, { limit: 1000 });

  if (error) { console.error(`Error listing ${folder}:`, error.message); return 0; }
  if (!files || files.length === 0) return 0;

  let total = 0;

  // Files have a non-null id and metadata
  const realFiles = files.filter((f) => f.metadata != null);
  const folders = files.filter((f) => f.metadata == null && f.name !== ".emptyFolderPlaceholder");

  if (realFiles.length > 0) {
    const paths = realFiles.map((f) => folder ? `${folder}/${f.name}` : f.name);
    const { error: delErr } = await supabase.storage.from(bucket).remove(paths);
    if (delErr) console.error(`Delete error in ${folder}:`, delErr.message);
    else {
      total += paths.length;
      console.log(`Deleted ${paths.length} files from ${folder || "root"}`);
    }
  }

  for (const sf of folders) {
    const subPath = folder ? `${folder}/${sf.name}` : sf.name;
    total += await listAndDelete(bucket, subPath, depth + 1);
  }

  return total;
}

async function main() {
  console.log("Cleaning up Supabase Storage (media bucket)...\n");
  const total = await listAndDelete("media", "");
  console.log(`\nTotal deleted: ${total} files`);
  console.log("Done!");
}

main().catch(console.error);
