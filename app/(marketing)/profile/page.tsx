"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import {
  ChevronLeft,
  Package,
  User,
  Phone,
  Mail,
  MapPin,
  Save,
  Loader2,
  Search,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { PhoneInput } from "@/components/ui/phone-input";
import { createClient } from "@/lib/supabase/client";
import type { Profile, WholesaleOrder } from "@/lib/types";

type Tab = "orders" | "profile";

const STATUS_LABELS: Record<string, string> = {
  draft: "Нове",
  confirmed: "Підтверджено",
  shipped: "Відправлено",
  completed: "Виконано",
  cancelled: "Скасовано",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-700",
  confirmed: "bg-blue-50 text-blue-700",
  shipped: "bg-amber-50 text-amber-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
};

export default function ProfilePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("orders");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryBranch, setDeliveryBranch] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Ensure profile exists and email is synced with auth
      try {
        await fetch("/api/ensure-profile", { method: "POST" });
      } catch {}

      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData) {
        // Always use auth user's email as the source of truth
        const profileWithEmail = { ...profileData, email: user.email ?? profileData.email };
        setProfile(profileWithEmail as Profile);
        setFullName(profileData.full_name || "");
        setPhone(profileData.phone || "");
        setDeliveryCity(profileData.delivery_city || "");
        setDeliveryBranch(profileData.delivery_branch || "");
        setNewsletter(profileData.newsletter_subscribed ?? false);
      }

      // Load orders via API (bypasses RLS recursion issue)
      try {
        const res = await fetch("/api/orders");
        if (res.ok) {
          const ordersData = await res.json();
          setOrders(ordersData as WholesaleOrder[]);
        }
      } catch (e) {
        console.error("Failed to load orders:", e);
      }

      setLoading(false);
    }

    load();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName || undefined,
          phone: phone || null,
          delivery_city: deliveryCity || null,
          delivery_branch: deliveryBranch || null,
          newsletter_subscribed: newsletter,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        toast.success("Дані збережено");
      } else {
        toast.error("Не вдалося зберегти");
      }
    } catch {
      toast.error("Помилка збереження");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] px-4 py-8 sm:py-12">
      {/* Page title */}
      <div className="mb-8">
        <h1 className="text-2xl font-light uppercase tracking-[0.15em] sm:text-3xl">
          Мій профіль
        </h1>
        {profile?.email && (
          <p className="mt-1 text-sm text-neutral-500">{profile.email}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-0 border-b border-neutral-200">
        <button
          onClick={() => setTab("orders")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium uppercase tracking-[0.08em] transition ${
            tab === "orders"
              ? "border-black text-black"
              : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          <Package className="h-4 w-4" />
          Мої замовлення
        </button>
        <button
          onClick={() => setTab("profile")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium uppercase tracking-[0.08em] transition ${
            tab === "profile"
              ? "border-black text-black"
              : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          <User className="h-4 w-4" />
          Мої дані
        </button>
      </div>

      {/* Tab content */}
      {tab === "orders" && <OrdersTab orders={orders} />}
      {tab === "profile" && (
        <ProfileTab
          profile={profile}
          fullName={fullName}
          setFullName={setFullName}
          phone={phone}
          setPhone={setPhone}
          deliveryCity={deliveryCity}
          setDeliveryCity={setDeliveryCity}
          deliveryBranch={deliveryBranch}
          setDeliveryBranch={setDeliveryBranch}
          newsletter={newsletter}
          setNewsletter={setNewsletter}
          saving={saving}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

/* ─── Orders Tab ─── */

function OrdersTab({ orders }: { orders: WholesaleOrder[] }) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <Package className="mb-4 h-12 w-12 text-neutral-200" />
        <p className="text-lg font-light text-neutral-400">
          У вас поки немає замовлень
        </p>
        <Link
          href="/catalog"
          className="mt-6 inline-block border border-black px-8 py-3 text-xs font-medium uppercase tracking-[0.2em] transition hover:bg-black hover:text-white"
        >
          Перейти до каталогу
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}

function OrderCard({ order }: { order: WholesaleOrder }) {
  const [expanded, setExpanded] = useState(false);
  const items = order.order_items ?? [];
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="border border-neutral-200 transition hover:border-neutral-300">
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-4">
          <div>
            <span className="text-sm font-medium">
              #{order.order_number || order.id.slice(0, 8)}
            </span>
            <span className="ml-3 text-xs text-neutral-400">
              {format(new Date(order.created_at), "d MMM yyyy", { locale: uk })}
            </span>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
              STATUS_COLORS[order.status] || "bg-neutral-100 text-neutral-600"
            }`}
          >
            {STATUS_LABELS[order.status] || order.status}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            {Math.round(order.total_amount)} UAH
          </span>
          <ChevronLeft
            className={`h-4 w-4 text-neutral-400 transition ${
              expanded ? "rotate-90" : "-rotate-90"
            }`}
          />
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-neutral-100 px-5 py-4">
          {/* Items */}
          {items.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-400">
                Товари
              </p>
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {item.catalog_models?.name || item.catalog_models?.sku || item.model_id}{" "}
                      <span className="text-neutral-400">
                        / {item.size_label} &times; {item.quantity}
                      </span>
                    </span>
                    <span className="text-neutral-600">
                      {Math.round(item.unit_price * item.quantity)} UAH
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary row */}
          <div className="flex flex-wrap gap-x-8 gap-y-2 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
            <span>Позицій: {totalQty} шт.</span>
            {order.payment_method && (
              <span>
                Оплата:{" "}
                {order.payment_method === "cod"
                  ? "Накладений платіж"
                  : "Оплата на сайті"}
              </span>
            )}
            {order.delivery_city && (
              <span>
                Доставка: {order.delivery_city}
                {order.delivery_branch ? `, ${order.delivery_branch}` : ""}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Profile Tab ─── */

function ProfileTab({
  profile,
  fullName,
  setFullName,
  phone,
  setPhone,
  deliveryCity,
  setDeliveryCity,
  deliveryBranch,
  setDeliveryBranch,
  newsletter,
  setNewsletter,
  saving,
  onSave,
}: {
  profile: Profile | null;
  fullName: string;
  setFullName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  deliveryCity: string;
  setDeliveryCity: (v: string) => void;
  deliveryBranch: string;
  setDeliveryBranch: (v: string) => void;
  newsletter: boolean;
  setNewsletter: (v: boolean) => void;
  saving: boolean;
  onSave: () => void;
}) {
  // NP city autocomplete
  const [cityQuery, setCityQuery] = useState(deliveryCity);
  const [cityOptions, setCityOptions] = useState<{ ref: string; name: string; region: string }[]>([]);
  const [showCityDD, setShowCityDD] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityRef, setCityRef] = useState("");
  const cityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // NP warehouse autocomplete
  const [whQuery, setWhQuery] = useState(deliveryBranch);
  const [whOptions, setWhOptions] = useState<{ ref: string; description: string }[]>([]);
  const [showWhDD, setShowWhDD] = useState(false);
  const [whLoading, setWhLoading] = useState(false);
  const whTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setCityQuery(deliveryCity); }, [deliveryCity]);
  useEffect(() => { setWhQuery(deliveryBranch); }, [deliveryBranch]);

  async function searchCities(q: string) {
    if (q.length < 2) { setCityOptions([]); return; }
    setCityLoading(true);
    try {
      const res = await fetch("/api/nova-poshta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "searchCities", searchQuery: q }),
      });
      const data = await res.json();
      setCityOptions(data.cities || []);
    } catch { setCityOptions([]); }
    finally { setCityLoading(false); }
  }

  async function searchWarehouses(ref: string, q: string) {
    if (!ref) { setWhOptions([]); return; }
    setWhLoading(true);
    try {
      const res = await fetch("/api/nova-poshta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "searchWarehouses", cityRef: ref, searchQuery: q }),
      });
      const data = await res.json();
      setWhOptions(data.warehouses || []);
    } catch { setWhOptions([]); }
    finally { setWhLoading(false); }
  }

  function handleCityInput(val: string) {
    setCityQuery(val);
    setShowCityDD(true);
    setDeliveryCity("");
    setCityRef("");
    setDeliveryBranch("");
    setWhQuery("");
    setWhOptions([]);
    if (cityTimer.current) clearTimeout(cityTimer.current);
    cityTimer.current = setTimeout(() => searchCities(val), 300);
  }

  function selectCity(c: { ref: string; name: string }) {
    setCityQuery(c.name);
    setDeliveryCity(c.name);
    setCityRef(c.ref);
    setShowCityDD(false);
    setDeliveryBranch("");
    setWhQuery("");
    searchWarehouses(c.ref, "");
  }

  function handleWhInput(val: string) {
    setWhQuery(val);
    setShowWhDD(true);
    setDeliveryBranch("");
    if (whTimer.current) clearTimeout(whTimer.current);
    whTimer.current = setTimeout(() => searchWarehouses(cityRef, val), 300);
  }

  function selectWh(w: { description: string }) {
    setWhQuery(w.description);
    setDeliveryBranch(w.description);
    setShowWhDD(false);
  }

  return (
    <div className="max-w-[480px] space-y-6">
      {/* Email (read-only) */}
      <div>
        <label className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-400">
          <Mail className="h-3.5 w-3.5" />
          Email
        </label>
        <input
          type="email"
          value={profile?.email || ""}
          disabled
          className="w-full border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500"
        />
      </div>

      {/* Full name */}
      <div>
        <label className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-400">
          <User className="h-3.5 w-3.5" />
          Повне ім&apos;я
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Ваше ім'я"
          className="w-full border border-neutral-200 px-4 py-3 text-sm transition focus:border-black focus:outline-none"
        />
      </div>

      {/* Phone */}
      <div>
        <label className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-400">
          <Phone className="h-3.5 w-3.5" />
          Телефон
        </label>
        <PhoneInput
          value={phone}
          onChange={(v) => setPhone(v)}
          className="w-full border border-neutral-200 text-sm focus-within:border-black focus-within:ring-0 focus-within:ring-offset-0"
        />
      </div>

      {/* City — NP autocomplete */}
      <div className="relative">
        <label className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-400">
          <MapPin className="h-3.5 w-3.5" />
          Місто доставки
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-300" />
          <input
            type="text"
            value={cityQuery}
            onChange={(e) => handleCityInput(e.target.value)}
            onFocus={() => cityOptions.length > 0 && setShowCityDD(true)}
            placeholder="Почніть вводити назву міста..."
            className="w-full border border-neutral-200 pl-9 pr-4 py-3 text-sm transition focus:border-black focus:outline-none"
          />
          {cityLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-neutral-300" />}
        </div>
        {showCityDD && cityOptions.length > 0 && (
          <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto border border-neutral-200 bg-white shadow-lg">
            {cityOptions.map((c) => (
              <button key={c.ref} type="button" onClick={() => selectCity(c)}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-50 transition">
                <span className="font-medium">{c.name}</span>
                {c.region && <span className="ml-2 text-xs text-neutral-400">{c.region}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Warehouse — NP autocomplete */}
      <div className="relative">
        <label className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-400">
          <Package className="h-3.5 w-3.5" />
          Відділення Нової Пошти
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-300" />
          <input
            type="text"
            value={whQuery}
            onChange={(e) => handleWhInput(e.target.value)}
            onFocus={() => whOptions.length > 0 && setShowWhDD(true)}
            disabled={!cityRef && !deliveryCity}
            placeholder={cityRef || deliveryCity ? "Номер або адреса відділення..." : "Спочатку оберіть місто"}
            className="w-full border border-neutral-200 pl-9 pr-4 py-3 text-sm transition focus:border-black focus:outline-none disabled:bg-neutral-50 disabled:text-neutral-400"
          />
          {whLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-neutral-300" />}
        </div>
        {showWhDD && whOptions.length > 0 && (
          <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto border border-neutral-200 bg-white shadow-lg">
            {whOptions.map((w) => (
              <button key={w.ref} type="button" onClick={() => selectWh(w)}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-50 transition">
                {w.description}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Newsletter subscription */}
      <label className="flex items-center gap-3 cursor-pointer py-2">
        <div
          className={`h-5 w-9 rounded-full p-0.5 transition-colors cursor-pointer ${newsletter ? "bg-black" : "bg-neutral-300"}`}
          onClick={() => setNewsletter(!newsletter)}
        >
          <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${newsletter ? "translate-x-4" : "translate-x-0"}`} />
        </div>
        <span className="text-sm text-neutral-600">
          Підписатися на розсилку новинок та спецпропозицій
        </span>
      </label>

      {/* Save button */}
      <button
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 border border-black bg-black px-8 py-3 text-xs font-medium uppercase tracking-[0.2em] text-white transition hover:bg-neutral-800 disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="h-3.5 w-3.5" />
        )}
        Зберегти
      </button>

    </div>
  );
}
