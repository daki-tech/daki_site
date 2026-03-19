"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, Plus, X } from "lucide-react";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export function RetailOrdersTab({ models }: RetailOrdersTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [sources, setSources] = useState<OrderSource[]>([]);
  const [saving, setSaving] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [showAddSource, setShowAddSource] = useState(false);

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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Розница</h3>
          <p className="text-sm text-muted-foreground">Продажи через Instagram, TikTok, Prom и другие каналы</p>
        </div>
        <Button className="rounded-xl" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Добавить продажу
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
                <Input type="number" min={1} max={availableStock || 999} value={quantity} onChange={e => setQuantity(Number(e.target.value))} className={S.input} />
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
    </div>
  );
}
