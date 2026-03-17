"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { RotateCw, Maximize2, Loader2 } from "lucide-react";

interface ImageCropperProps {
  imageSrc: string;
  aspect?: number;
  onCropDone: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

const ASPECT_OPTIONS = [
  { label: "3:4", value: 3 / 4 },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
  { label: "free", value: 0 },
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

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#1c1c1e]" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', system-ui, sans-serif" }}>

      {/* ── iOS-style navigation bar ── */}
      <div className="relative flex items-center justify-between h-11 px-4 bg-[#1c1c1e]">
        <button
          onClick={onCancel}
          className="text-[#0a84ff] text-[17px] font-normal active:opacity-50 transition-opacity"
        >
          Отмена
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="text-[#0a84ff] text-[17px] font-semibold active:opacity-50 transition-opacity disabled:opacity-30 flex items-center gap-1.5"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Сохранение..." : "Готово"}
        </button>
      </div>

      {/* ── Cropper canvas ── */}
      <div className="relative flex-1 min-h-0">
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
            containerClassName: "!bg-[#000000]",
          }}
          style={{
            cropAreaStyle: {
              border: "none",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            },
            mediaStyle: {
              transition: "transform 0.08s ease-out",
            },
          }}
        />
      </div>

      {/* ── Bottom controls panel ── */}
      <div className="bg-[#1c1c1e] pb-[env(safe-area-inset-bottom,0px)]">

        {/* Zoom slider — iOS style thin track */}
        <div className="flex items-center gap-4 px-6 py-3">
          <svg className="w-4 h-4 text-[#98989f] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /><path d="M8 11h6" />
          </svg>

          <div className="flex-1 relative h-8 flex items-center">
            {/* Track */}
            <div className="absolute inset-x-0 h-[2px] bg-[#38383a] rounded-full" />
            {/* Active track */}
            <div
              className="absolute left-0 h-[2px] bg-white rounded-full transition-all duration-75"
              style={{ width: `${((zoom - 1) / 2) * 100}%` }}
            />
            {/* Thumb */}
            <div
              className="absolute w-[28px] h-[28px] rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.4)] -translate-x-1/2 transition-all duration-75 pointer-events-none"
              style={{ left: `${((zoom - 1) / 2) * 100}%` }}
            />
            <input
              type="range"
              min={1}
              max={3}
              step={0.005}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          <svg className="w-4 h-4 text-[#98989f] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /><path d="M8 11h6" /><path d="M11 8v6" />
          </svg>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#38383a] mx-4" />

        {/* Aspect ratio segmented control + rotate */}
        <div className="flex items-center justify-between px-4 py-3">

          {/* iOS segmented control */}
          <div className="flex bg-[#38383a] rounded-[9px] p-[2px]">
            {ASPECT_OPTIONS.map((opt) => {
              const isActive = aspect === opt.value;
              return (
                <button
                  key={opt.label}
                  onClick={() => setAspect(opt.value)}
                  className={`relative px-3.5 py-[6px] rounded-[7px] text-[13px] font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[#636366] text-white shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
                      : "text-[#98989f] active:text-white"
                  }`}
                >
                  {opt.value === 0 ? (
                    <Maximize2 className="h-3.5 w-3.5" strokeWidth={2} />
                  ) : (
                    opt.label
                  )}
                </button>
              );
            })}
          </div>

          {/* Rotate */}
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-[#38383a] text-[#98989f] active:bg-[#48484a] active:text-white transition-all"
          >
            <RotateCw className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Canvas crop helper ── */

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
