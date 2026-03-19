export type Locale = "ru" | "uk" | "en";
export type ThemeMode = "light" | "dark";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: "free" | "pro" | "enterprise";
  interface_language: Locale;
  theme: ThemeMode;
  is_admin: boolean;
  newsletter_subscribed: boolean;
  customer_type: "retail" | "wholesale";
  phone: string | null;
  company_name: string | null;
  delivery_city: string | null;
  delivery_branch: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModelColor {
  id: string;
  model_id: string;
  name: string;           // "Бургунді", "Білий", "Кемл"
  hex: string;            // "#4b4d40"
  image_urls: string[];   // photos for this color variant
  description_image?: string | null;  // "Опис.png" — photo for description section
  delivery_image?: string | null;     // "Правила доставки.png" — photo for delivery section
  is_default: boolean;
}

export interface CatalogModel {
  id: string;
  sku: string;
  name: string;
  category: string;
  style: string;
  season: string;
  year: number;
  description: string | null;
  base_price: number;
  wholesale_price: number;
  min_wholesale_qty: number;
  discount_percent: number;
  image_urls: string[];
  is_active: boolean;
  is_out_of_stock: boolean;
  fabric: string | null;
  filling: string | null;
  care_instructions: string | null;
  delivery_info: string | null;
  return_info: string | null;
  size_chart: string | null;
  detail_images: string[];
  created_at: string;
  updated_at: string;
  model_sizes?: ModelSize[];
  model_colors?: ModelColor[];
}

export interface ModelSize {
  id: string;
  model_id: string;
  size_label: string;
  total_stock: number;
  sold_stock: number;
  reserved_stock: number;
}

export interface WholesaleOrder {
  id: string;
  user_id: string;
  order_number: number | null;
  status: "draft" | "confirmed" | "shipped" | "completed" | "cancelled";
  total_amount: number;
  currency: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  delivery_oblast: string | null;
  delivery_city: string | null;
  delivery_branch: string | null;
  payment_method: string | null;
  created_at: string;
  notes: string | null;
  order_type: "retail" | "wholesale";
  source?: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  model_id: string;
  size_label: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  color?: string | null;
  catalog_models?: Pick<CatalogModel, "name" | "sku" | "image_urls">;
}

export interface DiscountRule {
  id: string;
  name: string;
  discount_percent: number;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
}

export interface InventoryMoveInput {
  modelId: string;
  sizeLabel: string;
  movementType: "arrival" | "sale" | "manual_adjustment";
  quantity: number;
  note?: string;
}

export interface DashboardStats {
  usersCount: number;
  modelsCount: number;
  activeDiscountsCount: number;
  ordersCount: number;
}

export interface SiteMedia {
  id: string;
  slot: string;
  url: string;
  alt: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
