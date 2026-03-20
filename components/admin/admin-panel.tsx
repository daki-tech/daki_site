"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, rectSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import {
  Ban,
  Eye,
  EyeOff,
  GripVertical,
  Home,
  ImagePlus,
  Loader2,
  Mail,
  Package,
  Pencil,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  TrendingUp,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PhoneInput } from "@/components/ui/phone-input";
import { useRealtimeTable } from "@/hooks/use-realtime";
import { ImageCropper } from "@/components/admin/image-cropper";

// Round checkbox component
function RoundCheck({ checked, onChange, accent = "neutral" }: { checked: boolean; onChange: () => void; accent?: "neutral" | "green" | "blue" | "orange" }) {
  const colorMap = {
    green: "border-green-400 bg-green-500 text-white",
    blue: "border-blue-400 bg-blue-500 text-white",
    orange: "border-amber-400 bg-amber-500 text-white",
    neutral: "border-neutral-400 bg-neutral-900 text-white",
  };
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${checked ? colorMap[accent] : "border-neutral-300 bg-white"}`}
    >
      {checked && <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </button>
  );
}

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CATALOG_CATEGORIES, MODEL_SEASONS } from "@/lib/constants";
import type { CatalogModel, DashboardStats, Profile, WholesaleOrder } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { SmartImage } from "@/components/ui/smart-image";
import { RetailOrdersTab } from "@/components/admin/retail-orders-tab";
import { WholesaleOrdersTab } from "@/components/admin/wholesale-orders-tab";

/* ------------------------------------------------------------------ */
/*  Custom confirm dialog (replaces browser native confirm())          */
/* ------------------------------------------------------------------ */

function useConfirmDialog() {
  const [state, setState] = useState<{ open: boolean; title: string; description: string; resolve: ((v: boolean) => void) | null }>({ open: false, title: "", description: "", resolve: null });
  const confirm = useCallback((title: string, description = "") => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, title, description, resolve });
    });
  }, []);
  const handleClose = useCallback((result: boolean) => {
    state.resolve?.(result);
    setState({ open: false, title: "", description: "", resolve: null });
  }, [state]);
  const ConfirmDialog = useMemo(() => {
    return function ConfirmDialogInner() {
      return (
        <Dialog open={state.open} onOpenChange={(open) => !open && handleClose(false)}>
          <DialogContent className="rounded-2xl border-0 shadow-2xl p-0 max-w-sm">
            <div className="px-6 pb-5 pt-6 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold">{state.title}</DialogTitle>
                {state.description && <DialogDescription className="text-sm text-gray-500">{state.description}</DialogDescription>}
              </DialogHeader>
              <DialogFooter className="flex gap-3 sm:gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => handleClose(false)}>Отмена</Button>
                <Button variant="destructive" className="flex-1 rounded-xl" onClick={() => handleClose(true)}>Подтвердить</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      );
    };
  }, [state.open, state.title, state.description, handleClose]);
  return { confirm, ConfirmDialog };
}

/* ------------------------------------------------------------------ */
/*  iOS-inspired style tokens                                          */
/* ------------------------------------------------------------------ */

const S = {
  input: "rounded-xl border-gray-200 bg-gray-50/60 focus:bg-white transition-colors text-sm",
  label: "text-[11px] font-semibold text-gray-400 uppercase tracking-wider",
  select: "rounded-xl border-gray-200 bg-gray-50/60",
  textarea: "rounded-xl border-gray-200 bg-gray-50/60 focus:bg-white transition-colors text-sm",
  section: "text-xs font-bold text-gray-400 uppercase tracking-wider",
  card: "bg-gray-50/50 rounded-2xl p-4 space-y-3",
  divider: "border-t border-gray-100",
  dialog: "max-h-[90vh] overflow-y-auto rounded-2xl border-0 shadow-2xl p-0",
  dialogInner: "px-6 pb-6 pt-5 space-y-5",
  deleteBtn: "h-7 w-7 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center shrink-0",
  addBtn: "rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors",
} as const;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AdminPanelProps {
  initialModels: CatalogModel[];
  orders: WholesaleOrder[];
  stats: DashboardStats;
  users: Profile[];
}

const ALL_SIZES = ["42", "44", "46", "48", "50", "52", "54", "56"] as const;

interface ColorVariant { name: string; hex: string; image_urls: string[]; stock_per_size: Record<string, number> }

interface ModelFormData {
  sku: string;
  name: string;
  category: string;
  season: string;
  base_price: string;
  discount_percent: string;
  wholesale_price: string;
  min_wholesale_qty: string;
  description: string;
  care_instructions: string;
  delivery_info: string;
  return_info: string;
  care_media_url: string;
  delivery_media_url: string;
  selected_sizes: string[];
  color_variants: ColorVariant[];
  sizes: { size_label: string; total_stock: number }[];
  size_chart: { size: string; chest: string; waist: string; hips: string; available: string }[];
}

const emptyForm: ModelFormData = {
  sku: "", name: "", category: "puhovik", season: "Зима",
  base_price: "0", discount_percent: "0", wholesale_price: "0", min_wholesale_qty: "1", description: "",
  care_instructions: "", delivery_info: "", return_info: "",
  care_media_url: "", delivery_media_url: "",
  selected_sizes: [],
  color_variants: [{ name: "", hex: "#000000", image_urls: [], stock_per_size: {} }],
  sizes: [{ size_label: "", total_stock: 0 }],
  size_chart: [{ size: "", chest: "", waist: "", hips: "", available: "" }],
};

function modelToForm(m: CatalogModel): ModelFormData {
  const sc = (() => { try { return typeof m.size_chart === "string" ? JSON.parse(m.size_chart) : m.size_chart; } catch { return []; } })();
  const selectedSizes = m.model_sizes?.length ? m.model_sizes.map((s) => s.size_label).filter(Boolean) : [];
  return {
    sku: m.sku, name: m.name, category: m.category, season: m.season,
    base_price: String(m.base_price), discount_percent: String(m.discount_percent),
    wholesale_price: String(m.wholesale_price ?? 0), min_wholesale_qty: String(m.min_wholesale_qty ?? 1),
    description: m.description ?? "",
    care_instructions: m.care_instructions ?? "", delivery_info: m.delivery_info ?? "",
    return_info: m.return_info ?? "",
    care_media_url: m.detail_images?.[0] ?? "", delivery_media_url: m.detail_images?.[1] ?? "",
    selected_sizes: selectedSizes,
    color_variants: m.model_colors?.length
      ? m.model_colors.map((c) => ({ name: c.name, hex: c.hex, image_urls: c.image_urls ?? [], stock_per_size: ((c as unknown as Record<string, unknown>).stock_per_size as Record<string, number>) ?? {} }))
      : [{ name: "", hex: "#000000", image_urls: m.image_urls?.length ? m.image_urls : [], stock_per_size: {} }],
    sizes: m.model_sizes?.length ? m.model_sizes.map((s) => ({ size_label: s.size_label, total_stock: s.total_stock })) : [{ size_label: "", total_stock: 0 }],
    size_chart: Array.isArray(sc) && sc.length > 0 ? sc : [{ size: "", chest: "", waist: "", hips: "", available: "" }],
  };
}

const statusLabels: Record<string, string> = { pending: "Ожидает", draft: "Новый", confirmed: "Подтверждён", shipped: "Отправлен", completed: "Завершён", cancelled: "Отменён" };
const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = { pending: "outline", confirmed: "secondary", shipped: "default", completed: "default", cancelled: "destructive" };

/* ------------------------------------------------------------------ */
/*  PhotoUploadGrid — drag-and-drop photo grid                         */
/* ------------------------------------------------------------------ */

interface PhotoItem { id: string; url: string }

function PhotoUploadGrid({ urls, onChange, targetSize }: { urls: string[]; onChange: (urls: string[]) => void; targetSize?: { w: number; h: number } }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const urlsRef = useRef(urls);
  urlsRef.current = urls;

  // Cropper state — queue of files to crop one by one
  const [cropQueue, setCropQueue] = useState<{ file: File; dataUrl: string }[]>([]);
  const [currentCropIdx, setCurrentCropIdx] = useState(0);
  const currentCrop = cropQueue[currentCropIdx] ?? null;

  const items: PhotoItem[] = useMemo(
    () => urls.filter(Boolean).map((url, i) => ({ id: `${i}-${url.slice(-20)}`, url })),
    [urls],
  );

  const uploadBlob = useCallback(async (blob: Blob, fileName: string): Promise<string> => {
    const file = new File([blob], fileName, { type: blob.type || "image/jpeg" });
    if (file.size > 4 * 1024 * 1024) {
      const meta = await fetch("/api/admin/upload-url", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      });
      const metaJson = await meta.json();
      if (!meta.ok) throw new Error(metaJson.error ?? "Failed to get upload URL");
      const up = await fetch(metaJson.signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!up.ok) throw new Error("Direct upload failed");
      return metaJson.publicUrl;
    } else {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      return json.url;
    }
  }, []);

  // When files are picked, read them as data URLs and open cropper queue
  const handleFilesSelected = useCallback((files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    Promise.all(
      imageFiles.map(
        (file) =>
          new Promise<{ file: File; dataUrl: string }>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ file, dataUrl: reader.result as string });
            reader.readAsDataURL(file);
          }),
      ),
    ).then((queue) => {
      setCropQueue(queue);
      setCurrentCropIdx(0);
    });
  }, []);

  const handleCropDone = useCallback(async (croppedBlob: Blob) => {
    const fileName = currentCrop?.file.name ?? "photo.jpg";
    setUploading(true);
    try {
      const url = await uploadBlob(croppedBlob, fileName);
      onChange([...urlsRef.current.filter(Boolean), url]);
      toast.success(`Фото загружено (${currentCropIdx + 1}/${cropQueue.length})`);
    } catch (e) {
      toast.error(`${fileName}: ${e instanceof Error ? e.message : "Ошибка"}`);
    }
    setUploading(false);

    // Move to next in queue or close
    if (currentCropIdx + 1 < cropQueue.length) {
      setCurrentCropIdx((i) => i + 1);
    } else {
      setCropQueue([]);
      setCurrentCropIdx(0);
    }
  }, [currentCrop, currentCropIdx, cropQueue.length, uploadBlob, onChange]);

  const handleCropCancel = useCallback(() => {
    // Skip this image, move to next or close
    if (currentCropIdx + 1 < cropQueue.length) {
      setCurrentCropIdx((i) => i + 1);
    } else {
      setCropQueue([]);
      setCurrentCropIdx(0);
    }
  }, [currentCropIdx, cropQueue.length]);

  const handleRemove = (url: string) => {
    onChange(urls.filter((u) => u !== url));
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = items.findIndex((it) => it.id === active.id);
      const newIdx = items.findIndex((it) => it.id === over.id);
      onChange(arrayMove(urls, oldIdx, newIdx));
    }
  };

  return (
    <div>
      <p className={S.label}>Фото товара</p>
      <p className="text-xs text-neutral-400 mt-0.5">Рекомендуемое: 3:4 (например 900×1200 px)</p>
      <div className="mt-2 flex flex-wrap gap-3 items-start">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((it) => it.id)} strategy={rectSortingStrategy}>
            {items.map((item) => (
              <SortablePhoto key={item.id} item={item} onRemove={handleRemove} />
            ))}
          </SortableContext>
        </DndContext>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) handleFilesSelected(files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`w-[72px] h-[72px] ${S.addBtn} flex flex-col items-center justify-center gap-0.5`}
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          <span className="text-[9px] font-medium">Добавить</span>
        </button>
      </div>

      {/* Instagram-style cropper modal */}
      {currentCrop && (
        <ImageCropper
          imageSrc={currentCrop.dataUrl}
          onCropDone={handleCropDone}
          onCancel={handleCropCancel}
          targetSize={targetSize}
        />
      )}
    </div>
  );
}

function SortablePhoto({ item, onRemove }: { item: PhotoItem; onRemove: (url: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : 0 };

  return (
    <div ref={setNodeRef} style={style} className="relative w-[72px] h-[96px] rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow group cursor-grab active:cursor-grabbing bg-neutral-50" {...attributes} {...listeners}>
      <SmartImage src={item.url} alt="" fill className="object-cover pointer-events-none" />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onRemove(item.url); }}
        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SortableColorVariant — draggable color variant block               */
/* ------------------------------------------------------------------ */

function SortableColorVariant({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : 0 };

  return (
    <div ref={setNodeRef} style={style} className="rounded-xl border border-gray-200 p-3 space-y-3 relative">
      <div className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="pl-5">
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SingleMediaUpload — one image/video upload with preview            */
/* ------------------------------------------------------------------ */

function SingleMediaUpload({ value, onChange, label, aspect, targetSize }: { value: string; onChange: (url: string) => void; label: string; aspect?: number; targetSize?: { w: number; h: number } }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const cropFileRef = useRef<File | null>(null);

  const uploadFile = useCallback(async (fileOrBlob: File | Blob, fileName: string) => {
    const file = fileOrBlob instanceof File ? fileOrBlob : new File([fileOrBlob], fileName, { type: fileOrBlob.type || "image/jpeg" });
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      toast.error(`Файл слишком большой (${sizeMB} MB). Максимум 50 MB.`);
      return;
    }
    setUploading(true);
    try {
      if (file.size <= 4 * 1024 * 1024) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        if (res.ok) {
          const json = await res.json();
          onChange(json.url);
        } else {
          throw new Error("Upload failed");
        }
      } else {
        const meta = await fetch("/api/admin/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, contentType: file.type }),
        });
        const metaJson = await meta.json();
        if (!meta.ok) throw new Error(metaJson.error ?? "Failed to get upload URL");
        const up = await fetch(metaJson.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!up.ok) throw new Error("Ошибка загрузки на сервер.");
        onChange(metaJson.publicUrl);
      }
      toast.success("Файл загружен");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const handleFileSelected = useCallback((file: File) => {
    if (file.type.startsWith("image/")) {
      // Open cropper for images
      cropFileRef.current = file;
      const reader = new FileReader();
      reader.onload = () => setCropSrc(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      // Videos — upload directly
      uploadFile(file, file.name);
    }
  }, [uploadFile]);

  const handleCropDone = useCallback(async (blob: Blob) => {
    setCropSrc(null);
    await uploadFile(blob, cropFileRef.current?.name ?? "photo.jpg");
  }, [uploadFile]);

  return (
    <div>
      <p className={S.label}>{label}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); e.target.value = ""; }}
      />
      {value ? (
        <div className="mt-2 relative w-[120px] h-[160px] rounded-xl overflow-hidden border border-gray-200 shadow-sm group bg-neutral-50">
          <SmartImage src={value} alt={label} fill className="object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`mt-2 w-[120px] h-[80px] ${S.addBtn} flex flex-col items-center justify-center gap-1`}
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          <span className="text-[9px] font-medium">Загрузить</span>
        </button>
      )}

      {/* Cropper modal for images */}
      {cropSrc && (
        <ImageCropper
          imageSrc={cropSrc}
          onCropDone={handleCropDone}
          onCancel={() => setCropSrc(null)}
          targetSize={targetSize}
        />
      )}
    </div>
  );
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */

export function AdminPanel({ initialModels, orders: initialOrders, stats, users: initialUsers }: AdminPanelProps) {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [models, setModels] = useState<CatalogModel[]>(initialModels);
  const [orders, setOrders] = useState<WholesaleOrder[]>(initialOrders);
  const [users] = useState<Profile[]>(initialUsers);

  // Products state
  const [searchQuery, setSearchQuery] = useState("");
  const [productSort, setProductSort] = useState<"default"|"stock_asc"|"stock_desc"|"sold_asc"|"sold_desc">("default");
  const [editingModel, setEditingModel] = useState<CatalogModel | null>(null);
  const [editForm, setEditForm] = useState<ModelFormData>(emptyForm);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<ModelFormData>(emptyForm);

  // Orders state
  const [orderSearch, setOrderSearch] = useState("");
  const [orderSort, setOrderSort] = useState<"date_desc"|"date_asc"|"amount_desc"|"amount_asc">("date_desc");
  const [orderMonthFilter, setOrderMonthFilter] = useState("all");
  const [orderYearFilter, setOrderYearFilter] = useState(String(new Date().getFullYear()));
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<WholesaleOrder | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Revenue state
  const [revenueMonth, setRevenueMonth] = useState("all");
  const [revenueYear, setRevenueYear] = useState(String(new Date().getFullYear()));

  // Users state
  const [userSearch, setUserSearch] = useState("");
  const [userSort, setUserSort] = useState<"alpha"|"orders_desc">("alpha");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  // Homepage state
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [heroBgUrl, setHeroBgUrl] = useState("");
  const [aboutTitle, setAboutTitle] = useState("");
  const [aboutSubtitle, setAboutSubtitle] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [aboutMediaUrl, setAboutMediaUrl] = useState("");
  const [homepageLoading, setHomepageLoading] = useState(false);

  // Newsletter state
  const [nlSubject, setNlSubject] = useState("");
  const [nlBody, setNlBody] = useState("");
  const [nlAudience, setNlAudience] = useState("newsletter");
  const [nlSending, setNlSending] = useState(false);

  // Contacts state
  const [ctPhones, setCtPhones] = useState<string[]>([""]);
  const [ctEmail, setCtEmail] = useState("");
  const [ctTelegram, setCtTelegram] = useState("");
  const [ctInstagram, setCtInstagram] = useState("");
  const [ctViber, setCtViber] = useState("");
  const [ctWhatsapp, setCtWhatsapp] = useState("");
  const [ctTiktok, setCtTiktok] = useState("");
  const [contactsLoading, setContactsLoading] = useState(false);

  // Sensors for drag & drop (color variants)
  const colorDndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Load homepage settings
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/settings");
        if (!res.ok) return;
        const data = (await res.json()) as { key: string; value: string }[];
        const m = Object.fromEntries(data.map((d) => [d.key, d.value]));
        setHeroTitle(m.hero_title ?? ""); setHeroSubtitle(m.hero_subtitle ?? "");
        setHeroBgUrl(m.hero_bg_url ?? ""); setAboutTitle(m.about_title ?? "");
        setAboutSubtitle(m.about_subtitle ?? ""); setAboutText(m.about_text ?? "");
        setAboutMediaUrl(m.about_media_url ?? "");
        // Parse phones: try JSON array first, fallback to single phone
        try {
          const phones = JSON.parse(m.contact_phones || "[]");
          setCtPhones(phones.length > 0 ? phones : m.contact_phone ? [m.contact_phone] : [""]);
        } catch { setCtPhones(m.contact_phone ? [m.contact_phone] : [""]); }
        setCtEmail(m.contact_email ?? "");
        setCtTelegram(m.contact_telegram ?? ""); setCtInstagram(m.contact_instagram ?? "");
        setCtViber(m.contact_viber ?? ""); setCtWhatsapp(m.contact_whatsapp ?? "");
        setCtTiktok(m.contact_tiktok ?? "");
      } catch {}
    })();
  }, []);

  // Refresh helpers
  const refreshModels = async () => {
    const res = await fetch("/api/admin/models", { cache: "no-store" });
    if (res.ok) setModels(await res.json());
  };
  const refreshOrders = async () => {
    const res = await fetch("/api/admin/orders", { cache: "no-store" });
    if (res.ok) setOrders(await res.json());
  };

  // Realtime subscriptions — auto-refresh on DB changes
  useRealtimeTable("orders", refreshOrders);
  useRealtimeTable("catalog_models", refreshModels);
  useRealtimeTable("model_colors", refreshModels);
  useRealtimeTable("model_sizes", refreshModels);

  // Product helpers
  const getStock = (m: CatalogModel) =>
    (m.model_sizes ?? []).reduce((s, sz) => s + Math.max(sz.total_stock - sz.sold_stock - sz.reserved_stock, 0), 0);
  const getSold = (m: CatalogModel) =>
    (m.model_sizes ?? []).reduce((s, sz) => s + sz.sold_stock, 0);

  const filteredModels = useMemo(() => {
    let list = models;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(q) || m.sku.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
    }
    if (productSort === "stock_asc") list = [...list].sort((a, b) => getStock(a) - getStock(b));
    else if (productSort === "stock_desc") list = [...list].sort((a, b) => getStock(b) - getStock(a));
    else if (productSort === "sold_asc") list = [...list].sort((a, b) => getSold(a) - getSold(b));
    else if (productSort === "sold_desc") list = [...list].sort((a, b) => getSold(b) - getSold(a));
    return list;
  }, [models, searchQuery, productSort]);

  const handleToggleActive = async (model: CatalogModel) => {
    const res = await fetch(`/api/admin/models/${model.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", is_active: !model.is_active }),
    });
    if (!res.ok) { toast.error("Ошибка"); return; }
    toast.success(model.is_active ? "Товар скрыт" : "Товар показан");
    await refreshModels();
  };

  const handleToggleOutOfStock = async (model: CatalogModel) => {
    const res = await fetch(`/api/admin/models/${model.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_out_of_stock", is_out_of_stock: !model.is_out_of_stock }),
    });
    if (!res.ok) { toast.error("Ошибка"); return; }
    toast.success(model.is_out_of_stock ? "Товар в наличии" : "Нет в наличии");
    await refreshModels();
  };

  const handleDeleteModel = async (id: string) => {
    if (!(await confirm("Удалить этот товар навсегда?", "Это действие нельзя отменить."))) return;
    const res = await fetch(`/api/admin/models/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Ошибка удаления"); return; }
    toast.success("Товар удален");
    await refreshModels();
  };

  const openEdit = (model: CatalogModel) => {
    setEditingModel(model);
    setEditForm(modelToForm(model));
  };

  // Compute total stock per size by summing across all color variants
  const computeSizesFromColors = (f: ModelFormData) => {
    const totals: Record<string, number> = {};
    for (const sz of f.selected_sizes) totals[sz] = 0;
    for (const cv of f.color_variants) {
      for (const sz of f.selected_sizes) {
        totals[sz] = (totals[sz] || 0) + (cv.stock_per_size[sz] || 0);
      }
    }
    return f.selected_sizes.map((sz) => ({ size_label: sz, total_stock: totals[sz] || 0 }));
  };

  const handleUpdateModel = async () => {
    if (!editingModel) return;
    const sizes = computeSizesFromColors(editForm);
    const payload = {
      action: "update",
      sku: editForm.sku, name: editForm.name, category: editForm.category,
      season: editForm.season,
      base_price: Number(editForm.base_price), discount_percent: Number(editForm.discount_percent),
      wholesale_price: Number(editForm.wholesale_price), min_wholesale_qty: Number(editForm.min_wholesale_qty),
      description: editForm.description || null,
      image_urls: editForm.color_variants.flatMap((v) => v.image_urls).filter(Boolean),
      care_instructions: editForm.care_instructions || null,
      delivery_info: editForm.delivery_info || null,
      return_info: editForm.return_info || null,
      detail_images: [editForm.care_media_url, editForm.delivery_media_url].filter(Boolean),
      size_chart: JSON.stringify(editForm.size_chart.filter((r) => r.size)),
      color_variants: editForm.color_variants.filter((c) => c.hex).map((c) => ({ ...c, stock_per_size: c.stock_per_size })),
      sizes,
    };
    const res = await fetch(`/api/admin/models/${editingModel.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); toast.error(err.error ? `Ошибка: ${typeof err.error === "string" ? err.error : JSON.stringify(err.error)}` : "Ошибка обновления"); return; }
    toast.success("Модель обновлена");
    setEditingModel(null);
    await refreshModels();
  };

  const handleCreateModel = async () => {
    const sizes = computeSizesFromColors(createForm);
    const payload = {
      sku: createForm.sku, name: createForm.name, category: createForm.category,
      season: createForm.season,
      base_price: Number(createForm.base_price), discount_percent: Number(createForm.discount_percent),
      wholesale_price: Number(createForm.wholesale_price), min_wholesale_qty: Number(createForm.min_wholesale_qty),
      description: createForm.description || null,
      image_urls: createForm.color_variants.flatMap((v) => v.image_urls).filter(Boolean),
      care_instructions: createForm.care_instructions || null,
      delivery_info: createForm.delivery_info || null,
      return_info: createForm.return_info || null,
      detail_images: [createForm.care_media_url, createForm.delivery_media_url].filter(Boolean),
      size_chart: JSON.stringify(createForm.size_chart.filter((r) => r.size)),
      color_variants: createForm.color_variants.filter((c) => c.hex).map((c) => ({ ...c, stock_per_size: c.stock_per_size })),
      sizes,
    };
    const res = await fetch("/api/admin/models", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); toast.error(err.error ? `Ошибка: ${typeof err.error === "string" ? err.error : JSON.stringify(err.error)}` : "Ошибка создания"); return; }
    toast.success("Товар создан");
    setIsCreating(false);
    setCreateForm(emptyForm);
    await refreshModels();
  };

  // Order helpers
  const monthNames = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  const orderYears = useMemo(() => {
    const yrs = new Set<string>();
    orders.forEach((o) => yrs.add(String(new Date(o.created_at).getFullYear())));
    yrs.add(String(new Date().getFullYear()));
    return Array.from(yrs).sort().reverse();
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (orderYearFilter !== "all") list = list.filter((o) => String(new Date(o.created_at).getFullYear()) === orderYearFilter);
    if (orderMonthFilter !== "all") list = list.filter((o) => String(new Date(o.created_at).getMonth() + 1) === orderMonthFilter);
    if (orderTypeFilter !== "all") list = list.filter((o) => o.order_type === orderTypeFilter);
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      list = list.filter((o) => (o.customer_name ?? "").toLowerCase().includes(q) || String(o.order_number ?? "").includes(q));
    }
    if (orderSort === "date_desc") list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else if (orderSort === "date_asc") list = [...list].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    else if (orderSort === "amount_desc") list = [...list].sort((a, b) => b.total_amount - a.total_amount);
    else if (orderSort === "amount_asc") list = [...list].sort((a, b) => a.total_amount - b.total_amount);
    return list;
  }, [orders, orderSearch, orderSort, orderMonthFilter, orderYearFilter, orderTypeFilter]);

  const handleSetOrderStatus = async (order: WholesaleOrder, targetStatus: string) => {
    // Toggle: if already at this status, go back to previous
    const statusFlow = ["draft", "confirmed", "shipped", "completed"];
    const currentIdx = statusFlow.indexOf(order.status);
    // If clicking the current status, go back one step
    const newStatus = order.status === targetStatus
      ? (currentIdx > 0 ? statusFlow[currentIdx - 1] : "draft")
      : targetStatus;
    const res = await fetch("/api/admin/orders", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id, status: newStatus }),
    });
    if (!res.ok) { toast.error("Ошибка"); return; }
    toast.success("Статус обновлен");
    await refreshOrders();
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!(await confirm("Удалить этот заказ?", "Остатки будут возвращены на склад."))) return;
    const res = await fetch("/api/admin/orders", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    if (!res.ok) { toast.error("Ошибка удаления заказа"); return; }
    toast.success("Заказ удален");
    await refreshOrders();
  };

  // Revenue
  const revenueData = useMemo(() => {
    let filtered = orders;
    if (revenueYear !== "all") filtered = filtered.filter((o) => String(new Date(o.created_at).getFullYear()) === revenueYear);
    if (revenueMonth !== "all") filtered = filtered.filter((o) => String(new Date(o.created_at).getMonth() + 1) === revenueMonth);
    const total = filtered.reduce((s, o) => s + o.total_amount, 0);
    const count = filtered.length;
    return { total, count, avg: count > 0 ? total / count : 0 };
  }, [orders, revenueMonth, revenueYear]);

  // Users
  const userOrderCounts = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach((o) => { map[o.user_id] = (map[o.user_id] ?? 0) + 1; });
    return map;
  }, [orders]);

  const filteredUsers = useMemo(() => {
    let list = users.filter((u) => !u.is_admin);
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      list = list.filter((u) => (u.full_name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q));
    }
    if (userSort === "alpha") list = [...list].sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
    else list = [...list].sort((a, b) => (userOrderCounts[b.id] ?? 0) - (userOrderCounts[a.id] ?? 0));
    return list;
  }, [users, userSearch, userSort, userOrderCounts]);

  // Homepage save
  const saveHomepage = async () => {
    setHomepageLoading(true);
    try {
      const entries = [
        { key: "hero_title", value: heroTitle }, { key: "hero_subtitle", value: heroSubtitle },
        { key: "hero_bg_url", value: heroBgUrl }, { key: "about_title", value: aboutTitle },
        { key: "about_subtitle", value: aboutSubtitle }, { key: "about_text", value: aboutText },
        { key: "about_media_url", value: aboutMediaUrl },
      ];
      for (const s of entries) {
        const res = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error ?? `Failed to save ${s.key}`); }
      }
      toast.success("Главная страница обновлена");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка сохранения"); }
    finally { setHomepageLoading(false); }
  };

  // Contacts save
  const saveContacts = async () => {
    setContactsLoading(true);
    try {
      const entries = [
        { key: "contact_phones", value: JSON.stringify(ctPhones.filter(Boolean)) },
        { key: "contact_email", value: ctEmail },
        { key: "contact_telegram", value: ctTelegram }, { key: "contact_instagram", value: ctInstagram },
        { key: "contact_viber", value: ctViber }, { key: "contact_whatsapp", value: ctWhatsapp },
        { key: "contact_tiktok", value: ctTiktok },
      ];
      for (const s of entries) {
        const res = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error ?? `Failed to save ${s.key}`); }
      }
      toast.success("Контакты обновлены");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка сохранения"); }
    finally { setContactsLoading(false); }
  };

  // Newsletter
  const sendNewsletter = async () => {
    if (!nlSubject.trim() || !nlBody.trim()) { toast.error("Заполните тему и текст"); return; }
    setNlSending(true);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: nlSubject, body: nlBody, audience: nlAudience }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Ошибка"); return; }
      toast.success(`Отправлено: ${data.sent} получателей`);
      setNlSubject(""); setNlBody("");
    } catch { toast.error("Ошибка отправки"); }
    finally { setNlSending(false); }
  };

  // Bulk delete orders
  const handleBulkDeleteOrders = async () => {
    if (selectedOrderIds.size === 0) return;
    if (!(await confirm(`Удалить ${selectedOrderIds.size} заказов?`, "Остатки будут возвращены на склад."))) return;
    for (const id of selectedOrderIds) {
      await fetch("/api/admin/orders", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id }),
      });
    }
    toast.success(`Удалено: ${selectedOrderIds.size}`);
    setSelectedOrderIds(new Set());
    await refreshOrders();
  };

  const toggleOrderSelect = (id: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllOrders = () => {
    if (selectedOrderIds.size === filteredOrders.length) setSelectedOrderIds(new Set());
    else setSelectedOrderIds(new Set(filteredOrders.map((o) => o.id)));
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Скопировано"));
  };

  // Per-model revenue analytics
  const modelRevenue = useMemo(() => {
    let filtered = orders;
    if (revenueYear !== "all") filtered = filtered.filter((o) => String(new Date(o.created_at).getFullYear()) === revenueYear);
    if (revenueMonth !== "all") filtered = filtered.filter((o) => String(new Date(o.created_at).getMonth() + 1) === revenueMonth);
    const map: Record<string, { sku: string; name: string; qty: number; revenue: number }> = {};
    for (const o of filtered) {
      for (const item of o.order_items ?? []) {
        const sku = item.catalog_models?.sku ?? "?";
        const name = item.catalog_models?.name ?? sku;
        if (!map[sku]) map[sku] = { sku, name, qty: 0, revenue: 0 };
        map[sku].qty += item.quantity;
        map[sku].revenue += item.unit_price * item.quantity;
      }
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [orders, revenueMonth, revenueYear]);

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */
  const tabTriggerCls = "gap-1.5 rounded-xl px-3 sm:px-4 py-2 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all whitespace-nowrap";
  return (
    <div className="space-y-2">
      <ConfirmDialog />
      <Tabs defaultValue="products" className="space-y-4" style={{ minHeight: "70vh" }}>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 scrollbar-none">
          <div className="flex justify-center mb-4 min-w-fit">
            <TabsList className="inline-flex h-11 items-center gap-0.5 rounded-2xl bg-neutral-100 p-1">
              <TabsTrigger value="products" className={tabTriggerCls}><Package className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Товары</span><span className="sm:hidden">Тов.</span></TabsTrigger>
              <TabsTrigger value="orders" className={tabTriggerCls}><ShoppingCart className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Заказы</span><span className="sm:hidden">Зак.</span></TabsTrigger>
              <TabsTrigger value="retail" className={tabTriggerCls}><ShoppingCart className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Розница</span><span className="sm:hidden">Розн.</span></TabsTrigger>
              <TabsTrigger value="wholesale" className={tabTriggerCls}><Package className="h-3.5 w-3.5" /> Опт</TabsTrigger>
              <TabsTrigger value="revenue" className={tabTriggerCls}><TrendingUp className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Выручка</span><span className="sm:hidden">Выр.</span></TabsTrigger>
              <TabsTrigger value="users" className={tabTriggerCls}><Users className="h-3.5 w-3.5" /> <span className="hidden md:inline">Пользователи</span><span className="md:hidden">Польз.</span></TabsTrigger>
              <TabsTrigger value="homepage" className={tabTriggerCls}><Home className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Главная</span></TabsTrigger>
              <TabsTrigger value="contacts" className={tabTriggerCls}><Phone className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Контакты</span></TabsTrigger>
              <TabsTrigger value="newsletter" className={tabTriggerCls}><Mail className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Рассылка</span></TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* ====================== ТОВАРЫ ====================== */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <p className="text-sm text-muted-foreground">Всего: {models.length}</p>
              <Button size="sm" className="rounded-xl" onClick={() => { setCreateForm(emptyForm); setIsCreating(true); }}><Plus className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Добавить товар</span><span className="sm:hidden">Добавить</span></Button>
            </div>
            <Select value={productSort} onValueChange={(v) => setProductSort(v as typeof productSort)}>
              <SelectTrigger className={`w-[160px] sm:w-[200px] ${S.select}`}><SelectValue placeholder="Сортировка" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">По умолчанию</SelectItem>
                <SelectItem value="stock_desc">Остаток (убыв.)</SelectItem>
                <SelectItem value="stock_asc">Остаток (возр.)</SelectItem>
                <SelectItem value="sold_desc">Продано (убыв.)</SelectItem>
                <SelectItem value="sold_asc">Продано (возр.)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск по названию или артикулу..." className={`pl-10 ${S.input}`} />
          </div>
          <Card>
            <CardContent className="pt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Артикул</TableHead><TableHead>Название</TableHead><TableHead>Цена</TableHead>
                    <TableHead>Скидка</TableHead><TableHead>Остаток</TableHead><TableHead>Продано</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredModels.map((model) => {
                    const stock = getStock(model);
                    const sold = getSold(model);
                    return (
                      <TableRow key={model.id}>
                        <TableCell className="font-mono text-xs">{model.sku}</TableCell>
                        <TableCell className="font-medium">{model.name}</TableCell>
                        <TableCell>{formatCurrency(model.base_price)}</TableCell>
                        <TableCell>{model.discount_percent > 0 ? <Badge variant="secondary">-{model.discount_percent}%</Badge> : "-"}</TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <span className="font-medium">{stock} шт.</span>
                            {model.model_colors && model.model_colors.length >= 1 && (
                              <div className="mt-1 space-y-0.5">
                                {model.model_colors.map((c) => {
                                  const sps = (c as unknown as Record<string, unknown>).stock_per_size as Record<string, number> | undefined;
                                  const colorStock = sps ? Object.values(sps).reduce((a, b) => a + (b || 0), 0) : 0;
                                  return (
                                    <div key={c.id} className="flex items-center gap-1">
                                      <span className="inline-block w-2.5 h-2.5 rounded-full border border-gray-200 flex-shrink-0" style={{ background: c.hex }} />
                                      <span className="text-[10px] text-gray-500 truncate max-w-[80px]">{c.name}</span>
                                      <span className="text-[10px] text-gray-400">— {colorStock}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{sold} шт.</TableCell>
                        <TableCell>
                          {!model.is_active ? (
                            <Badge variant="outline" className="border-orange-400 text-orange-600 bg-orange-50 dark:bg-orange-950/30">Скрыт</Badge>
                          ) : model.is_out_of_stock ? (
                            <Badge variant="outline" className="border-red-400 text-red-600 bg-red-50 dark:bg-red-950/30">Нет в наличии</Badge>
                          ) : (
                            <Badge variant="outline" className="border-green-400 text-green-600 bg-green-50 dark:bg-green-950/30">Активен</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(model)} title="Редактировать"><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleActive(model)} title={model.is_active ? "Скрыть" : "Показать"}>{model.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleOutOfStock(model)} title={model.is_out_of_stock ? "В наличии" : "Нет в наличии"}><Ban className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDeleteModel(model.id)} title="Удалить"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredModels.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">Товаров не найдено</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Edit product dialog */}
          {editingModel && (
            <Dialog open={!!editingModel} onOpenChange={(open) => !open && setEditingModel(null)}>
              <DialogContent className={`${S.dialog} max-w-2xl`}>
                <div className={S.dialogInner}>
                  <DialogHeader>
                    <DialogTitle className="text-lg font-semibold tracking-tight">{editingModel.name}</DialogTitle>
                    <DialogDescription className="text-xs text-gray-400">Редактирование товара</DialogDescription>
                  </DialogHeader>
                  {renderModelForm(editForm, setEditForm, colorDndSensors)}
                  <DialogFooter className="pt-2">
                    <Button variant="outline" className="rounded-xl" onClick={() => setEditingModel(null)}>Отмена</Button>
                    <Button className="rounded-xl" onClick={handleUpdateModel}>Сохранить</Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Create product dialog */}
          {isCreating && (
            <Dialog open={isCreating} onOpenChange={(open) => !open && setIsCreating(false)}>
              <DialogContent className={`${S.dialog} max-w-2xl`}>
                <div className={S.dialogInner}>
                  <DialogHeader>
                    <DialogTitle className="text-lg font-semibold tracking-tight">Новый товар</DialogTitle>
                    <DialogDescription className="text-xs text-gray-400">Заполните данные</DialogDescription>
                  </DialogHeader>
                  {renderModelForm(createForm, setCreateForm, colorDndSensors)}
                  <DialogFooter className="pt-2">
                    <Button variant="outline" className="rounded-xl" onClick={() => setIsCreating(false)}>Отмена</Button>
                    <Button className="rounded-xl" onClick={handleCreateModel}>Создать</Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>

        {/* ====================== ЗАКАЗЫ ====================== */}
        <TabsContent value="orders" className="space-y-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground">Всего: {orders.length}</p>
              {selectedOrderIds.size > 0 && (
                <Button size="sm" variant="destructive" className="rounded-xl" onClick={handleBulkDeleteOrders}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Удалить ({selectedOrderIds.size})
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
                <SelectTrigger className={`w-[110px] sm:w-[130px] ${S.select}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value="retail">Розница</SelectItem>
                  <SelectItem value="wholesale">Опт</SelectItem>
                </SelectContent>
              </Select>
              <Select value={orderYearFilter} onValueChange={setOrderYearFilter}>
                <SelectTrigger className={`w-[90px] sm:w-[100px] ${S.select}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  {orderYears.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={orderMonthFilter} onValueChange={setOrderMonthFilter}>
                <SelectTrigger className={`w-[110px] sm:w-[130px] ${S.select}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все месяцы</SelectItem>
                  {monthNames.map((name, i) => <SelectItem key={i+1} value={String(i+1)}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={orderSort} onValueChange={(v) => setOrderSort(v as typeof orderSort)}>
                <SelectTrigger className={`w-[140px] sm:w-[170px] ${S.select}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">Дата (новые)</SelectItem>
                  <SelectItem value="date_asc">Дата (старые)</SelectItem>
                  <SelectItem value="amount_desc">Сумма (убыв.)</SelectItem>
                  <SelectItem value="amount_asc">Сумма (возр.)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} placeholder="Поиск по имени или номеру..." className={`pl-10 ${S.input}`} />
          </div>
          <Card>
            <CardContent className="pt-4 overflow-x-auto">
              {filteredOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Заказов не найдено</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"><RoundCheck checked={selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0} onChange={toggleAllOrders} /></TableHead>
                      <TableHead>№</TableHead><TableHead>Дата</TableHead><TableHead>Клиент</TableHead><TableHead>Тип</TableHead><TableHead>Источник</TableHead>
                      <TableHead>Телефон</TableHead><TableHead>Сумма</TableHead><TableHead>Позиции</TableHead>
                      <TableHead className="text-center text-blue-500 text-[10px] w-14">Подтв.</TableHead>
                      <TableHead className="text-center text-amber-500 text-[10px] w-14">Отпр.</TableHead>
                      <TableHead className="text-center text-green-500 text-[10px] w-14">Дост.</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => {
                      const isConfirmed = ["confirmed", "shipped", "completed"].includes(order.status);
                      const isShipped = ["shipped", "completed"].includes(order.status);
                      const isDelivered = order.status === "completed";
                      const rowBg = isDelivered ? "bg-green-50/50" : isShipped ? "bg-amber-50/50" : isConfirmed ? "bg-blue-50/50" : "";
                      return (
                        <TableRow key={order.id} className={`cursor-pointer ${rowBg}`} onClick={() => setSelectedOrder(order)}>
                          <TableCell><RoundCheck checked={selectedOrderIds.has(order.id)} onChange={() => toggleOrderSelect(order.id)} /></TableCell>
                          <TableCell className="font-mono text-xs">{order.order_number ? `#${order.order_number}` : order.id.slice(0, 8)}</TableCell>
                          <TableCell className="text-sm">{format(new Date(order.created_at), "dd.MM.yyyy HH:mm")}</TableCell>
                          <TableCell className="text-sm">{order.customer_name ?? "-"}</TableCell>
                          <TableCell>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${order.order_type === "wholesale" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                              {order.order_type === "wholesale" ? "Опт" : "Розн."}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">{order.source ?? "Сайт"}</TableCell>
                          <TableCell className="text-sm">{order.customer_phone ?? "-"}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(order.total_amount)}</TableCell>
                          <TableCell>
                            <div className="space-y-0.5 text-xs text-muted-foreground">
                              {(order.order_items ?? []).slice(0, 2).map((item) => (
                                <p key={item.id}>{item.catalog_models?.sku ?? "?"} / {item.size_label}: {item.quantity} шт.</p>
                              ))}
                              {(order.order_items?.length ?? 0) > 2 && <p className="text-muted-foreground/60">+{(order.order_items?.length ?? 0) - 2} ещё</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <RoundCheck checked={isConfirmed} onChange={() => handleSetOrderStatus(order, "confirmed")} accent="blue" />
                          </TableCell>
                          <TableCell className="text-center">
                            <RoundCheck checked={isShipped} onChange={() => handleSetOrderStatus(order, "shipped")} accent="orange" />
                          </TableCell>
                          <TableCell className="text-center">
                            <RoundCheck checked={isDelivered} onChange={() => handleSetOrderStatus(order, "completed")} accent="green" />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }} title="Удалить"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Order detail popup — iOS styled */}
          {selectedOrder && (
            <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
              <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-0 shadow-2xl p-0 max-w-[95vw] sm:max-w-xl md:max-w-2xl">
                <div className="px-4 sm:px-8 pb-6 sm:pb-8 pt-5 sm:pt-6 space-y-4 sm:space-y-6">
                  <DialogHeader>
                    <div className="flex items-center gap-3">
                      <DialogTitle className="text-xl font-bold">
                        Заказ {selectedOrder.order_number ? `#${selectedOrder.order_number}` : selectedOrder.id.slice(0, 8)}
                      </DialogTitle>
                      <Badge variant={statusColors[selectedOrder.status] ?? "outline"} className="text-xs">
                        {statusLabels[selectedOrder.status] ?? selectedOrder.status}
                      </Badge>
                    </div>
                    <DialogDescription className="text-sm text-gray-400">
                      {format(new Date(selectedOrder.created_at), "dd.MM.yyyy HH:mm")}
                      {(selectedOrder.status === "shipped" || selectedOrder.status === "completed") &&
                        " — Завершён"
                      }
                    </DialogDescription>
                  </DialogHeader>

                  <div className="bg-gray-50/50 rounded-2xl p-4 sm:p-5 space-y-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Клиент</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 sm:gap-y-4">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Имя</p>
                        <p className="text-sm font-semibold cursor-pointer hover:text-blue-600 transition-colors" onClick={() => copyToClipboard(selectedOrder.customer_name ?? "")} title="Нажмите чтобы скопировать">{selectedOrder.customer_name ?? "-"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Телефон</p>
                        <p className="text-sm font-semibold cursor-pointer hover:text-blue-600 transition-colors" onClick={() => copyToClipboard(selectedOrder.customer_phone ?? "")} title="Нажмите чтобы скопировать">{selectedOrder.customer_phone ?? "-"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Email</p>
                        <p className="text-sm font-semibold cursor-pointer hover:text-blue-600 transition-colors" onClick={() => copyToClipboard(selectedOrder.customer_email ?? "")} title="Нажмите чтобы скопировать">{selectedOrder.customer_email ?? "-"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Оплата</p>
                        <p className="text-sm font-semibold">{selectedOrder.payment_method === "cod" ? "Наложенный платёж" : selectedOrder.payment_method === "online" ? "Оплата на сайте" : selectedOrder.payment_method ?? "-"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50/50 rounded-2xl p-5 space-y-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Доставка</p>
                    <p className="text-sm font-medium cursor-pointer hover:text-blue-600 transition-colors" onClick={() => copyToClipboard([selectedOrder.delivery_oblast, selectedOrder.delivery_city, selectedOrder.delivery_branch].filter(Boolean).join(", "))} title="Нажмите чтобы скопировать">
                      {[selectedOrder.delivery_oblast, selectedOrder.delivery_city, selectedOrder.delivery_branch].filter(Boolean).join(", ") || "-"}
                    </p>
                    {selectedOrder.notes && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Комментарий</p>
                        <p className="text-sm text-gray-600">{selectedOrder.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50/50 rounded-2xl p-5 space-y-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Товары</p>
                    <div className="space-y-3">
                      {(selectedOrder.order_items ?? []).map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <div>
                            <span className="text-sm font-semibold">{item.catalog_models?.sku ?? "?"}</span>
                            {item.catalog_models?.name && <span className="text-xs text-gray-400 ml-2">{item.catalog_models.name}</span>}
                          </div>
                          <span className="text-sm text-gray-500">{item.size_label} x {item.quantity}</span>
                          <span className="text-sm font-bold">{formatCurrency(item.unit_price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-3 border-t-2 border-gray-200 text-right">
                      <span className="text-xl font-bold">{formatCurrency(selectedOrder.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>

        {/* ====================== РОЗНИЦА ====================== */}
        <TabsContent value="retail" className="space-y-4">
          <RetailOrdersTab models={models} />
        </TabsContent>

        {/* ====================== ОПТ ====================== */}
        <TabsContent value="wholesale" className="space-y-4">
          <WholesaleOrdersTab models={models} />
        </TabsContent>

        {/* ====================== ВЫРУЧКА ====================== */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="flex items-center gap-3">
            <Select value={revenueYear} onValueChange={setRevenueYear}>
              <SelectTrigger className={`w-[100px] ${S.select}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">За все время</SelectItem>
                {orderYears.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={revenueMonth} onValueChange={setRevenueMonth}>
              <SelectTrigger className={`w-[130px] ${S.select}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все месяцы</SelectItem>
                {monthNames.map((name, i) => <SelectItem key={i+1} value={String(i+1)}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-2xl"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Общая выручка</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(revenueData.total)}</p></CardContent></Card>
            <Card className="rounded-2xl"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Количество заказов</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{revenueData.count}</p></CardContent></Card>
            <Card className="rounded-2xl"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Средний чек</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(revenueData.avg)}</p></CardContent></Card>
          </div>

          {modelRevenue.length > 0 && (
            <Card className="rounded-2xl">
              <CardHeader><CardTitle className="text-base">Продажи по моделям</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Артикул</TableHead><TableHead>Название</TableHead><TableHead className="text-right">Продано (шт.)</TableHead><TableHead className="text-right">Выручка</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modelRevenue.map((m) => (
                      <TableRow key={m.sku}>
                        <TableCell className="font-mono text-xs">{m.sku}</TableCell>
                        <TableCell>{m.name}</TableCell>
                        <TableCell className="text-right font-medium">{m.qty}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(m.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ====================== ПОЛЬЗОВАТЕЛИ ====================== */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Всего: {filteredUsers.length}</p>
            <Select value={userSort} onValueChange={(v) => setUserSort(v as typeof userSort)}>
              <SelectTrigger className={`w-[160px] sm:w-[200px] ${S.select}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alpha">По алфавиту</SelectItem>
                <SelectItem value="orders_desc">По заказам (убыв.)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Поиск по имени или email..." className={`pl-10 ${S.input}`} />
          </div>
          <Card>
            <CardContent className="pt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Имя</TableHead><TableHead>Email</TableHead><TableHead>Телефон</TableHead>
                    <TableHead>Тип</TableHead><TableHead>Заказов</TableHead><TableHead>Регистрация</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="cursor-pointer" onClick={() => setSelectedUser(user)}>
                      <TableCell className="font-medium">{user.full_name ?? "-"}</TableCell>
                      <TableCell className="text-sm">{user.email ?? "-"}</TableCell>
                      <TableCell className="text-sm">{user.phone ?? "-"}</TableCell>
                      <TableCell><Badge variant={user.customer_type === "wholesale" ? "default" : "secondary"}>{user.customer_type === "wholesale" ? "Опт" : "Розница"}</Badge></TableCell>
                      <TableCell>{userOrderCounts[user.id] ?? 0}</TableCell>
                      <TableCell className="text-sm">{format(new Date(user.created_at), "dd.MM.yyyy")}</TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Не найдено</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* User detail popup — iOS styled */}
          {selectedUser && (
            <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
              <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-0 shadow-2xl p-0 max-w-[95vw] sm:max-w-xl md:max-w-2xl">
                <div className="px-4 sm:px-8 pb-6 sm:pb-8 pt-5 sm:pt-6 space-y-4 sm:space-y-6">
                  <DialogHeader>
                    <div className="flex items-center gap-3">
                      <DialogTitle className="text-lg sm:text-xl font-bold">
                        {selectedUser.full_name ?? "Пользователь"}
                      </DialogTitle>
                      <Badge variant={selectedUser.customer_type === "wholesale" ? "default" : "secondary"} className="text-xs">
                        {selectedUser.customer_type === "wholesale" ? "Оптовый" : "Розничный"}
                      </Badge>
                    </div>
                    <DialogDescription className="text-sm text-gray-400">Карточка пользователя</DialogDescription>
                  </DialogHeader>

                  <div className="bg-gray-50/50 rounded-2xl p-4 sm:p-5 space-y-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Контакты</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 sm:gap-y-4">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Телефон</p>
                        <p className="text-sm font-semibold cursor-pointer hover:text-blue-600 transition-colors" onClick={() => copyToClipboard(selectedUser.phone ?? "")} title="Нажмите чтобы скопировать">{selectedUser.phone ?? "-"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Email</p>
                        <p className="text-sm font-semibold cursor-pointer hover:text-blue-600 transition-colors" onClick={() => copyToClipboard(selectedUser.email ?? "")} title="Нажмите чтобы скопировать">{selectedUser.email ?? "-"}</p>
                      </div>
                    </div>
                  </div>

                  {selectedUser.customer_type === "wholesale" && (
                    <div className="bg-gray-50/50 rounded-2xl p-5 space-y-3">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Компания</p>
                      <p className="text-sm font-semibold">{selectedUser.company_name ?? "-"}</p>
                    </div>
                  )}

                  <div className="bg-gray-50/50 rounded-2xl p-4 sm:p-5 space-y-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Доставка</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 sm:gap-y-4">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Город</p>
                        <p className="text-sm font-semibold cursor-pointer hover:text-blue-600 transition-colors" onClick={() => copyToClipboard(selectedUser.delivery_city ?? "")} title="Нажмите чтобы скопировать">{selectedUser.delivery_city ?? "-"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Отделение</p>
                        <p className="text-sm font-semibold cursor-pointer hover:text-blue-600 transition-colors" onClick={() => copyToClipboard(selectedUser.delivery_branch ?? "")} title="Нажмите чтобы скопировать">{selectedUser.delivery_branch ?? "-"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50/50 rounded-2xl p-5 space-y-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Рассылка</p>
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${selectedUser.newsletter_subscribed ? "bg-green-500" : "bg-neutral-300"}`} />
                      <p className="text-sm font-medium">{selectedUser.newsletter_subscribed ? "Подписан" : "Не подписан"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50/50 rounded-2xl p-5">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">Заказов</p>
                      <p className="text-3xl font-bold">{userOrderCounts[selectedUser.id] ?? 0}</p>
                    </div>
                    <div className="bg-gray-50/50 rounded-2xl p-5">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">Регистрация</p>
                      <p className="text-lg font-semibold">{format(new Date(selectedUser.created_at), "dd.MM.yyyy")}</p>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>

        {/* ====================== ГЛАВНАЯ СТРАНИЦА ====================== */}
        <TabsContent value="homepage" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-base">Блок 1: Hero (баннер)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label className={S.label}>Заголовок</Label><Input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} placeholder="Новая весенняя коллекция" className={S.input} /></div>
              <div><Label className={S.label}>Подзаголовок</Label><Input value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} placeholder="Spring — 2026" className={S.input} /></div>
              <SingleMediaUpload value={heroBgUrl} onChange={setHeroBgUrl} label="Фоновое изображение" targetSize={{ w: 1920, h: 1080 }} />
              <p className="text-[10px] text-muted-foreground">Рекомендуемый размер: 1920×1080 px, формат JPG/PNG/WebP</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-base">Блок 3: Про компанию</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label className={S.label}>Заголовок</Label><Input value={aboutTitle} onChange={(e) => setAboutTitle(e.target.value)} placeholder="О компании DaKi" className={S.input} /></div>
              <div><Label className={S.label}>Подзаголовок</Label><Input value={aboutSubtitle} onChange={(e) => setAboutSubtitle(e.target.value)} placeholder="Наша история" className={S.input} /></div>
              <div><Label className={S.label}>Текст</Label><Textarea rows={5} value={aboutText} onChange={(e) => setAboutText(e.target.value)} placeholder="Текст о компании..." className={S.textarea} /></div>
              <SingleMediaUpload value={aboutMediaUrl} onChange={setAboutMediaUrl} label="Фото / видео" targetSize={{ w: 800, h: 1000 }} />
              <p className="text-[10px] text-muted-foreground">Рекомендуемый размер фото: 800×1000 px, видео: MP4 до 50MB</p>
            </CardContent>
          </Card>
          <Button className="rounded-xl" onClick={saveHomepage} disabled={homepageLoading}>
            {homepageLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Сохранить изменения
          </Button>
        </TabsContent>

        {/* ====================== КОНТАКТЫ ====================== */}
        <TabsContent value="contacts" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-base">Контактная информация</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className={S.label}>Телефоны</Label>
                {ctPhones.map((ph, idx) => (
                  <div key={idx} className="mt-1.5 flex items-center gap-2">
                    <PhoneInput value={ph} onChange={(v) => { const copy = [...ctPhones]; copy[idx] = v; setCtPhones(copy); }} className="flex-1" />
                    {ctPhones.length > 1 && (
                      <button type="button" onClick={() => setCtPhones(ctPhones.filter((_, i) => i !== idx))} className="text-neutral-400 hover:text-red-500 transition"><X className="h-4 w-4" /></button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setCtPhones([...ctPhones, ""])} className="mt-2 flex items-center gap-1 text-xs text-neutral-500 hover:text-black transition">
                  <Plus className="h-3.5 w-3.5" /> Добавить телефон
                </button>
              </div>
              <div><Label className={S.label}>Email</Label><Input value={ctEmail} onChange={(e) => setCtEmail(e.target.value)} placeholder="info@daki.ua" className={S.input} /></div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-base">Соцсети и мессенджеры</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label className={S.label}>Telegram</Label><Input value={ctTelegram} onChange={(e) => setCtTelegram(e.target.value)} placeholder="https://t.me/username" className={S.input} /></div>
              <div><Label className={S.label}>Instagram</Label><Input value={ctInstagram} onChange={(e) => setCtInstagram(e.target.value)} placeholder="https://instagram.com/username" className={S.input} /></div>
              <div><Label className={S.label}>TikTok</Label><Input value={ctTiktok} onChange={(e) => setCtTiktok(e.target.value)} placeholder="https://tiktok.com/@username" className={S.input} /></div>
              <div><Label className={S.label}>Viber</Label><Input value={ctViber} onChange={(e) => setCtViber(e.target.value)} placeholder="viber://chat?number=..." className={S.input} /></div>
              <div><Label className={S.label}>WhatsApp</Label><Input value={ctWhatsapp} onChange={(e) => setCtWhatsapp(e.target.value)} placeholder="https://wa.me/..." className={S.input} /></div>
            </CardContent>
          </Card>
          <Button className="rounded-xl" onClick={saveContacts} disabled={contactsLoading}>
            {contactsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Сохранить контакты
          </Button>
        </TabsContent>

        {/* ====================== РАССЫЛКА ====================== */}
        <TabsContent value="newsletter" className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-base">Рассылка уведомлений</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className={S.label}>Аудитория</Label>
                <Select value={nlAudience} onValueChange={setNlAudience}>
                  <SelectTrigger className={S.select}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newsletter">Подписчики рассылки</SelectItem>
                    <SelectItem value="all">Все пользователи</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className={S.label}>Тема письма</Label><Input value={nlSubject} onChange={(e) => setNlSubject(e.target.value)} placeholder="Тема рассылки..." className={S.input} /></div>
              <div><Label className={S.label}>Содержание (HTML)</Label><Textarea rows={10} value={nlBody} onChange={(e) => setNlBody(e.target.value)} placeholder="Текст рассылки... Можно использовать HTML-теги." className={S.textarea} /></div>
              <Button className="rounded-xl" onClick={sendNewsletter} disabled={nlSending}>{nlSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Отправить рассылку</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ================================================================== */
/*  Model edit form — iOS inspired                                     */
/* ================================================================== */

function renderModelForm(form: ModelFormData, setForm: React.Dispatch<React.SetStateAction<ModelFormData>>, colorDndSensors?: ReturnType<typeof useSensors>) {
  const update = <K extends keyof ModelFormData>(key: K, value: ModelFormData[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-5">
      {/* Row 1: SKU + Name */}
      <div className="flex gap-3">
        <div className="w-28 shrink-0">
          <Label className={S.label}>Артикул</Label>
          <Input value={form.sku} onChange={(e) => update("sku", e.target.value)} className={`${S.input} font-mono`} />
        </div>
        <div className="flex-1">
          <Label className={S.label}>Название</Label>
          <Input value={form.name} onChange={(e) => update("name", e.target.value)} className={S.input} />
        </div>
      </div>

      {/* Row 2: Category + Season */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={S.label}>Категория</Label>
          <Select value={form.category} onValueChange={(v) => update("category", v)}>
            <SelectTrigger className={S.select}><SelectValue /></SelectTrigger>
            <SelectContent>{CATALOG_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className={S.label}>Сезон</Label>
          <Select value={form.season} onValueChange={(v) => update("season", v)}>
            <SelectTrigger className={S.select}><SelectValue /></SelectTrigger>
            <SelectContent>{MODEL_SEASONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 3: Price + Discount + Wholesale */}
      <div className="grid grid-cols-4 gap-3">
        <div>
          <Label className={S.label}>Цена (UAH)</Label>
          <Input type="number" value={form.base_price} onChange={(e) => update("base_price", e.target.value)} onFocus={(e) => { if (e.target.value === "0") update("base_price", ""); }} className={S.input} />
        </div>
        <div>
          <Label className={S.label}>Скидка %</Label>
          <Input type="number" value={form.discount_percent} onChange={(e) => update("discount_percent", e.target.value)} onFocus={(e) => { if (e.target.value === "0") update("discount_percent", ""); }} className={S.input} />
        </div>
        <div>
          <Label className={S.label}>Опт цена (UAH)</Label>
          <Input type="number" value={form.wholesale_price} onChange={(e) => update("wholesale_price", e.target.value)} onFocus={(e) => { if (e.target.value === "0") update("wholesale_price", ""); }} className={S.input} />
        </div>
        <div>
          <Label className={S.label}>Мін. замовлення (шт)</Label>
          <Input type="number" value={form.min_wholesale_qty} onChange={(e) => update("min_wholesale_qty", e.target.value)} onFocus={(e) => { if (e.target.value === "1") update("min_wholesale_qty", ""); }} className={S.input} />
        </div>
      </div>

      <div className={S.divider} />

      {/* Size selector */}
      <div>
        <p className={`${S.label} mb-2`}>Розміри моделі</p>
        <div className="flex flex-wrap gap-2">
          {ALL_SIZES.map((sz) => {
            const on = form.selected_sizes.includes(sz);
            return (
              <button
                key={sz}
                type="button"
                onClick={() => {
                  const next = on ? form.selected_sizes.filter((s) => s !== sz) : [...form.selected_sizes, sz].sort((a, b) => Number(a) - Number(b));
                  update("selected_sizes", next);
                  // Auto-update size_chart
                  const newChart = next.map((s) => {
                    const existing = form.size_chart.find((r) => r.size === s);
                    return existing ?? { size: s, chest: "", waist: "", hips: "", available: "" };
                  });
                  update("size_chart", newChart.length ? newChart : [{ size: "", chest: "", waist: "", hips: "", available: "" }]);
                }}
                className={`h-10 w-12 rounded-lg border-2 text-sm font-semibold transition-all ${on ? "border-black bg-black text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"}`}
              >
                {sz}
              </button>
            );
          })}
        </div>
      </div>

      <div className={S.divider} />

      {/* Color variants (photos + color + stock per size) */}
      <div>
        <p className={`${S.label} mb-3`}>Варианты цветов</p>
        <DndContext
          sensors={colorDndSensors}
          collisionDetection={closestCenter}
          onDragEnd={(event: DragEndEvent) => {
            const { active, over } = event;
            if (over && active.id !== over.id) {
              const oldIndex = form.color_variants.findIndex((_, i) => `cv-${i}` === active.id);
              const newIndex = form.color_variants.findIndex((_, i) => `cv-${i}` === over.id);
              if (oldIndex !== -1 && newIndex !== -1) {
                update("color_variants", arrayMove(form.color_variants, oldIndex, newIndex));
              }
            }
          }}
        >
          <SortableContext items={form.color_variants.map((_, i) => `cv-${i}`)} strategy={rectSortingStrategy}>
            <div className="space-y-4">
              {form.color_variants.map((variant, i) => (
                <SortableColorVariant key={`cv-${i}`} id={`cv-${i}`}>
                  <div className="flex items-center gap-2">
                    <Input value={variant.name} onChange={(e) => { const c = [...form.color_variants]; c[i] = { ...c[i], name: e.target.value }; update("color_variants", c); }} placeholder="Название цвета" className={`flex-1 ${S.input}`} />
                    <input type="color" value={variant.hex} onChange={(e) => { const c = [...form.color_variants]; c[i] = { ...c[i], hex: e.target.value }; update("color_variants", c); }} className="h-9 w-9 rounded-xl cursor-pointer appearance-none border-0 p-0" />
                    <Input value={variant.hex} onChange={(e) => { const c = [...form.color_variants]; c[i] = { ...c[i], hex: e.target.value }; update("color_variants", c); }} className={`w-24 ${S.input} font-mono text-xs`} />
                    {form.color_variants.length > 1 && (
                      <button type="button" onClick={() => update("color_variants", form.color_variants.filter((_, j) => j !== i))} className={S.deleteBtn}><X className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                  <PhotoUploadGrid urls={variant.image_urls} onChange={(urls) => { const c = [...form.color_variants]; c[i] = { ...c[i], image_urls: urls }; update("color_variants", c); }} targetSize={{ w: 900, h: 1200 }} />
                  {/* Stock per size for this color */}
                  {form.selected_sizes.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[10px] text-gray-400 mb-1">Кількість по розмірах</p>
                      <div className="flex flex-wrap gap-2">
                        {form.selected_sizes.map((sz) => (
                          <div key={sz} className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px] font-medium text-gray-500">{sz}</span>
                            <Input
                              type="number"
                              min={0}
                              value={variant.stock_per_size[sz] ?? ""}
                              onChange={(e) => {
                                const c = [...form.color_variants];
                                c[i] = { ...c[i], stock_per_size: { ...c[i].stock_per_size, [sz]: Number(e.target.value) || 0 } };
                                update("color_variants", c);
                              }}
                              onFocus={(e) => { if (e.target.value === "0") e.target.value = ""; }}
                              className={`w-14 h-8 text-xs text-center ${S.input}`}
                              placeholder="0"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </SortableColorVariant>
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <button type="button" onClick={() => update("color_variants", [...form.color_variants, { name: "", hex: "#000000", image_urls: [], stock_per_size: {} }])} className={`w-full py-2.5 mt-4 ${S.addBtn} flex items-center justify-center gap-1.5`}>
          <Plus className="h-3.5 w-3.5" /> Добавить вариант цвета
        </button>
      </div>

      <div className={S.divider} />

      {/* Description */}
      <div>
        <Label className={S.label}>Описание (HTML)</Label>
        <Textarea rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="HTML-описание товара..." className={S.textarea} />
      </div>

      {/* Care */}
      <div className="space-y-3">
        <div>
          <Label className={S.label}>Склад и уход (HTML)</Label>
          <Textarea rows={2} value={form.care_instructions} onChange={(e) => update("care_instructions", e.target.value)} placeholder="Состав и уход..." className={S.textarea} />
        </div>
        <SingleMediaUpload value={form.care_media_url} onChange={(v) => update("care_media_url", v)} label="Медиа — склад и уход" targetSize={{ w: 800, h: 600 }} />
        <p className="text-[10px] text-gray-400">Рекомендуемое соотношение: 4:3 (800×600 px)</p>
      </div>

      {/* Delivery */}
      <div className="space-y-3">
        <div>
          <Label className={S.label}>Правила доставки (HTML)</Label>
          <Textarea rows={2} value={form.delivery_info} onChange={(e) => update("delivery_info", e.target.value)} placeholder="Правила доставки..." className={S.textarea} />
        </div>
        <SingleMediaUpload value={form.delivery_media_url} onChange={(v) => update("delivery_media_url", v)} label="Медиа — доставка" targetSize={{ w: 800, h: 600 }} />
        <p className="text-[10px] text-gray-400">Рекомендуемое соотношение: 4:3 (800×600 px)</p>
      </div>

      {/* Return */}
      <div>
        <Label className={S.label}>Правила возврата (HTML)</Label>
        <Textarea rows={2} value={form.return_info} onChange={(e) => update("return_info", e.target.value)} placeholder="Правила возврата..." className={S.textarea} />
      </div>

      <div className={S.divider} />

      {/* Size chart table — auto-generated from selected sizes */}
      {form.selected_sizes.length > 0 && (
        <div>
          <p className={`${S.label} mb-2`}>Таблиця розмірів</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="px-2 py-2 text-left text-[10px] text-gray-400 uppercase font-semibold">Розмір</th>
                  <th className="px-2 py-2 text-left text-[10px] text-gray-400 uppercase font-semibold">Груди</th>
                  <th className="px-2 py-2 text-left text-[10px] text-gray-400 uppercase font-semibold">Талія</th>
                  <th className="px-2 py-2 text-left text-[10px] text-gray-400 uppercase font-semibold">Стегна</th>
                  <th className="px-2 py-2 text-left text-[10px] text-gray-400 uppercase font-semibold">Залишок</th>
                </tr>
              </thead>
              <tbody>
                {form.size_chart.filter((r) => form.selected_sizes.includes(r.size)).map((row, i) => {
                  const totalForSize = form.color_variants.reduce((sum, cv) => sum + (cv.stock_per_size[row.size] || 0), 0);
                  return (
                    <tr key={row.size} className="border-t border-gray-100">
                      <td className="px-2 py-1.5 font-medium text-xs">{row.size}</td>
                      {(["chest", "waist", "hips"] as const).map((f) => (
                        <td key={f} className="px-1 py-1">
                          <Input value={row[f]} onChange={(e) => {
                            const chartIdx = form.size_chart.findIndex((r2) => r2.size === row.size);
                            if (chartIdx === -1) return;
                            const c = [...form.size_chart]; c[chartIdx] = { ...c[chartIdx], [f]: e.target.value }; update("size_chart", c);
                          }} className={`h-8 text-xs ${S.input}`} />
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-xs font-semibold text-center">{totalForSize}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
