"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Loader2 } from "lucide-react";

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
  { label: "Авто", value: 0 },
];

export function ImageCropper({ imageSrc, aspect: defaultAspect = 3 / 4, onCropDone, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [aspect, setAspect] = useState(defaultAspect);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, px: Area) => setCroppedAreaPixels(px), []);

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

  // Lock body scroll while cropper is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const content = (
    <>
      {/* CSS for iOS-native crop styling */}
      <style>{`
        .ios-crop .reactEasyCrop_Container { background: #000 !important; }
        .ios-crop .reactEasyCrop_CropArea {
          border: none !important;
          box-shadow: 0 0 0 9999px rgba(0,0,0,0.6) !important;
          color: transparent !important;
        }
        .ios-crop .reactEasyCrop_CropAreaGrid::before,
        .ios-crop .reactEasyCrop_CropAreaGrid::after {
          border-color: rgba(255,255,255,0.25) !important;
        }
        /* iOS-style corner handles */
        .crop-corners { pointer-events: none; position: absolute; inset: 0; }
        .crop-corners::before, .crop-corners::after,
        .crop-corners span::before, .crop-corners span::after {
          content: '';
          position: absolute;
          background: #fff;
        }
        /* Top-left */
        .crop-corners::before { top: -1px; left: -1px; width: 20px; height: 3px; }
        .crop-corners::after { top: -1px; left: -1px; width: 3px; height: 20px; }
        /* Top-right */
        .crop-corners span:nth-child(1)::before { top: -1px; right: -1px; width: 20px; height: 3px; }
        .crop-corners span:nth-child(1)::after { top: -1px; right: -1px; width: 3px; height: 20px; }
        /* Bottom-left */
        .crop-corners span:nth-child(2)::before { bottom: -1px; left: -1px; width: 20px; height: 3px; }
        .crop-corners span:nth-child(2)::after { bottom: -1px; left: -1px; width: 3px; height: 20px; }
        /* Bottom-right */
        .crop-corners span:nth-child(3)::before { bottom: -1px; right: -1px; width: 20px; height: 3px; }
        .crop-corners span:nth-child(3)::after { bottom: -1px; right: -1px; width: 3px; height: 20px; }

        /* iOS native slider */
        .ios-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 32px; background: transparent; cursor: pointer; }
        .ios-slider::-webkit-slider-runnable-track { height: 2px; background: rgba(255,255,255,0.2); border-radius: 1px; }
        .ios-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 28px; height: 28px; border-radius: 50%;
          background: #fff;
          box-shadow: 0 0.5px 4px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(0,0,0,0.08);
          margin-top: -13px;
        }
        .ios-slider::-moz-range-track { height: 2px; background: rgba(255,255,255,0.2); border: none; border-radius: 1px; }
        .ios-slider::-moz-range-thumb {
          width: 28px; height: 28px; border-radius: 50%; border: none;
          background: #fff;
          box-shadow: 0 0.5px 4px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(0,0,0,0.08);
        }
        .ios-slider::-moz-range-progress { height: 2px; background: #fff; border-radius: 1px; }
      `}</style>

      <div
        className="fixed inset-0 z-[100] flex flex-col"
        style={{ background: "#000", fontFamily: "-apple-system, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif" }}
      >
        {/* ─── Top bar ─── */}
        <div className="flex items-center justify-between px-4 h-[52px] flex-shrink-0" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
          <button
            onClick={onCancel}
            className="text-[17px] active:opacity-40 transition-opacity"
            style={{ color: "#0a84ff", fontWeight: 400 }}
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-[17px] active:opacity-40 transition-opacity disabled:opacity-30 flex items-center gap-1.5"
            style={{ color: "#0a84ff", fontWeight: 600 }}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "..." : "Готово"}
          </button>
        </div>

        {/* ─── Crop area ─── */}
        <div className="relative flex-1 min-h-0 ios-crop">
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
            objectFit="vertical-cover"
            style={{
              containerStyle: { background: "#000" },
              cropAreaStyle: {
                border: "none",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
              },
            }}
          />
        </div>

        {/* ─── Bottom toolbar ─── */}
        <div
          className="flex-shrink-0"
          style={{
            background: "rgba(28,28,30,0.92)",
            backdropFilter: "saturate(180%) blur(20px)",
            WebkitBackdropFilter: "saturate(180%) blur(20px)",
            paddingBottom: "env(safe-area-inset-bottom, 8px)",
          }}
        >
          {/* Zoom */}
          <div className="flex items-center gap-4 px-5 py-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(152,152,159,1)" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
              <circle cx="10.5" cy="10.5" r="7" /><path d="M21 21l-4.5-4.5" /><path d="M7.5 10.5h6" />
            </svg>
            <input
              type="range"
              min={1}
              max={3}
              step={0.005}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="ios-slider flex-1"
            />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(152,152,159,1)" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
              <circle cx="10.5" cy="10.5" r="7" /><path d="M21 21l-4.5-4.5" /><path d="M7.5 10.5h6" /><path d="M10.5 7.5v6" />
            </svg>
          </div>

          {/* Separator */}
          <div className="mx-4" style={{ height: "0.33px", background: "rgba(84,84,88,0.65)" }} />

          {/* Aspect + Rotate */}
          <div className="flex items-center justify-between px-4 py-2.5">
            {/* iOS Segmented Control */}
            <div className="flex p-0.5 rounded-[8px]" style={{ background: "rgba(118,118,128,0.24)" }}>
              {ASPECTS.map((a) => {
                const on = aspect === a.value;
                return (
                  <button
                    key={a.label}
                    onClick={() => setAspect(a.value)}
                    className="relative rounded-[7px] transition-all duration-200"
                    style={{
                      padding: "5px 14px",
                      fontSize: "13px",
                      fontWeight: on ? 600 : 400,
                      color: on ? "#fff" : "rgba(152,152,159,1)",
                      background: on ? "rgba(99,99,102,1)" : "transparent",
                      boxShadow: on ? "0 1px 4px rgba(0,0,0,0.3), 0 0 0.5px rgba(0,0,0,0.2)" : "none",
                    }}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>

            {/* Rotate */}
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="flex items-center justify-center rounded-full active:opacity-50 transition-opacity"
              style={{ width: 36, height: 36, background: "rgba(118,118,128,0.24)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(152,152,159,1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6" /><path d="M21 8A9 9 0 1 0 6.343 6.343L3 3" style={{ display: "none" }} /><path d="M3 12a9 9 0 0 0 15.364 6.364L21 8" style={{ display: "none" }} />
                <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 0 0 17.13-4.36" style={{ display: "none" }} />
                <path d="M23 4l-6 6" style={{ display: "none" }} />
                <path d="M21 12a9 9 0 1 1-2.636-6.364L21 8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // Render via Portal to escape any overflow:hidden/scroll containers
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
