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
  const [mounted, setMounted] = useState(false);
  const portalRef = useRef<HTMLDivElement | null>(null);

  const onCropComplete = useCallback((_: Area, px: Area) => setCroppedAreaPixels(px), []);

  // Create portal container on mount, remove on unmount
  useEffect(() => {
    const el = document.createElement("div");
    // Style the portal container itself to cover viewport and block all events below
    el.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:999999;pointer-events:auto;";
    document.body.appendChild(el);
    portalRef.current = el;
    setMounted(true);

    // Prevent body scroll
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
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      onCropDone(blob);
    } catch {
      const res = await fetch(imageSrc);
      onCropDone(await res.blob());
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || !portalRef.current) return null;

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
      {/* White card */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          width: 580,
          maxWidth: "100%",
          maxHeight: "calc(100vh - 32px)",
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

        {/* Crop area */}
        <div style={{ position: "relative", width: "100%", height: 400, background: "#e5e5e5", flexShrink: 0 }}>
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
              containerStyle: { width: "100%", height: "100%", position: "absolute", top: 0, left: 0 },
            }}
          />
        </div>

        {/* Controls */}
        <div style={{ padding: "14px 16px", borderTop: "1px solid #f0f0f0", display: "flex", flexDirection: "column", gap: 12, flexShrink: 0 }}>
          {/* Zoom */}
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

          {/* Aspect + rotate */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", background: "#f5f5f5", borderRadius: 12, padding: 2, gap: 2 }}>
              {ASPECTS.map((a) => {
                const on = !freeAspect && aspect === a.value;
                return (
                  <button type="button" key={a.label}
                    onClick={() => { setAspect(a.value); setFreeAspect(false); }}
                    style={{ ...segStyle, ...(on ? segOn : {}) }}>
                    {a.label}
                  </button>
                );
              })}
              <button type="button" onClick={() => setFreeAspect((f) => !f)}
                style={{ ...segStyle, padding: "6px 10px", ...(freeAspect ? segOn : {}) }}>
                <Maximize2 size={14} strokeWidth={2} />
              </button>
            </div>
            <button type="button" onClick={() => setRotation((r) => (r + 90) % 360)}
              style={{ ...circBtnStyle, borderRadius: 10 }}>
              <RotateCw size={16} strokeWidth={1.5} />
            </button>
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

const segStyle: React.CSSProperties = {
  padding: "6px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600,
  border: "none", background: "transparent", color: "#999", cursor: "pointer",
  display: "flex", alignItems: "center",
};

const segOn: React.CSSProperties = {
  background: "#fff", color: "#111", boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

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
