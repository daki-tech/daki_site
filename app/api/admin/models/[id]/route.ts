import { NextResponse } from "next/server";

import { requireApiAdmin } from "@/lib/server-auth";
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
    const updatePayload: Record<string, unknown> = {};
    const fields = ["sku", "name", "category", "style", "season", "year", "base_price", "discount_percent", "description", "image_urls", "fabric", "filling", "care_instructions", "is_active", "delivery_info", "return_info", "size_chart", "detail_images"];
    for (const key of fields) {
      if (key in body) updatePayload[key] = body[key];
    }

    const { data, error } = await auth.supabase
      .from("catalog_models")
      .update(updatePayload)
      .eq("id", id)
      .select("*, model_sizes(*), model_colors(*)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Update colors if provided
    const colors = body.colors as Array<{ name: string; hex: string }> | undefined;
    if (colors && colors.length > 0) {
      await auth.supabase.from("model_colors").delete().eq("model_id", id);
      const colorRows = colors.map((c, i) => ({
        model_id: id,
        name: c.name || c.hex,
        hex: c.hex,
        image_urls: [],
        is_default: i === 0,
      }));
      const { data: newColors } = await auth.supabase.from("model_colors").insert(colorRows).select("*");
      data.model_colors = newColors ?? [];
    }

    // Update sizes if provided
    const sizes = body.sizes as Array<{ size_label: string; total_stock: number }> | undefined;
    if (sizes && sizes.length > 0) {
      await auth.supabase.from("model_sizes").delete().eq("model_id", id);
      const sizeRows = sizes.map((s) => ({
        model_id: id,
        size_label: s.size_label,
        total_stock: s.total_stock,
        sold_stock: 0,
        reserved_stock: 0,
      }));
      const { data: newSizes } = await auth.supabase.from("model_sizes").insert(sizeRows).select("*");
      data.model_sizes = newSizes ?? [];
    }

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
