"use client";

import Image from "next/image";
import { toDirectImageUrl } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SmartImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  style?: React.CSSProperties;
}

interface SmartMediaProps {
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
  style?: React.CSSProperties;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".avi", ".ogg", ".m4v"];

const FILL_STYLE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

function hasVideoExtension(url: string): boolean {
  if (!url) return false;
  const path = url.toLowerCase().split("?")[0].split("#")[0];
  return VIDEO_EXTENSIONS.some((ext) => path.endsWith(ext));
}

/** True for external URLs that should bypass Next.js Image */
function isExternal(url: string): boolean {
  if (!url) return false;
  return (
    url.includes("drive.google.com") ||
    url.includes("lh3.googleusercontent.com") ||
    url.includes("docs.google.com") ||
    (url.startsWith("http") &&
      !url.includes("supabase.co") &&
      !url.includes("unsplash.com") &&
      !url.includes("pixabay.com") &&
      !url.startsWith("/"))
  );
}

/* ------------------------------------------------------------------ */
/*  SmartImage — images only (cards, thumbnails, gallery)              */
/*                                                                     */
/*  Converts Google Drive URLs to thumbnail API as fallback.           */
/*  Uses raw <img> for external, Next.js <Image> for local/Supabase.  */
/* ------------------------------------------------------------------ */

export function SmartImage({
  src,
  alt,
  fill,
  width,
  height,
  className,
  sizes,
  priority,
  style,
}: SmartImageProps) {
  if (!src) return null;

  const resolvedSrc = toDirectImageUrl(src);

  if (isExternal(resolvedSrc)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedSrc}
        alt={alt}
        className={className}
        style={{ ...(fill ? FILL_STYLE : {}), ...(!fill && !width && !height ? { width: "100%", height: "auto" } : {}), ...style }}
        width={fill || (!width && !height) ? undefined : width}
        height={fill || (!width && !height) ? undefined : height}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
      />
    );
  }

  // Responsive mode: no fill, no explicit dimensions → use width:100% height:auto
  if (!fill && !width && !height) {
    return (
      <Image
        src={resolvedSrc}
        alt={alt}
        width={0}
        height={0}
        className={className}
        sizes={sizes || "100vw"}
        priority={priority}
        style={{ width: "100%", height: "auto", ...style }}
      />
    );
  }

  return (
    <Image
      src={resolvedSrc}
      alt={alt}
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={className}
      sizes={sizes}
      priority={priority}
      style={style}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  SmartMedia — handles both images and videos                        */
/*                                                                     */
/*  Strategy:                                                          */
/*  1. URL with video extension (.mp4 etc) → <video autoPlay loop>     */
/*  2. Everything else → <SmartImage>                                  */
/*                                                                     */
/*  Media from Supabase Storage uses direct URLs, so <video> and       */
/*  <img> tags work natively without any special handling.             */
/* ------------------------------------------------------------------ */

export function SmartMedia({
  src,
  alt,
  fill,
  className,
  sizes,
  priority,
  style,
}: SmartMediaProps) {
  if (!src) return null;

  // Video files → <video> with autoplay loop
  if (hasVideoExtension(src)) {
    const mergedStyle = { ...(fill ? FILL_STYLE : { width: "100%", height: "auto" }), ...style };
    return (
      <video
        src={src}
        className={className}
        style={mergedStyle}
        autoPlay
        loop
        muted
        playsInline
      />
    );
  }

  // Everything else → image
  return (
    <SmartImage
      src={src}
      alt={alt}
      fill={fill}
      className={className}
      sizes={sizes}
      priority={priority}
      style={style}
    />
  );
}
