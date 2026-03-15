import { NextResponse } from "next/server";

import { getCatalogModels } from "@/lib/data";
import { catalogFilterSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = catalogFilterSchema.safeParse({
    query: searchParams.get("query") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    style: searchParams.get("style") ?? undefined,
    season: searchParams.get("season") ?? undefined,
    year: searchParams.get("year") ?? undefined,
    minDiscount: searchParams.get("minDiscount") ?? undefined,
    onlyAvailable: searchParams.get("onlyAvailable") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const models = await getCatalogModels(parsed.data);
  return NextResponse.json(models);
}
