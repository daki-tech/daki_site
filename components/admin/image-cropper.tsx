"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { X, RotateCw, Maximize2, Loader2, ZoomIn, ZoomOut } from "lucide-react";

interface ImageCropperProps {
  imageSrc: string;
  aspect?: number;
  onCropDone: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

const ASPECTS = [
  { label: "3:4", value: 3 / 4 },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
];

export function ImageCropper({ imageSrc, aspect: defaultAspect = 3 / 4, onCropDone, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [aspect, setAspect] = useState(defaultAspect);
  const [freeAspect, setFreeAspect] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const onCropComplete = useCallback((_: Area, px: Area) => setCroppedAreaPixels(px), []);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Load image to get natural dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = imageSrc;
  }, [imageSrc]);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      onCropDone(blob);
    } catch {
      const res = await fetch(imageSrc);
      onCropDone(await res.blob());
    } finally {
      setSaving(false);
    }
  };

  const selectAspect = (val: number) => {
    setAspect(val);
    setFreeAspect(false);
  };

  const toggleFree = () => {
    setFreeAspect(!freeAspect);
  };

  // Compute crop area dimensions that adapt to image
  const maxCropW = Math.min(680, typeof window !== "undefined" ? window.innerWidth - 64 : 680);
  const maxCropH = typeof window !== "undefined" ? window.innerHeight - 260 : 500;

  let cropBoxW = maxCropW;
  let cropBoxH = maxCropH;

  if (imgSize.w && imgSize.h) {
    const imgRatio = imgSize.w / imgSize.h;
    if (imgRatio > maxCropW / maxCropH) {
      cropBoxW = maxCropW;
      cropBoxH = Math.round(maxCropW / imgRatio);
    } else {
      cropBoxH = maxCropH;
      cropBoxW = Math.round(maxCropH * imgRatio);
    }
    // Ensure minimums
    cropBoxW = Math.max(cropBoxW, 300);
    cropBoxH = Math.max(cropBoxH, 250);
  }

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
    >
      {/* White modal */}
      <div
        ref={containerRef}
        className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ width: cropBoxW + 32, maxWidth: "calc(100vw - 32px)", maxHeight: "calc(100vh - 32px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-neutral-100 flex-shrink-0">
          <button
            onClick={onCancel}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-800 transition-all"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <span className="text-[15px] font-semibold text-neutral-900">Редактирование фото</span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-8 px-5 rounded-full bg-neutral-900 text-white text-[13px] font-semibold hover:bg-neutral-800 active:bg-neutral-700 transition-all disabled:opacity-40 flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {saving ? "Сохраняю..." : "Сохранить"}
          </button>
        </div>

        {/* Crop area */}
        <div
          className="relative bg-neutral-100 flex-shrink-0"
          style={{ width: "100%", height: cropBoxH }}
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={freeAspect ? undefined : aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid
            style={{
              containerStyle: { background: "#f5f5f5", borderRadius: 0 },
              cropAreaStyle: {
                border: "2px solid rgba(0,0,0,0.15)",
                borderRadius: "8px",
                boxShadow: "0 0 0 9999px rgba(245,245,245,0.75)",
              },
            }}
          />
        </div>

        {/* Controls */}
        <div className="px-5 py-4 flex flex-col gap-3.5 flex-shrink-0 border-t border-neutral-100">

          {/* Zoom */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setZoom(Math.max(1, zoom - 0.15))}
              className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:border-neutral-300 transition-all"
            >
              <ZoomOut className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <div className="flex-1 relative h-8 flex items-center">
              <div className="absolute inset-x-0 h-[3px] bg-neutral-200 rounded-full" />
              <div
                className="absolute left-0 h-[3px] bg-neutral-900 rounded-full transition-all duration-100"
                style={{ width: `${((zoom - 1) / 2) * 100}%` }}
              />
              <div
                className="absolute w-5 h-5 rounded-full bg-white border-2 border-neutral-900 -translate-x-1/2 transition-all duration-100 shadow-sm pointer-events-none"
                style={{ left: `${((zoom - 1) / 2) * 100}%` }}
              />
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
              onClick={() => setZoom(Math.min(3, zoom + 0.15))}
              className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:border-neutral-300 transition-all"
            >
              <ZoomIn className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          {/* Aspect ratio + rotate */}
          <div className="flex items-center justify-between">
            <div className="flex items-center bg-neutral-100 rounded-xl p-0.5 gap-0.5">
              {ASPECTS.map((a) => {
                const on = !freeAspect && aspect === a.value;
                return (
                  <button
                    key={a.label}
                    onClick={() => selectAspect(a.value)}
                    className={`px-3 py-1.5 rounded-[10px] text-[12px] font-semibold transition-all ${
                      on
                        ? "bg-white text-neutral-900 shadow-sm"
                        : "text-neutral-400 hover:text-neutral-700"
                    }`}
                  >
                    {a.label}
                  </button>
                );
              })}
              <button
                onClick={toggleFree}
                className={`px-2.5 py-1.5 rounded-[10px] transition-all ${
                  freeAspect
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-400 hover:text-neutral-700"
                }`}
              >
                <Maximize2 className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>

            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="w-9 h-9 rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50 transition-all"
            >
              <RotateCw className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

/* ── Canvas crop ── */

async function getCroppedImg(src: string, crop: Area, rotation = 0): Promise<Blob> {
  const img = await loadImage(src);
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const bW = img.width * cos + img.height * sin;
  const bH = img.width * sin + img.height * cos;
  c.width = bW; c.height = bH;
  ctx.translate(bW / 2, bH / 2);
  ctx.rotate(rad);
  ctx.translate(-img.width / 2, -img.height / 2);
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(crop.x, crop.y, crop.width, crop.height);
  c.width = crop.width; c.height = crop.height;
  ctx.putImageData(d, 0, 0);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej()), "image/jpeg", 0.92));
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image(); i.crossOrigin = "anonymous";
    i.onload = () => res(i); i.onerror = rej; i.src = url;
  });
}
