import { NextRequest, NextResponse } from "next/server";

import { requireApiAdmin } from "@/lib/server-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "media";

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp",
  "video/mp4", "video/webm", "video/quicktime",
];

const EXT_MAP: Record<string, string> = {
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
  "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov",
};

/**
 * Returns a signed upload URL for direct client → Supabase Storage upload.
 * This bypasses Vercel's 4.5MB API body limit, enabling video uploads up to 50MB.
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  const { fileName, contentType } = (await req.json()) as {
    fileName?: string;
    contentType?: string;
  };

  if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${contentType}` },
      { status: 400 },
    );
  }

  const ext = EXT_MAP[contentType] || "";
  const safeName = (fileName ?? "file")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 60);
  const storagePath = `admin/${Date.now()}_${safeName}${ext}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(storagePath);

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path: storagePath,
    publicUrl: urlData.publicUrl,
  });
}
