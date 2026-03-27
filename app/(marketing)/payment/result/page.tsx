"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle } from "lucide-react";
import { Suspense } from "react";

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order");

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
        <h1 className="mt-6 text-2xl font-light uppercase tracking-wider">
          Дякуємо за замовлення!
        </h1>
        {orderNumber && (
          <p className="mt-3 text-sm text-muted-foreground">
            Замовлення <span className="font-semibold text-foreground">#{orderNumber}</span> прийнято.
          </p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          Оплата обробляється. Ми повідомимо вас про статус замовлення.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/catalog"
            className="rounded-xl bg-black px-8 py-3 text-xs font-medium uppercase tracking-[0.15em] text-white transition hover:bg-neutral-800"
          >
            Продовжити покупки
          </Link>
          <Link
            href="/orders"
            className="rounded-xl border border-neutral-200 px-8 py-3 text-xs font-medium uppercase tracking-[0.15em] transition hover:bg-neutral-50"
          >
            Мої замовлення
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-black" />
      </div>
    }>
      <PaymentResultContent />
    </Suspense>
  );
}
