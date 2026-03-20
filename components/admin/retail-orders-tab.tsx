"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import { Loader2, Plus, X, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { CatalogModel } from "@/lib/types";

const S = {
  input: "rounded-xl border-gray-200 bg-gray-50/60 focus:bg-white transition-colors text-sm",
  select: "rounded-xl border-gray-200 bg-gray-50/60",
  label: "text-[11px] font-semibold text-gray-400 uppercase tracking-wider",
};

interface RetailOrdersTabProps {
  models: CatalogModel[];
}

interface OrderSource {
  id: string;
  name: string;
}

interface Order {
  id: string;
  order_number: number;
  status: string;
  total_amount: number;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  delivery_city: string;
  delivery_oblast: string | null;
  delivery_branch: string | null;
  payment_method: string | null;
  notes: string | null;
  order_type: "retail" | "wholesale";
  source: string;
  created_at: string;
  order_items: {
    id: string;
    model_id: string;
    size_label: string;
    quantity: number;
    unit_price: number;
    color: string | null;
    catalog_models: { name: string; sku: string };
  }[];
}

export function RetailOrdersTab({ models }: RetailOrdersTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [sources, setSources] = useState<OrderSource[]>([]);
  const [saving, setSaving] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [showAddSource, setShowAddSource] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const fetchRef = useRef(0);

  // Form state
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [buyerName, setBuyerName] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [city, setCity] = useState("");
  const [source, setSource] = useState("Instagram");

  // Derived
  const selectedModel = models.find(m => m.id === selectedModelId);
  const modelColors = selectedModel?.model_colors ?? [];
  const modelSizes = selectedModel?.model_sizes ?? [];
  const selectedColorObj = modelColors.find(c => c.name === selectedColor);
  const unitPrice = selectedModel?.base_price
    ? selectedModel.base_price * (1 - (selectedModel.discount_percent || 0) / 100)
    : 0;

  // Available stock for selected color+size
  const availableStock = selectedColorObj
    ? ((selectedColorObj as unknown as { stock_per_size: Record<string, number> }).stock_per_size?.[selectedSize] ?? 0)
    : 0;

  // Load sources
  useEffect(() => {
    fetch("/api/admin/order-sources")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setSources(data);
      })
      .catch(() => {});
  }, []);

  // Load orders
  const fetchOrders = useCallback(async () => {
    const id = ++fetchRef.current;
    setLoadingOrders(true);
    try {
      const res = await fetch("/api/admin/orders");
      if (res.ok) {
        const data: Order[] = await res.json();
        if (id === fetchRef.current) {
          setOrders(data.filter(o => o.order_type === "retail"));
        }
      }
    } catch { /* ignore */ } finally {
      if (id === fetchRef.current) setLoadingOrders(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const resetForm = useCallback(() => {
    setDate(format(new Date(), "yyyy-MM-dd"));
    setBuyerName("");
    setSelectedModelId("");
    setSelectedColor("");
    setSelectedSize("");
    setQuantity(1);
    setCity("");
    setSource("Instagram");
  }, []);

  const handleCancel = async (orderId: string) => {
    if (!confirm("Отменить заказ? Остатки будут возвращены на склад.")) return;

    setCancellingId(orderId);
    try {
      const res = await fetch("/api/admin/cancel-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      if (res.ok) {
        toast.success("Заказ отменён, остатки возвращены");
        fetchOrders();
      } else {
        const err = await res.json();
        toast.error(err.error || "Ошибка отмены");
      }
    } catch {
      toast.error("Ошибка сервера");
    } finally {
      setCancellingId(null);
    }
  };

  const handleAddSource = async () => {
    if (!newSourceName.trim()) return;
    try {
      const res = await fetch("/api/admin/order-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSourceName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSources(prev => [...prev, data]);
        setSource(data.name);
        setNewSourceName("");
        setShowAddSource(false);
        toast.success("Источник добавлен");
      } else {
        const err = await res.json();
        toast.error(err.error || "Ошибка");
      }
    } catch {
      toast.error("Ошибка добавления источника");
    }
  };

  const handleSubmit = async () => {
    if (!buyerName || !selectedModelId || !selectedColor || !selectedSize || !quantity || !source) {
      toast.error("Заполните все обязательные поля");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/retail-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: format(new Date(date), "dd.MM.yyyy"),
          buyerName,
          modelId: selectedModelId,
          modelSku: selectedModel?.sku ?? "",
          modelName: selectedModel?.name ?? "",
          color: selectedColor,
          sizeLabel: selectedSize,
          quantity,
          city,
          source,
          unitPrice,
        }),
      });

      if (res.ok) {
        toast.success("Розничный заказ добавлен");
        resetForm();
        setShowForm(false);
        fetchOrders();
      } else {
        const err = await res.json();
        toast.error(err.error || "Ошибка создания заказа");
      }
    } catch {
      toast.error("Ошибка сервера");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs sm:text-sm text-muted-foreground">Продажи через Instagram, TikTok, Prom и другие каналы</p>
        <Button className="rounded-xl" size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Добавить продажу</span><span className="sm:hidden">Добавить</span>
        </Button>
      </div>

      {/* Add sale dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-0 shadow-2xl p-0 max-w-lg">
          <div className="px-6 pb-6 pt-5 space-y-5">
            <DialogHeader>
              <DialogTitle>Новая розничная продажа</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Date */}
              <div>
                <Label className={S.label}>Дата</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className={S.input} />
              </div>

              {/* Buyer */}
              <div>
                <Label className={S.label}>Покупатель</Label>
                <Input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Имя покупателя" className={S.input} />
              </div>

              {/* Model */}
              <div>
                <Label className={S.label}>Модель</Label>
                <Select value={selectedModelId} onValueChange={v => { setSelectedModelId(v); setSelectedColor(""); setSelectedSize(""); }}>
                  <SelectTrigger className={S.select}><SelectValue placeholder="Выберите модель" /></SelectTrigger>
                  <SelectContent>
                    {models.filter(m => m.is_active).map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.sku} — {m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Color */}
              {selectedModelId && modelColors.length > 0 && (
                <div>
                  <Label className={S.label}>Цвет</Label>
                  <Select value={selectedColor} onValueChange={v => { setSelectedColor(v); setSelectedSize(""); }}>
                    <SelectTrigger className={S.select}><SelectValue placeholder="Выберите цвет" /></SelectTrigger>
                    <SelectContent>
                      {modelColors.map(c => (
                        <SelectItem key={c.id} value={c.name}>
                          <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: c.hex }} />
                            {c.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Size */}
              {selectedColor && modelSizes.length > 0 && (
                <div>
                  <Label className={S.label}>Размер</Label>
                  <Select value={selectedSize} onValueChange={setSelectedSize}>
                    <SelectTrigger className={S.select}><SelectValue placeholder="Выберите размер" /></SelectTrigger>
                    <SelectContent>
                      {modelSizes.map(s => (
                        <SelectItem key={s.id} value={s.size_label}>
                          {s.size_label} (остаток: {
                            selectedColorObj
                              ? ((selectedColorObj as unknown as { stock_per_size: Record<string, number> }).stock_per_size?.[s.size_label] ?? 0)
                              : s.total_stock
                          })
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Quantity */}
              <div>
                <Label className={S.label}>Количество</Label>
                <Input type="number" min={1} max={availableStock || 999} value={quantity || ""} onChange={e => setQuantity(Number(e.target.value) || 0)} placeholder="0" className={S.input} />
              </div>

              {/* City */}
              <div>
                <Label className={S.label}>Город отправки</Label>
                <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Город" className={S.input} />
              </div>

              {/* Source */}
              <div>
                <Label className={S.label}>Источник</Label>
                <div className="flex gap-2">
                  <Select value={source} onValueChange={setSource}>
                    <SelectTrigger className={`flex-1 ${S.select}`}><SelectValue placeholder="Источник" /></SelectTrigger>
                    <SelectContent>
                      {sources.filter(s => s.name !== "Сайт").map(s => (
                        <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" className="rounded-xl shrink-0" onClick={() => setShowAddSource(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {showAddSource && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={newSourceName}
                      onChange={e => setNewSourceName(e.target.value)}
                      placeholder="Новый источник"
                      className={`flex-1 ${S.input}`}
                      onKeyDown={e => e.key === "Enter" && handleAddSource()}
                    />
                    <Button size="sm" className="rounded-xl" onClick={handleAddSource}>Добавить</Button>
                    <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => { setShowAddSource(false); setNewSourceName(""); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Summary */}
              {selectedModel && selectedSize && (
                <Card className="bg-gray-50/50">
                  <CardContent className="pt-4">
                    <div className="flex justify-between text-sm">
                      <span>Цена за ед.:</span>
                      <span className="font-semibold">{Math.round(unitPrice)} UAH</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span>Количество:</span>
                      <span className="font-semibold">{quantity}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t">
                      <span>Итого:</span>
                      <span>{Math.round(unitPrice * quantity)} UAH</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button className="w-full rounded-xl" onClick={handleSubmit} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Сохранить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order history */}
      {loadingOrders ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Нет розничных заказов</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-3 py-2 font-semibold text-gray-500 text-xs uppercase">Дата</th>
                <th className="px-3 py-2 font-semibold text-gray-500 text-xs uppercase">Источник</th>
                <th className="px-3 py-2 font-semibold text-gray-500 text-xs uppercase">Покупатель</th>
                <th className="px-3 py-2 font-semibold text-gray-500 text-xs uppercase">Модель</th>
                <th className="px-3 py-2 font-semibold text-gray-500 text-xs uppercase">Цвет</th>
                <th className="px-3 py-2 font-semibold text-gray-500 text-xs uppercase">Размер</th>
                <th className="px-3 py-2 font-semibold text-gray-500 text-xs uppercase">Кол-во</th>
                <th className="px-3 py-2 font-semibold text-gray-500 text-xs uppercase">Сумма</th>
                <th className="px-3 py-2 font-semibold text-gray-500 text-xs uppercase">Статус</th>
                <th className="px-3 py-2 font-semibold text-gray-500 text-xs uppercase"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, i) => {
                const item = order.order_items[0];
                const isCancelled = order.status === "cancelled";
                return (
                  <tr key={order.id} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"} ${isCancelled ? "opacity-50" : ""} cursor-pointer hover:bg-blue-50/50 transition-colors`} onClick={() => setSelectedOrder(order)}>
                    <td className="px-3 py-2 whitespace-nowrap">{format(new Date(order.created_at), "dd.MM.yyyy")}</td>
                    <td className="px-3 py-2">{order.source}</td>
                    <td className="px-3 py-2">{order.customer_name}</td>
                    <td className="px-3 py-2">{item?.catalog_models?.sku ?? "—"}</td>
                    <td className="px-3 py-2">{(item as unknown as { color?: string })?.color ?? "—"}</td>
                    <td className="px-3 py-2">{item?.size_label ?? "—"}</td>
                    <td className="px-3 py-2">{item?.quantity ?? "—"}</td>
                    <td className="px-3 py-2 font-semibold">{order.total_amount?.toLocaleString()} UAH</td>
                    <td className="px-3 py-2">
                      {isCancelled ? (
                        <span className="text-xs text-red-500 font-medium">Отменён</span>
                      ) : (
                        <span className="text-xs text-green-600 font-medium">Оформлен</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {!isCancelled && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:text-red-600"
                          onClick={(e) => { e.stopPropagation(); handleCancel(order.id); }}
                          disabled={cancellingId === order.id}
                        >
                          {cancellingId === order.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Order detail popup */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-0 shadow-2xl p-0 max-w-xl sm:max-w-2xl">
            <div className="px-6 sm:px-8 pb-8 pt-6 space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <DialogTitle className="text-xl font-bold">
                    Заказ {selectedOrder.order_number ? `#${selectedOrder.order_number}` : selectedOrder.id.slice(0, 8)}
                  </DialogTitle>
                  <Badge variant={selectedOrder.status === "cancelled" ? "destructive" : "default"} className="text-xs">
                    {selectedOrder.status === "cancelled" ? "Отменён" : "Оформлен"}
                  </Badge>
                </div>
                <DialogDescription className="text-sm text-gray-400">
                  {format(new Date(selectedOrder.created_at), "dd.MM.yyyy HH:mm")}
                  {selectedOrder.source && ` · ${selectedOrder.source}`}
                </DialogDescription>
              </DialogHeader>

              <div className="bg-gray-50/50 rounded-2xl p-5 space-y-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Клиент</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Имя</p>
                    <p className="text-sm font-semibold">{selectedOrder.customer_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Телефон</p>
                    <p className="text-sm font-semibold">{selectedOrder.customer_phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Email</p>
                    <p className="text-sm font-semibold">{selectedOrder.customer_email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Оплата</p>
                    <p className="text-sm font-semibold">{selectedOrder.payment_method || "—"}</p>
                  </div>
                </div>
              </div>

              {(selectedOrder.delivery_city || selectedOrder.delivery_oblast || selectedOrder.delivery_branch) && (
                <div className="bg-gray-50/50 rounded-2xl p-5 space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Доставка</p>
                  <p className="text-sm font-medium">
                    {[selectedOrder.delivery_oblast, selectedOrder.delivery_city, selectedOrder.delivery_branch].filter(Boolean).join(", ")}
                  </p>
                </div>
              )}

              {selectedOrder.notes && (
                <div className="bg-gray-50/50 rounded-2xl p-5 space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Заметки</p>
                  <p className="text-sm text-gray-600">{selectedOrder.notes}</p>
                </div>
              )}

              <div className="bg-gray-50/50 rounded-2xl p-5 space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Товары</p>
                <div className="space-y-2">
                  {(selectedOrder.order_items ?? []).map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <span className="text-sm font-semibold">{item.catalog_models?.sku ?? "?"}</span>
                        {item.catalog_models?.name && <span className="text-xs text-gray-400 ml-2">{item.catalog_models.name}</span>}
                        {item.color && <span className="text-xs text-gray-500 ml-2">· {item.color}</span>}
                      </div>
                      <span className="text-sm text-gray-500">{item.size_label} × {item.quantity}</span>
                      <span className="text-sm font-bold">{(item.unit_price * item.quantity).toLocaleString()} UAH</span>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t-2 border-gray-200 text-right">
                  <span className="text-xl font-bold">{selectedOrder.total_amount?.toLocaleString()} UAH</span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
