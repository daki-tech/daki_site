"use client";

import { useCallback, useState } from "react";
import { format } from "date-fns";
import { Loader2, Plus, Trash2 } from "lucide-react";
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

interface WholesaleOrdersTabProps {
  models: CatalogModel[];
}

interface ColorEntry {
  colorName: string;
  rostovokCount: number;
  pricePerUnit: number;
}

export function WholesaleOrdersTab({ models }: WholesaleOrdersTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [buyerName, setBuyerName] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [colorEntries, setColorEntries] = useState<ColorEntry[]>([
    { colorName: "", rostovokCount: 1, pricePerUnit: 0 },
  ]);

  // Derived
  const selectedModel = models.find(m => m.id === selectedModelId);
  const modelColors = selectedModel?.model_colors ?? [];
  const modelSizes = selectedModel?.model_sizes ?? [];
  const sizesCount = modelSizes.length;

  // Calculate totals
  const colorTotals = colorEntries.map(c => ({
    ...c,
    sizesCount,
    colorTotal: c.rostovokCount * sizesCount * c.pricePerUnit,
  }));
  const grandTotal = colorTotals.reduce((sum, c) => sum + c.colorTotal, 0);

  const resetForm = useCallback(() => {
    setDate(format(new Date(), "yyyy-MM-dd"));
    setBuyerName("");
    setSelectedModelId("");
    setColorEntries([{ colorName: "", rostovokCount: 1, pricePerUnit: 0 }]);
  }, []);

  const addColorEntry = () => {
    setColorEntries(prev => [...prev, { colorName: "", rostovokCount: 1, pricePerUnit: prev[0]?.pricePerUnit || 0 }]);
  };

  const removeColorEntry = (idx: number) => {
    setColorEntries(prev => prev.filter((_, i) => i !== idx));
  };

  const updateColorEntry = (idx: number, field: keyof ColorEntry, value: string | number) => {
    setColorEntries(prev => prev.map((entry, i) => i === idx ? { ...entry, [field]: value } : entry));
  };

  const handleSubmit = async () => {
    if (!buyerName || !selectedModelId || colorEntries.some(c => !c.colorName)) {
      toast.error("Заполните все обязательные поля");
      return;
    }

    if (sizesCount === 0) {
      toast.error("У модели нет размеров");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/wholesale-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: format(new Date(date), "dd.MM.yyyy"),
          buyerName,
          modelId: selectedModelId,
          modelSku: selectedModel?.sku ?? "",
          modelName: selectedModel?.name ?? "",
          colors: colorTotals,
          totalAmount: grandTotal,
        }),
      });

      if (res.ok) {
        toast.success("Оптовый заказ добавлен");
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
          <h3 className="text-lg font-semibold">Опт</h3>
          <p className="text-sm text-muted-foreground">Оптовые продажи ростовками</p>
        </div>
        <Button className="rounded-xl" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Добавить продажу
        </Button>
      </div>

      {/* Add wholesale sale dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-0 shadow-2xl p-0 max-w-xl">
          <div className="px-6 pb-6 pt-5 space-y-5">
            <DialogHeader>
              <DialogTitle>Новая оптовая продажа</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Date */}
              <div>
                <Label className={S.label}>Дата продажи</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className={S.input} />
              </div>

              {/* Buyer */}
              <div>
                <Label className={S.label}>Покупатель</Label>
                <Input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Имя оптовика" className={S.input} />
              </div>

              {/* Model */}
              <div>
                <Label className={S.label}>Модель</Label>
                <Select value={selectedModelId} onValueChange={v => {
                  setSelectedModelId(v);
                  setColorEntries([{ colorName: "", rostovokCount: 1, pricePerUnit: colorEntries[0]?.pricePerUnit || 0 }]);
                }}>
                  <SelectTrigger className={S.select}><SelectValue placeholder="Выберите модель" /></SelectTrigger>
                  <SelectContent>
                    {models.filter(m => m.is_active).map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.sku} — {m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedModel && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Размеров в ростовке: <strong>{sizesCount}</strong> ({modelSizes.map(s => s.size_label).join(", ")})
                  </p>
                )}
              </div>

              {/* Colors */}
              {selectedModelId && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className={S.label}>Цвета и ростовки</Label>
                    <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={addColorEntry}>
                      <Plus className="h-3 w-3 mr-1" /> Добавить цвет
                    </Button>
                  </div>

                  {colorEntries.map((entry, idx) => (
                    <Card key={idx} className="bg-gray-50/50">
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500">Цвет {idx + 1}</span>
                          {colorEntries.length > 1 && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => removeColorEntry(idx)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>

                        {/* Color select */}
                        <div>
                          <Label className={S.label}>Цвет</Label>
                          <Select value={entry.colorName} onValueChange={v => updateColorEntry(idx, "colorName", v)}>
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

                        <div className="grid grid-cols-2 gap-3">
                          {/* Rostovok count */}
                          <div>
                            <Label className={S.label}>Кол-во ростовок</Label>
                            <Input
                              type="number"
                              min={1}
                              value={entry.rostovokCount}
                              onChange={e => updateColorEntry(idx, "rostovokCount", Number(e.target.value))}
                              className={S.input}
                            />
                          </div>
                          {/* Price per unit */}
                          <div>
                            <Label className={S.label}>Цена за ед. (UAH)</Label>
                            <Input
                              type="number"
                              min={0}
                              value={entry.pricePerUnit}
                              onChange={e => updateColorEntry(idx, "pricePerUnit", Number(e.target.value))}
                              className={S.input}
                            />
                          </div>
                        </div>

                        {/* Color subtotal */}
                        {entry.colorName && entry.pricePerUnit > 0 && (
                          <div className="text-xs text-gray-500 bg-white rounded-lg p-2">
                            {entry.rostovokCount} ростовок × {sizesCount} размеров × {entry.pricePerUnit} UAH = <strong className="text-gray-900">{entry.rostovokCount * sizesCount * entry.pricePerUnit} UAH</strong>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Grand total */}
              {grandTotal > 0 && (
                <Card className="bg-purple-50/50 border-purple-200">
                  <CardContent className="pt-4">
                    <div className="flex justify-between text-base font-bold">
                      <span>Итого заказ:</span>
                      <span className="text-purple-700">{grandTotal.toLocaleString()} UAH</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {colorEntries.filter(c => c.colorName).length} цвет(ов), {colorEntries.reduce((s, c) => s + c.rostovokCount, 0)} ростовок всего
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
