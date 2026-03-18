import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Receives stock updates from Google Sheets onEdit trigger.
 * Updates model_colors.stock_per_size in Supabase.
 * Body: { secret, sku, color, size, quantity }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { secret, sku, color, size, quantity } = body;

    // Validate secret
    const expectedSecret = process.env.STOCK_SYNC_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!sku || !color || !size || quantity === undefined) {
      return NextResponse.json({ error: "Missing required fields: sku, color, size, quantity" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Find the model by SKU
    const { data: model, error: modelError } = await admin
      .from("catalog_models")
      .select("id")
      .eq("sku", sku)
      .single();

    if (modelError || !model) {
      return NextResponse.json({ error: `Model not found: ${sku}` }, { status: 404 });
    }

    // Find the color for this model
    const { data: colorRow, error: colorError } = await admin
      .from("model_colors")
      .select("id, stock_per_size")
      .eq("model_id", model.id)
      .eq("name", color)
      .single();

    if (colorError || !colorRow) {
      return NextResponse.json({ error: `Color not found: ${color} for model ${sku}` }, { status: 404 });
    }

    // Update stock_per_size for this color
    const currentStock = (colorRow.stock_per_size as Record<string, number>) || {};
    const updatedStock = { ...currentStock, [size]: Number(quantity) || 0 };

    const { error: updateError } = await admin
      .from("model_colors")
      .update({ stock_per_size: updatedStock })
      .eq("id", colorRow.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Also update model_sizes.total_stock for this size (sum across all colors)
    const { data: allColors } = await admin
      .from("model_colors")
      .select("stock_per_size")
      .eq("model_id", model.id);

    if (allColors) {
      let totalForSize = 0;
      for (const c of allColors) {
        const sps = (c.stock_per_size as Record<string, number>) || {};
        totalForSize += sps[size] || 0;
      }

      // Update or create model_sizes row
      const { data: existingSize } = await admin
        .from("model_sizes")
        .select("id")
        .eq("model_id", model.id)
        .eq("size_label", size)
        .single();

      if (existingSize) {
        await admin
          .from("model_sizes")
          .update({ total_stock: totalForSize })
          .eq("id", existingSize.id);
      }
    }

    console.log(`[Stock Update] ${sku} / ${color} / ${size} = ${quantity}`);
    return NextResponse.json({ ok: true, sku, color, size, quantity });
  } catch (err) {
    console.error("[Stock Update] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
