"use client";

import { useState, useCallback, useEffect } from "react";
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

  const onCropComplete = useCallback((_: Area, px: Area) => setCroppedAreaPixels(px), []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

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

  const content = (
    <div className="fixed inset-0 z-[9999]" style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
      {/* Center modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl flex flex-col pointer-events-auto"
          style={{ width: 600, maxWidth: "100%", maxHeight: "100%" }}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 flex-shrink-0">
            <button
              onClick={onCancel}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-100 text-neutral-400 hover:text-neutral-800 transition-colors"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <span className="text-[15px] font-semibold text-neutral-900 select-none">Редактирование</span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-9 px-5 rounded-full bg-neutral-900 text-white text-[13px] font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? "Сохраняю..." : "Сохранить"}
            </button>
          </div>

          {/* ── Crop area ── */}
          <div className="relative flex-1 min-h-0" style={{ height: 420 }}>
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
                containerStyle: {
                  background: "#f5f5f5",
                },
                cropAreaStyle: {
                  border: "2px solid rgba(255,255,255,0.8)",
                  borderRadius: 6,
                },
              }}
            />
          </div>

          {/* ── Controls ── */}
          <div className="px-4 py-3.5 border-t border-neutral-100 flex flex-col gap-3 flex-shrink-0">

            {/* Zoom */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setZoom((z) => Math.max(1, z - 0.15))}
                className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:border-neutral-300 transition-colors flex-shrink-0"
              >
                <ZoomOut className="h-4 w-4" strokeWidth={1.5} />
              </button>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-neutral-900
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-neutral-900 [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-neutral-900 [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-solid"
              />
              <button
                onClick={() => setZoom((z) => Math.min(3, z + 0.15))}
                className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:border-neutral-300 transition-colors flex-shrink-0"
              >
                <ZoomIn className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Aspect + rotate */}
            <div className="flex items-center justify-between">
              <div className="flex bg-neutral-100 rounded-xl p-0.5 gap-0.5">
                {ASPECTS.map((a) => {
                  const on = !freeAspect && aspect === a.value;
                  return (
                    <button
                      key={a.label}
                      onClick={() => { setAspect(a.value); setFreeAspect(false); }}
                      className={`px-3 py-1.5 rounded-[10px] text-[12px] font-semibold transition-all ${
                        on ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                      }`}
                    >
                      {a.label}
                    </button>
                  );
                })}
                <button
                  onClick={() => setFreeAspect((f) => !f)}
                  className={`px-2.5 py-1.5 rounded-[10px] transition-all ${
                    freeAspect ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                  }`}
                >
                  <Maximize2 className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>

              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="w-9 h-9 rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
              >
                <RotateCw className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
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
