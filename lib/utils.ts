import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  const formatted = new Intl.NumberFormat("uk-UA", {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(value);
  return `${formatted} UAH`;
}

export function toNumber(value: string | number | null | undefined, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (!value) return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function parseCsv(input: string): string[] {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unexpected error";
}

/**
 * Extract Google Drive file ID from any Drive URL format.
 * Returns null for non-Drive URLs.
 */
function extractGoogleDriveId(url: string): string | null {
  if (!url) return null;
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch) return fileMatch[1];
  const openMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (openMatch) return openMatch[1];
  const ucMatch = url.match(/drive\.google\.com\/uc\?.*id=([^&]+)/);
  if (ucMatch) return ucMatch[1];
  const thumbMatch = url.match(/drive\.google\.com\/thumbnail\?.*id=([^&]+)/);
  if (thumbMatch) return thumbMatch[1];
  const lhMatch = url.match(/lh3\.googleusercontent\.com\/d\/([^?/=]+)/);
  if (lhMatch) return lhMatch[1];
  return null;
}

/**
 * Convert Google Drive share URLs to direct thumbnail image URLs.
 * Uses Google Drive Thumbnail API which is more reliable than lh3.
 * Non-Drive URLs are returned as-is.
 */
export function toDirectImageUrl(url: string): string {
  if (!url) return url;
  const id = extractGoogleDriveId(url);
  if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w2000`;
  return url;
}

/** Check if a URL is a Google Drive image URL (needs unoptimized rendering) */
export function isExternalImageUrl(url: string): boolean {
  return url.includes("drive.google.com") || url.includes("lh3.googleusercontent.com");
}
