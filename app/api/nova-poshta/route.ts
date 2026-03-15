import { NextResponse } from "next/server";

const NP_API_URL = "https://api.novaposhta.ua/v2.0/json/";
// Nova Poshta public API key for basic queries (cities, warehouses)
const NP_API_KEY = process.env.NOVA_POSHTA_API_KEY || "";

export async function POST(req: Request) {
  try {
    const { action, cityRef, searchQuery } = await req.json();

    if (action === "searchCities") {
      const result = await fetch(NP_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: NP_API_KEY,
          modelName: "Address",
          calledMethod: "searchSettlements",
          methodProperties: {
            CityName: searchQuery || "",
            Limit: "20",
            Page: "1",
          },
        }),
      });

      const data = await result.json();
      const cities = data?.data?.[0]?.Addresses?.map((c: Record<string, string>) => ({
        ref: c.DeliveryCity || c.Ref,
        name: c.Present || c.MainDescription,
        region: c.Region || "",
        area: c.Area || "",
      })) || [];

      return NextResponse.json({ cities });
    }

    if (action === "searchWarehouses") {
      if (!cityRef) {
        return NextResponse.json({ warehouses: [] });
      }

      const result = await fetch(NP_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: NP_API_KEY,
          modelName: "Address",
          calledMethod: "getWarehouses",
          methodProperties: {
            CityRef: cityRef,
            FindByString: searchQuery || "",
            Limit: "50",
            Page: "1",
          },
        }),
      });

      const data = await result.json();
      const warehouses = data?.data?.map((w: Record<string, string>) => ({
        ref: w.Ref,
        description: w.Description,
        shortAddress: w.ShortAddress,
        number: w.Number,
      })) || [];

      return NextResponse.json({ warehouses });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("Nova Poshta API error:", err);
    return NextResponse.json({ error: "API error" }, { status: 500 });
  }
}
