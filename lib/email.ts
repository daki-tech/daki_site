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

  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "DaKi <noreply@dakifashion.com>",
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
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
