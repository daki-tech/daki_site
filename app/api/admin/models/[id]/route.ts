import { NextResponse } from "next/server";

import { requireApiAdmin } from "@/lib/server-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { inventoryMovementSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAdmin();
  if (auth.error || !auth.user) return auth.error;

  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;

  if (body.action === "update") {
    const admin = createAdminClient();
    const updatePayload: Record<string, unknown> = {};
    const fields = ["sku", "name", "category", "style", "season", "year", "base_price", "discount_percent", "wholesale_price", "min_wholesale_qty", "description", "image_urls", "fabric", "filling", "care_instructions", "is_active", "detail_images", "delivery_info", "return_info", "size_chart"];
    for (const key of fields) {
      if (key in body) updatePayload[key] = body[key];
    }

    const colorVariants = (body.color_variants ?? body.colors) as Array<{ name: string; hex: string; image_urls?: string[]; stock_per_size?: Record<string, number> }> | undefined;
    const sizes = body.sizes as Array<{ size_label: string; total_stock: number }> | undefined;

    // Run model update, color update, and size update in parallel for speed
    const [modelResult, colorsResult, sizesResult] = await Promise.all([
      // 1. Update model fields
      admin.from("catalog_models").update(updatePayload).eq("id", id).select("*, model_sizes(*), model_colors(*)").single(),
      // 2. Update colors (delete + insert)
      colorVariants && colorVariants.length > 0
        ? admin.from("model_colors").delete().eq("model_id", id).then(() => {
            const colorRows = colorVariants.map((c, i) => ({
              model_id: id, name: c.name || c.hex, hex: c.hex, image_urls: c.image_urls ?? [], is_default: i === 0, stock_per_size: c.stock_per_size ?? {},
            }));
            return admin.from("model_colors").insert(colorRows).select("*");
          })
        : Promise.resolve(null),
      // 3. Update sizes (delete + insert)
      sizes && sizes.length > 0
        ? admin.from("model_sizes").delete().eq("model_id", id).then(() => {
            const sizeRows = sizes.map((s) => ({
              model_id: id, size_label: s.size_label, total_stock: s.total_stock, sold_stock: 0, reserved_stock: 0,
            }));
            return admin.from("model_sizes").insert(sizeRows).select("*");
          })
        : Promise.resolve(null),
    ]);

    if (modelResult.error) return NextResponse.json({ error: modelResult.error.message }, { status: 500 });

    const data = modelResult.data;
    if (colorsResult?.data) data.model_colors = colorsResult.data;
    if (sizesResult?.data) data.model_sizes = sizesResult.data;

    return NextResponse.json(data);
  }

  if (body.action === "set_out_of_stock") {
    const isOutOfStock = Boolean(body.is_out_of_stock);
    const { data, error } = await auth.supabase
      .from("catalog_models")
      .update({ is_out_of_stock: isOutOfStock })
      .eq("id", id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (body.action === "inventory_movement") {
    const parsed = inventoryMovementSchema.safeParse({
      modelId: id,
      movementType: body.movementType,
      sizeLabel: body.sizeLabel,
      quantity: body.quantity,
      note: body.note,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { movementType, sizeLabel, quantity, note } = parsed.data;

    const { data: sizeRow, error: sizeError } = await auth.supabase
      .from("model_sizes")
      .select("*")
      .eq("model_id", id)
      .eq("size_label", sizeLabel)
      .single();

    if (sizeError || !sizeRow) {
      return NextResponse.json({ error: "Size row not found" }, { status: 404 });
    }

    let nextTotal = sizeRow.total_stock;
    let nextSold = sizeRow.sold_stock;

    if (movementType === "arrival") {
      nextTotal += quantity;
    } else if (movementType === "sale") {
      const available = Math.max(sizeRow.total_stock - sizeRow.sold_stock - sizeRow.reserved_stock, 0);
      if (available < quantity) {
        return NextResponse.json(
          { error: `Not enough stock. Available: ${available}` },
          { status: 400 },
        );
      }
      nextSold += quantity;
    } else {
      nextTotal += quantity;
    }

    const { error: updateSizeError } = await auth.supabase
      .from("model_sizes")
      .update({ total_stock: nextTotal, sold_stock: nextSold })
      .eq("id", sizeRow.id);

    if (updateSizeError) {
      return NextResponse.json({ error: updateSizeError.message }, { status: 500 });
    }

    await auth.supabase.from("stock_movements").insert({
      model_id: id,
      model_size_id: sizeRow.id,
      movement_type: movementType,
      quantity: movementType === "sale" ? -quantity : quantity,
      note: note ?? null,
      created_by: auth.user.id,
    });

    const { data: allSizes } = await auth.supabase
      .from("model_sizes")
      .select("total_stock, sold_stock, reserved_stock")
      .eq("model_id", id);

    const totalAvailable = (allSizes ?? []).reduce(
      (sum, row) => sum + Math.max(row.total_stock - row.sold_stock - row.reserved_stock, 0),
      0,
    );

    await auth.supabase
      .from("catalog_models")
      .update({ is_out_of_stock: totalAvailable <= 0 })
      .eq("id", id);

    const { data: model, error: modelError } = await auth.supabase
      .from("catalog_models")
      .select("*, model_sizes(*)")
      .eq("id", id)
      .single();

    if (modelError) {
      return NextResponse.json({ error: modelError.message }, { status: 500 });
    }

    return NextResponse.json(model);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAdmin();
  if (auth.error || !auth.user) return auth.error;

  const { id } = await params;

  // Delete sizes first, then the model
  await auth.supabase.from("model_sizes").delete().eq("model_id", id);
  const { error } = await auth.supabase.from("catalog_models").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
