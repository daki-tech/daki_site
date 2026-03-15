import { NextResponse } from "next/server";

import { sendEmail } from "@/lib/email";
import { dakiEmailWrapper } from "@/lib/email-template";
import { requireApiAdmin } from "@/lib/server-auth";
import { broadcastSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const parsed = broadcastSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { subject, body: message, audience } = parsed.data;

  let emails: string[] = [];

  if (audience === "newsletter") {
    // Send to newsletter subscribers (from landing page + signup checkbox)
    const { data: subs } = await auth.supabase
      .from("newsletter_subscribers")
      .select("email")
      .is("unsubscribed_at", null)
      .limit(500);

    // Also include profiles with newsletter_subscribed = true
    const { data: profileSubs } = await auth.supabase
      .from("profiles")
      .select("email")
      .eq("newsletter_subscribed", true)
      .not("email", "is", null)
      .limit(500);

    const allEmails = new Set<string>();
    (subs ?? []).forEach((s) => s.email && allEmails.add(s.email));
    (profileSubs ?? []).forEach((p) => p.email && allEmails.add(p.email));
    emails = Array.from(allEmails);
  } else {
    let query = auth.supabase.from("profiles").select("email").not("email", "is", null);
    if (audience !== "all") query = query.eq("subscription_tier", audience);
    const { data: recipients } = await query.limit(500);
    emails = (recipients ?? []).map((item) => item.email).filter(Boolean) as string[];
  }

  if (emails.length === 0) {
    return NextResponse.json({ error: "No recipients found" }, { status: 400 });
  }

  const html = dakiEmailWrapper(`
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#000">${subject}</h2>
    <div style="color:#666;font-size:14px;line-height:1.6">${message.replace(/\n/g, "<br/>")}</div>
  `);

  await sendEmail({ to: emails, subject, html });

  return NextResponse.json({ ok: true, sent: emails.length });
}
