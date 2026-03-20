import { NextRequest, NextResponse } from "next/server";

import { requireApiAdmin } from "@/lib/server-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "media";
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

const MIME_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

export async function POST(req: NextRequest) {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
  }

  const ext = MIME_MAP[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}` },
      { status: 400 },
    );
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const timestamp = Date.now();
  const safeName = file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 60);

  const isImage = file.type.startsWith("image/");
  let uploadBuffer: Buffer;
  let uploadContentType: string;
  let uploadPath: string;

  if (isImage) {
    const sharp = (await import("sharp")).default;
    uploadBuffer = await sharp(rawBuffer)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    uploadContentType = "image/webp";
    uploadPath = `admin/${timestamp}_${safeName}.webp`;
  } else {
    uploadBuffer = rawBuffer;
    uploadContentType = file.type;
    uploadPath = `admin/${timestamp}_${safeName}${ext}`;
  }

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(uploadPath, uploadBuffer, {
      contentType: uploadContentType,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(uploadPath);

  return NextResponse.json({ url: urlData.publicUrl });
}

// DELETE — remove old file from storage to free space
export async function DELETE(req: NextRequest) {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  const { url } = (await req.json()) as { url?: string };
  if (!url) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  // Extract storage path from public URL
  // URL format: https://xxx.supabase.co/storage/v1/object/public/media/admin/123_name.webp
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) {
    return NextResponse.json({ error: "Invalid storage URL" }, { status: 400 });
  }

  const storagePath = decodeURIComponent(url.slice(idx + marker.length));
  const admin = createAdminClient();
  const { error } = await admin.storage.from(BUCKET).remove([storagePath]);

  if (error) {
    console.error("[Storage Delete]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
