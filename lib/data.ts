import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CatalogModel, DashboardStats, DiscountRule, Profile, WholesaleOrder } from "@/lib/types";
import { mockDiscounts, mockModels, mockOrders } from "@/lib/mock-data";

function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

interface CatalogFilterInput {
  query?: string;
  category?: string;
  style?: string;
  season?: string;
  year?: number;
  minDiscount?: number;
  onlyAvailable?: boolean;
}

export async function getCatalogModels(filters: CatalogFilterInput = {}): Promise<CatalogModel[]> {
  if (!hasSupabaseEnv()) {
    return filterMockModels(filters);
  }

  try {
    const supabase = createPublicClient();

    let query = supabase
      .from("catalog_models")
      .select("id, name, sku, category, style, season, year, base_price, discount_percent, image_urls, is_active, is_out_of_stock, created_at, model_sizes(id, size_label, total_stock, sold_stock, reserved_stock), model_colors(id, name, hex, image_urls, is_default, stock_per_size)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (filters.category) query = query.eq("category", filters.category);
    if (filters.style) query = query.eq("style", filters.style);
    if (filters.season) query = query.eq("season", filters.season);
    if (filters.year) query = query.eq("year", filters.year);
    if (filters.minDiscount) query = query.gte("discount_percent", filters.minDiscount);
    if (filters.onlyAvailable) query = query.eq("is_out_of_stock", false);
    if (filters.query) query = query.or(`name.ilike.%${filters.query}%,sku.ilike.%${filters.query}%`);

    const { data, error } = await query;
    if (error) throw error;

    // Fall back to mock data if DB is empty (no models added yet)
    if (!data || data.length === 0) return filterMockModels(filters);

    return data as CatalogModel[];
  } catch {
    return filterMockModels(filters);
  }
}

function filterMockModels(filters: CatalogFilterInput): CatalogModel[] {
  return mockModels.filter((model) => {
    if (filters.category && model.category !== filters.category) return false;
    if (filters.style && model.style !== filters.style) return false;
    if (filters.season && model.season !== filters.season) return false;
    if (filters.year && model.year !== filters.year) return false;
    if (filters.minDiscount && model.discount_percent < filters.minDiscount) return false;
    if (filters.onlyAvailable && model.is_out_of_stock) return false;
    if (filters.query) {
      const query = filters.query.toLowerCase();
      const haystack = `${model.name} ${model.sku}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export async function getCatalogModelById(id: string): Promise<CatalogModel | null> {
  if (!hasSupabaseEnv()) {
    return mockModels.find((m) => m.id === id) ?? null;
  }

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("catalog_models")
      .select("*, model_sizes(*), model_colors(*)")
      .eq("id", id)
      .single();

    if (error || !data) throw new Error("not found");
    return data as CatalogModel;
  } catch {
    return mockModels.find((m) => m.id === id) ?? null;
  }
}

export async function getCatalogModelsByIds(ids: string[]): Promise<CatalogModel[]> {
  if (ids.length === 0) return [];

  if (!hasSupabaseEnv()) {
    return mockModels.filter((m) => ids.includes(m.id));
  }

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("catalog_models")
      .select("*, model_sizes(*), model_colors(*)")
      .in("id", ids);

    if (error) throw error;
    if (!data || data.length === 0) return mockModels.filter((m) => ids.includes(m.id));
    return data as CatalogModel[];
  } catch {
    return mockModels.filter((m) => ids.includes(m.id));
  }
}

export async function getUserOrders(userId: string): Promise<WholesaleOrder[]> {
  if (!hasSupabaseEnv()) {
    return mockOrders;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*, catalog_models(name, sku, image_urls))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as WholesaleOrder[];
  } catch {
    return mockOrders;
  }
}

export async function getDiscounts(): Promise<DiscountRule[]> {
  if (!hasSupabaseEnv()) {
    return mockDiscounts;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("discounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as DiscountRule[];
  } catch {
    return mockDiscounts;
  }
}

export async function getAdminStats(): Promise<DashboardStats> {
  if (!hasSupabaseEnv()) {
    return {
      usersCount: 29,
      modelsCount: mockModels.length,
      activeDiscountsCount: mockDiscounts.length,
      ordersCount: mockOrders.length,
    };
  }

  try {
    const supabase = await createClient();

    const [profiles, models, discounts, orders] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("catalog_models").select("id", { count: "exact", head: true }),
      supabase.from("discounts").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("orders").select("id", { count: "exact", head: true }),
    ]);

    return {
      usersCount: profiles.count ?? 0,
      modelsCount: models.count ?? 0,
      activeDiscountsCount: discounts.count ?? 0,
      ordersCount: orders.count ?? 0,
    };
  } catch {
    return {
      usersCount: 0,
      modelsCount: 0,
      activeDiscountsCount: 0,
      ordersCount: 0,
    };
  }
}

export async function getRelatedModels(modelId: string): Promise<CatalogModel[]> {
  if (!hasSupabaseEnv()) {
    return mockModels.filter((m) => m.id !== modelId);
  }

  try {
    const supabase = createPublicClient();
    const { data: current } = await supabase
      .from("catalog_models")
      .select("category")
      .eq("id", modelId)
      .single();

    if (!current) return [];

    const { data, error } = await supabase
      .from("catalog_models")
      .select("id, name, sku, base_price, discount_percent, image_urls, is_out_of_stock, category, model_sizes(size_label, total_stock, sold_stock, reserved_stock), model_colors(name, hex, image_urls)")
      .eq("is_active", true)
      .eq("category", current.category)
      .neq("id", modelId)
      .limit(8);

    if (error) throw error;
    return (data ?? []) as CatalogModel[];
  } catch {
    return mockModels.filter((m) => m.id !== modelId);
  }
}

export async function getHomepageSettings(): Promise<Record<string, string>> {
  if (!hasSupabaseEnv()) return {};
  try {
    const supabase = createAdminClient();
    const { data } = await supabase.from("admin_settings").select("key, value").order("key");
    const map: Record<string, string> = {};
    for (const row of data ?? []) map[row.key] = row.value;
    return map;
  } catch {
    return {};
  }
}

export async function getAdminOrders(): Promise<WholesaleOrder[]> {
  if (!hasSupabaseEnv()) return mockOrders;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*, catalog_models(name, sku, image_urls))")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as WholesaleOrder[];
  } catch {
    return mockOrders;
  }
}

export async function getAdminUsers(): Promise<Profile[]> {
  if (!hasSupabaseEnv()) return [];

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as Profile[];
  } catch {
    return [];
  }
}

export async function getAdminModels(): Promise<CatalogModel[]> {
  if (!hasSupabaseEnv()) return mockModels;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("catalog_models")
      .select("*, model_sizes(*), model_colors(*)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fall back to mock data if DB is empty
    if (!data || data.length === 0) return mockModels;

    return data as CatalogModel[];
  } catch {
    return mockModels;
  }
}
