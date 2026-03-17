"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { X, ZoomIn, ZoomOut, RotateCw, Check, Crop, Maximize2, Loader2 } from "lucide-react";

interface ImageCropperProps {
  imageSrc: string;
  aspect?: number;
  onCropDone: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

const ASPECT_OPTIONS = [
  { label: "3:4", value: 3 / 4, icon: null },
  { label: "1:1", value: 1, icon: null },
  { label: "4:3", value: 4 / 3, icon: null },
  { label: "16:9", value: 16 / 9, icon: null },
  { label: "Свободно", value: 0, icon: Maximize2 },
];

export function ImageCropper({ imageSrc, aspect: defaultAspect = 3 / 4, onCropDone, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [aspect, setAspect] = useState(defaultAspect);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      onCropDone(blob);
    } catch {
      const res = await fetch(imageSrc);
      const blob = await res.blob();
      onCropDone(blob);
    } finally {
      setSaving(false);
    }
  };

  const zoomPercent = Math.round((zoom - 1) * 50);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal card */}
      <div className="relative flex flex-col w-[min(94vw,640px)] max-h-[92vh] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100">
          <button
            onClick={onCancel}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-all"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>

          <div className="flex items-center gap-2">
            <Crop className="h-4 w-4 text-neutral-400" strokeWidth={1.5} />
            <span className="text-sm font-medium tracking-wide text-neutral-800">Кадрирование</span>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 bg-neutral-900 text-white pl-4 pr-5 py-2 rounded-xl text-xs font-medium uppercase tracking-wider hover:bg-neutral-800 transition-all disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" strokeWidth={2} />
            )}
            {saving ? "Обработка" : "Готово"}
          </button>
        </div>

        {/* Cropper area */}
        <div className="relative w-full" style={{ height: "min(60vh, 460px)" }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect || undefined}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid
            classes={{
              containerClassName: "!bg-neutral-950",
              cropAreaClassName: "!border-2 !border-white/40 !rounded-lg",
            }}
            style={{
              mediaStyle: { transition: "transform 0.1s ease-out" },
            }}
          />

          {/* Zoom indicator pill */}
          {zoom > 1.02 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium px-3 py-1 rounded-full pointer-events-none">
              {zoomPercent}%
            </div>
          )}
        </div>

        {/* Controls panel */}
        <div className="px-5 py-4 bg-neutral-50/80 border-t border-neutral-100 space-y-4">

          {/* Zoom slider */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setZoom(Math.max(1, zoom - 0.1))}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 transition-all shadow-sm"
            >
              <ZoomOut className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>

            <div className="flex-1 relative">
              <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-neutral-900 rounded-full transition-all duration-100"
                  style={{ width: `${((zoom - 1) / 2) * 100}%` }}
                />
              </div>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            <button
              onClick={() => setZoom(Math.min(3, zoom + 0.1))}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 transition-all shadow-sm"
            >
              <ZoomIn className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Aspect ratio + rotation */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5 bg-white rounded-xl border border-neutral-200 p-1 shadow-sm">
              {ASPECT_OPTIONS.map((opt) => {
                const isActive = aspect === opt.value;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.label}
                    onClick={() => setAspect(opt.value)}
                    className={`relative px-3 py-1.5 rounded-lg text-[11px] font-medium tracking-wide transition-all ${
                      isActive
                        ? "bg-neutral-900 text-white shadow-sm"
                        : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                    }`}
                  >
                    {Icon ? <Icon className="h-3.5 w-3.5" strokeWidth={1.5} /> : opt.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 transition-all shadow-sm text-[11px] font-medium"
            >
              <RotateCw className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="tracking-wide">90°</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Creates a cropped image blob from the source image using canvas.
 */
async function getCroppedImg(imageSrc: string, pixelCrop: Area, rotation = 0): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));

  const bBoxWidth = image.width * cos + image.height * sin;
  const bBoxHeight = image.width * sin + image.height * cos;

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.putImageData(data, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      0.92,
    );
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (e) => reject(e));
    img.crossOrigin = "anonymous";
    img.src = url;
  });
}
