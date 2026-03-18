import { NextResponse, after } from "next/server";

import { mockModels } from "@/lib/mock-data";
import { requireApiAdmin } from "@/lib/server-auth";
import { modelSchema } from "@/lib/validations";
import { syncStockToGoogleSheets } from "@/lib/google-sheets-stock";

export async function GET() {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  const { data, error } = await auth.supabase
    .from("catalog_models")
    .select("*, model_sizes(*), model_colors(*)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json(mockModels);

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const parsed = modelSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Extract sizes separately (they go into model_sizes table)
  const { sizes, ...modelData } = parsed.data;
  const colorVariants = (body.color_variants ?? body.colors ?? []) as Array<{ name: string; hex: string; image_urls?: string[]; stock_per_size?: Record<string, number> }>;

  const { data: model, error: modelError } = await auth.supabase
    .from("catalog_models")
    .insert({
      ...modelData,
      is_active: true,
    })
    .select("*")
    .single();

  if (modelError) {
    return NextResponse.json({ error: modelError.message }, { status: 500 });
  }

  const sizeRows = sizes.map((size) => ({
    model_id: model.id,
    size_label: size.size_label,
    total_stock: size.total_stock,
    sold_stock: 0,
    reserved_stock: 0,
  }));

  const { data: createdSizes, error: sizeError } = await auth.supabase
    .from("model_sizes")
    .insert(sizeRows)
    .select("*");

  if (sizeError) {
    return NextResponse.json({ error: sizeError.message }, { status: 500 });
  }

  // Insert color variants with per-color image_urls
  let createdColors: unknown[] = [];
  if (colorVariants.length > 0) {
    const colorRows = colorVariants.map((c, i) => ({
      model_id: model.id,
      name: c.name || c.hex,
      hex: c.hex,
      image_urls: c.image_urls ?? [],
      is_default: i === 0,
      stock_per_size: c.stock_per_size ?? {},
    }));
    const { data: colorData } = await auth.supabase
      .from("model_colors")
      .insert(colorRows)
      .select("*");
    createdColors = colorData ?? [];
  }

  after(() => syncStockToGoogleSheets());

  return NextResponse.json({ ...model, model_sizes: createdSizes ?? [], model_colors: createdColors });
}
