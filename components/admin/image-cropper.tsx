"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { X, Loader2, ZoomIn, ZoomOut } from "lucide-react";

interface ImageCropperProps {
  imageSrc: string;
  onCropDone: (croppedBlob: Blob) => void;
  onCancel: () => void;
  /** Target aspect ratio width/height (e.g. {w:1920, h:1080} for 16:9) */
  targetSize?: { w: number; h: number };
}

export function ImageCropper({ imageSrc, onCropDone, onCancel, targetSize }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);

  const onCropComplete = useCallback((_: Area, px: Area) => setCroppedAreaPixels(px), []);

  // Load image dimensions to size the crop area
  useEffect(() => {
    const img = new Image();
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = imageSrc;
  }, [imageSrc]);

  // Create portal container on mount, remove on unmount
  useEffect(() => {
    const el = document.createElement("div");
    el.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:999999;pointer-events:auto;";
    document.body.appendChild(el);
    portalRef.current = el;
    setMounted(true);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prev;
      document.body.removeChild(el);
    };
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropDone(blob);
    } catch {
      const res = await fetch(imageSrc);
      onCropDone(await res.blob());
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || !portalRef.current || !imgSize) return null;

  // Use target aspect ratio if provided, otherwise use image's natural aspect
  const cropAspect = targetSize ? targetSize.w / targetSize.h : imgSize.w / imgSize.h;

  // Compute crop area dimensions fitting within max bounds
  const maxW = 580;
  const maxH = Math.min(480, window.innerHeight - 160);
  let cropW = maxW;
  let cropH = maxW / cropAspect;
  if (cropH > maxH) {
    cropH = maxH;
    cropW = maxH * cropAspect;
  }

  return createPortal(
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onCancel();
      }}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      {/* White card — adapts to target aspect */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          width: cropW,
          maxWidth: "100%",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          overflow: "hidden",
          pointerEvents: "auto",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", borderBottom: "1px solid #f0f0f0", flexShrink: 0,
        }}>
          <button type="button" onClick={onCancel} style={closeBtnStyle}>
            <X size={20} strokeWidth={1.5} />
          </button>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#111", userSelect: "none" }}>
            Редагування
          </span>
          <button type="button" onClick={handleSave} disabled={saving} style={{ ...saveBtnStyle, opacity: saving ? 0.4 : 1 }}>
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "Зберігаю..." : "Зберегти"}
          </button>
        </div>

        {/* Crop area — uses target aspect ratio */}
        <div style={{ position: "relative", width: "100%", height: cropH, background: "#e5e5e5", flexShrink: 0 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={cropAspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid={false}
            objectFit="contain"
            style={{
              containerStyle: { width: "100%", height: "100%", position: "absolute", top: 0, left: 0 },
            }}
          />
        </div>

        {/* Controls — only zoom */}
        <div style={{ padding: "14px 16px", borderTop: "1px solid #f0f0f0", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" onClick={() => setZoom((z) => Math.max(1, z - 0.15))} style={circBtnStyle}>
              <ZoomOut size={16} strokeWidth={1.5} />
            </button>
            <input
              type="range" min={1} max={3} step={0.01} value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ flex: 1, accentColor: "#111" }}
            />
            <button type="button" onClick={() => setZoom((z) => Math.min(3, z + 0.15))} style={circBtnStyle}>
              <ZoomIn size={16} strokeWidth={1.5} />
            </button>
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: "#aaa", userSelect: "none" }}>
            Перетягуйте фото для позиціонування
          </div>
        </div>
      </div>
    </div>,
    portalRef.current,
  );
}

/* ── Styles ── */

const closeBtnStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: "50%", border: "none",
  background: "transparent", cursor: "pointer", display: "flex",
  alignItems: "center", justifyContent: "center", color: "#999",
};

const saveBtnStyle: React.CSSProperties = {
  height: 36, padding: "0 20px", borderRadius: 18, border: "none",
  background: "#111", color: "#fff", fontSize: 13, fontWeight: 600,
  cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
};

const circBtnStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: "50%", border: "1px solid #e5e5e5",
  background: "#fff", cursor: "pointer", display: "flex", alignItems: "center",
  justifyContent: "center", color: "#999", flexShrink: 0,
};

/* ── Canvas crop ── */

async function getCroppedImg(src: string, crop: Area): Promise<Blob> {
  const img = await loadImage(src);
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  c.width = crop.width;
  c.height = crop.height;
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej()), "image/jpeg", 0.92));
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image(); i.crossOrigin = "anonymous";
    i.onload = () => res(i); i.onerror = rej; i.src = url;
  });
}
