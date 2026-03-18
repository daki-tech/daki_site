"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, CheckCircle, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { useCart } from "@/lib/cart-store";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { PhoneInput } from "@/components/ui/phone-input";
import { useCustomerType } from "@/hooks/use-customer-type";

interface CheckoutFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormData {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_region: string;
  delivery_city: string;
  delivery_city_ref: string;
  delivery_branch: string;
  payment_method: string;
  notes: string;
  contact_me: boolean;
}

interface CityOption {
  ref: string;
  name: string;
  region: string;
  area: string;
}

interface WarehouseOption {
  ref: string;
  description: string;
  shortAddress: string;
  number: string;
}

const PAYMENT_METHODS = [
  { value: "cash_on_delivery", label: "Накладений платіж (Нова Пошта)" },
  { value: "card", label: "Оплата на картку (передоплата)" },
  { value: "invoice", label: "Рахунок для юридичних осіб" },
];

export function CheckoutForm({ open, onClose, onSuccess }: CheckoutFormProps) {
  const { items, totalItems, totalAmount, clearCart } = useCart();
  const { customerType } = useCustomerType();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ orderNumber: number; orderId: string; contactMe: boolean } | null>(null);
  const [form, setForm] = useState<FormData>({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    delivery_region: "",
    delivery_city: "",
    delivery_city_ref: "",
    delivery_branch: "",
    payment_method: "",
    notes: "",
    contact_me: false,
  });

  // City search state
  const [cityQuery, setCityQuery] = useState("");
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);
  const cityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Warehouse search state
  const [warehouseQuery, setWarehouseQuery] = useState("");
  const [warehouseOptions, setWarehouseOptions] = useState<WarehouseOption[]>([]);
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
  const [warehouseLoading, setWarehouseLoading] = useState(false);
  const warehouseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-fill from user profile + last order data if available
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user && !cancelled) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, phone, delivery_city, delivery_branch")
            .eq("id", user.id)
            .single();

          // Get last order for pre-filling delivery info
          const { data: lastOrder } = await supabase
            .from("orders")
            .select("customer_name, customer_phone, customer_email, delivery_oblast, delivery_city, delivery_branch")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (!cancelled) {
            const name = lastOrder?.customer_name || profile?.full_name || "";
            const email = lastOrder?.customer_email || profile?.email || user.email || "";
            const phone = lastOrder?.customer_phone || profile?.phone || "";

            setForm((prev) => ({
              ...prev,
              customer_name: name || prev.customer_name,
              customer_email: email || prev.customer_email,
              customer_phone: phone || prev.customer_phone,
              delivery_region: lastOrder?.delivery_oblast || prev.delivery_region,
              delivery_city: lastOrder?.delivery_city || profile?.delivery_city || prev.delivery_city,
              delivery_branch: lastOrder?.delivery_branch || profile?.delivery_branch || prev.delivery_branch,
            }));

            // Set search field values if we have delivery info
            const prefillCity = lastOrder?.delivery_city || profile?.delivery_city;
            const prefillBranch = lastOrder?.delivery_branch || profile?.delivery_branch;
            if (prefillCity) {
              setCityQuery(prefillCity);
            }
            if (prefillBranch) {
              setWarehouseQuery(prefillBranch);
            }
          }
        }
      } catch {
        // Not logged in — try localStorage fallback
        try {
          const saved = localStorage.getItem("daki_checkout_data");
          if (saved && !cancelled) {
            const data = JSON.parse(saved);
            setForm((prev) => ({
              ...prev,
              customer_name: data.customer_name || prev.customer_name,
              customer_phone: data.customer_phone || prev.customer_phone,
              customer_email: data.customer_email || prev.customer_email,
              delivery_region: data.delivery_region || prev.delivery_region,
              delivery_city: data.delivery_city || prev.delivery_city,
              delivery_branch: data.delivery_branch || prev.delivery_branch,
            }));
            if (data.delivery_city) setCityQuery(data.delivery_city);
            if (data.delivery_branch) setWarehouseQuery(data.delivery_branch);
          }
        } catch {
          // ignore
        }
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  // Search cities with debounce
  const searchCities = useCallback(async (query: string) => {
    if (query.length < 2) {
      setCityOptions([]);
      return;
    }
    setCityLoading(true);
    try {
      const res = await fetch("/api/nova-poshta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "searchCities", searchQuery: query }),
      });
      const data = await res.json();
      setCityOptions(data.cities || []);
    } catch {
      setCityOptions([]);
    } finally {
      setCityLoading(false);
    }
  }, []);

  // Search warehouses with debounce
  const searchWarehouses = useCallback(async (cityRef: string, query: string) => {
    if (!cityRef) {
      setWarehouseOptions([]);
      return;
    }
    setWarehouseLoading(true);
    try {
      const res = await fetch("/api/nova-poshta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "searchWarehouses", cityRef, searchQuery: query }),
      });
      const data = await res.json();
      setWarehouseOptions(data.warehouses || []);
    } catch {
      setWarehouseOptions([]);
    } finally {
      setWarehouseLoading(false);
    }
  }, []);

  function handleCityInput(value: string) {
    setCityQuery(value);
    setShowCityDropdown(true);
    // Reset city selection
    setForm((prev) => ({ ...prev, delivery_city: "", delivery_city_ref: "", delivery_region: "", delivery_branch: "" }));
    setWarehouseQuery("");
    setWarehouseOptions([]);

    if (cityTimeoutRef.current) clearTimeout(cityTimeoutRef.current);
    cityTimeoutRef.current = setTimeout(() => searchCities(value), 300);
  }

  function selectCity(city: CityOption) {
    setCityQuery(city.name);
    setForm((prev) => ({
      ...prev,
      delivery_city: city.name,
      delivery_city_ref: city.ref,
      delivery_region: city.region || city.area || "",
      delivery_branch: "",
    }));
    setShowCityDropdown(false);
    // Load warehouses for selected city
    searchWarehouses(city.ref, "");
  }

  function handleWarehouseInput(value: string) {
    setWarehouseQuery(value);
    setShowWarehouseDropdown(true);
    setForm((prev) => ({ ...prev, delivery_branch: "" }));

    if (warehouseTimeoutRef.current) clearTimeout(warehouseTimeoutRef.current);
    warehouseTimeoutRef.current = setTimeout(() => searchWarehouses(form.delivery_city_ref, value), 300);
  }

  function selectWarehouse(wh: WarehouseOption) {
    setWarehouseQuery(wh.description);
    setForm((prev) => ({ ...prev, delivery_branch: wh.description }));
    setShowWarehouseDropdown(false);
  }

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name || !form.customer_phone || !form.customer_email) {
      toast.error("Заповніть обов'язкові поля: ПІБ, телефон, email");
      return;
    }
    // Validate color and size selection for all items
    const missingColorSize = items.some((item) => !item.color || item.sizes.length === 0);
    if (missingColorSize) {
      toast.error("Оберіть колір та розмір для кожного товару в кошику");
      return;
    }
    if (!form.delivery_city || !form.delivery_branch) {
      toast.error("Оберіть місто та відділення Нової Пошти");
      return;
    }
    if (!form.payment_method) {
      toast.error("Оберіть спосіб оплати");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            modelId: item.modelId,
            modelName: item.modelName,
            sku: item.sku,
            basePrice: item.basePrice,
            discountPercent: item.discountPercent,
            color: item.color,
            sizes: item.sizes,
          })),
          customerName: form.customer_name,
          customerPhone: form.customer_phone,
          customerEmail: form.customer_email,
          delivery: {
            oblast: form.delivery_region,
            city: form.delivery_city,
            branch: form.delivery_branch,
          },
          paymentMethod: form.payment_method === "cash_on_delivery" ? "cod" : form.payment_method === "card" ? "online" : form.payment_method,
          notes: form.notes,
          contactMe: form.contact_me,
          orderType: customerType,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Помилка оформлення" }));
        toast.error(data.error || "Помилка оформлення замовлення");
        return;
      }

      const data = await res.json();
      setSuccess({ orderNumber: data.orderNumber, orderId: data.orderId, contactMe: form.contact_me });
      onSuccess?.();

      // Save checkout data for next order pre-fill (guest users)
      try {
        localStorage.setItem("daki_checkout_data", JSON.stringify({
          customer_name: form.customer_name,
          customer_phone: form.customer_phone,
          customer_email: form.customer_email,
          delivery_region: form.delivery_region,
          delivery_city: form.delivery_city,
          delivery_branch: form.delivery_branch,
        }));
      } catch { /* ignore */ }

      clearCart();
    } catch {
      toast.error("Помилка з'єднання. Спробуйте ще раз.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  // Success screen
  if (success) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="relative mx-4 w-full max-w-md rounded-2xl bg-background p-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-center text-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h2 className="mt-4 text-xl font-medium">Замовлення оформлено!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Номер замовлення: <span className="font-bold text-foreground">#{success.orderNumber}</span>
            </p>
            {success.contactMe ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Менеджер зв&apos;яжеться з вами найближчим часом для уточнення замовлення.
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Ми зв&apos;яжемося з вами найближчим часом для підтвердження.
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Підтвердження надіслано на вашу пошту.
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-black py-3 text-xs font-medium uppercase tracking-[0.15em] text-white transition hover:bg-neutral-800"
            >
              Закрити
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="relative mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-medium uppercase tracking-wider">Оформлення замовлення</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {totalItems} од. на суму {formatCurrency(totalAmount)}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Прізвище та ім&apos;я *
            </label>
            <input
              type="text"
              required
              value={form.customer_name}
              onChange={(e) => handleChange("customer_name", e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-black"
              placeholder="Іванов Іван"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Телефон *
            </label>
            <PhoneInput
              required
              value={form.customer_phone}
              onChange={(v) => handleChange("customer_phone", v)}
              className="mt-1 w-full border border-neutral-200 text-sm focus-within:border-black focus-within:ring-0 focus-within:ring-offset-0"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Email *
            </label>
            <input
              type="email"
              required
              value={form.customer_email}
              onChange={(e) => handleChange("customer_email", e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-black"
              placeholder="email@example.com"
            />
          </div>

          {/* City — autocomplete */}
          <div className="relative">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Місто *
            </label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={cityQuery}
                onChange={(e) => handleCityInput(e.target.value)}
                onFocus={() => cityOptions.length > 0 && setShowCityDropdown(true)}
                className="w-full rounded-xl border border-neutral-200 pl-9 pr-4 py-3 text-sm outline-none transition focus:border-black"
                placeholder="Почніть вводити назву міста..."
              />
              {cityLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {showCityDropdown && cityOptions.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-background shadow-lg">
                {cityOptions.map((city) => (
                  <button
                    key={city.ref}
                    type="button"
                    onClick={() => selectCity(city)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition"
                  >
                    <span className="font-medium">{city.name}</span>
                    {city.region && (
                      <span className="ml-2 text-xs text-muted-foreground">{city.region}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Region — auto-filled */}
          {form.delivery_region && (
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Область
              </label>
              <input
                type="text"
                value={form.delivery_region}
                readOnly
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 outline-none"
              />
            </div>
          )}

          {/* Warehouse — autocomplete */}
          <div className="relative">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Відділення Нової Пошти *
            </label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={warehouseQuery}
                onChange={(e) => handleWarehouseInput(e.target.value)}
                onFocus={() => warehouseOptions.length > 0 && setShowWarehouseDropdown(true)}
                disabled={!form.delivery_city_ref}
                className="w-full rounded-xl border border-neutral-200 pl-9 pr-4 py-3 text-sm outline-none transition focus:border-black disabled:bg-neutral-50 disabled:text-neutral-400"
                placeholder={form.delivery_city_ref ? "Почніть вводити номер або адресу..." : "Спочатку оберіть місто"}
              />
              {warehouseLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {showWarehouseDropdown && warehouseOptions.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-background shadow-lg">
                {warehouseOptions.map((wh) => (
                  <button
                    key={wh.ref}
                    type="button"
                    onClick={() => selectWarehouse(wh)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition"
                  >
                    {wh.description}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Payment method */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Спосіб оплати *
            </label>
            <select
              required
              value={form.payment_method}
              onChange={(e) => handleChange("payment_method", e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-black"
            >
              <option value="" disabled>Оберіть спосіб оплати...</option>
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm.value} value={pm.value}>{pm.label}</option>
              ))}
            </select>
          </div>

          {/* Contact me checkbox */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="contact_me"
              checked={form.contact_me}
              onChange={(e) => handleChange("contact_me", e.target.checked)}
              className="h-4 w-4 accent-black"
            />
            <label htmlFor="contact_me" className="text-sm cursor-pointer">
              Зв&apos;яжіться зі мною для уточнення замовлення
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Коментар до замовлення
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-black resize-none"
              placeholder="Додаткові побажання..."
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3 text-xs font-medium uppercase tracking-[0.15em] text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Оформлюємо...
              </>
            ) : (
              "Підтвердити замовлення"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
