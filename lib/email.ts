import { Resend } from "resend";

import { dakiEmailWrapper } from "@/lib/email-template";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail(input: SendEmailInput) {
  if (!resend) {
    console.warn("RESEND_API_KEY is missing. Email was skipped.");
    return { skipped: true };
  }

  const from = process.env.RESEND_FROM_EMAIL ?? "DaKi <noreply@dakifashion.com>";
  const recipients = Array.isArray(input.to) ? input.to : [input.to];

  // For single recipient, send normally
  if (recipients.length === 1) {
    return resend.emails.send({
      from,
      to: recipients[0],
      subject: input.subject,
      html: input.html,
    });
  }

  // For multiple recipients, send individually to protect privacy (no BCC exposure)
  const results = await Promise.allSettled(
    recipients.map((email) =>
      resend.emails.send({
        from,
        to: email,
        subject: input.subject,
        html: input.html,
      })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;
  return { sent, failed, total: recipients.length };
}

export function subscriptionPurchaseTemplate(companyName: string) {
  return dakiEmailWrapper(`
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#000">Дякуємо за оплату!</h2>
    <p style="color:#666;font-size:14px;line-height:1.6;margin:0">
      ${companyName}, ваш оптовий тариф активовано. Тепер вам доступні оптові ціни та замовлення ростовок.
    </p>
  `);
}

export function subscriptionCancellationTemplate(companyName: string) {
  return dakiEmailWrapper(`
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#000">Підписку скасовано</h2>
    <p style="color:#666;font-size:14px;line-height:1.6;margin:0">
      ${companyName}, вашу підписку скасовано. Ви можете активувати новий тариф у будь-який момент.
    </p>
  `);
}
