import { z } from "zod";


export const profileSchema = z.object({
  full_name: z.string().min(2).max(120).optional(),
  phone: z.string().max(20).nullable().optional(),
  company_name: z.string().max(200).nullable().optional(),
  delivery_city: z.string().max(200).nullable().optional(),
  delivery_branch: z.string().max(300).nullable().optional(),
  interface_language: z.enum(["ru", "uk", "en"]).optional(),
  theme: z.enum(["light", "dark"]).optional(),
  newsletter_subscribed: z.boolean().optional(),
});

export const modelSchema = z.object({
  sku: z.string().min(2).max(64),
  name: z.string().min(2).max(160),
  category: z.string().min(2).max(100),
  style: z.string().max(100).optional().default(""),
  season: z.string().max(100).optional().default(""),
  year: z.number().int().min(2000).max(2100).optional().default(new Date().getFullYear()),
  description: z.string().max(2000).nullable().optional(),
  base_price: z.number().positive(),
  discount_percent: z.number().min(0).max(100),
  image_urls: z.array(z.string().min(1)).default([]),
  is_out_of_stock: z.boolean().optional(),
  fabric: z.string().max(500).nullable().optional(),
  filling: z.string().max(500).nullable().optional(),
  care_instructions: z.string().max(1000).nullable().optional(),
  delivery_info: z.string().max(2000).nullable().optional(),
  return_info: z.string().max(2000).nullable().optional(),
  detail_images: z.array(z.string()).default([]),
  size_chart: z.string().max(5000).nullable().optional(),
  sizes: z
    .array(
      z.object({
        size_label: z.string().min(1).max(20),
        total_stock: z.number().int().min(0),
      }),
    )
    .default([]),
});

export const inventoryMovementSchema = z.object({
  modelId: z.string().uuid(),
  sizeLabel: z.string().min(1).max(20),
  movementType: z.enum(["arrival", "sale", "manual_adjustment"]),
  quantity: z.number().int().positive(),
  note: z.string().max(500).optional(),
});

export const discountSchema = z.object({
  name: z.string().min(2).max(100),
  discount_percent: z.number().min(0).max(100),
  is_active: z.boolean().default(true),
  start_at: z.string().datetime().nullable().optional(),
  end_at: z.string().datetime().nullable().optional(),
});

export const adminSettingsSchema = z.object({
  key: z.string().min(2).max(100),
  value: z.any(),
});

export const broadcastSchema = z.object({
  subject: z.string().min(3).max(150),
  body: z.string().min(10).max(5000),
  audience: z.enum(["all", "newsletter", "pro", "enterprise"]),
});

export const catalogFilterSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  style: z.string().optional(),
  season: z.string().optional(),
  year: z.coerce.number().int().optional(),
  minDiscount: z.coerce.number().int().min(0).max(100).optional(),
  onlyAvailable: z.coerce.boolean().optional(),
});
