import { Breadcrumbs } from "@/components/shared/breadcrumbs";

export default function DeliveryAndPaymentPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6 lg:py-8">
      <Breadcrumbs
        items={[
          { label: "Головна", href: "/" },
          { label: "Доставка та оплата" },
        ]}
        className="mb-4"
      />

      <h1 className="text-2xl font-light tracking-wide lg:text-3xl">
        Доставка та оплата
      </h1>

      <div className="mx-auto mt-8 max-w-3xl space-y-12">
        {/* Способи доставки */}
        <section>
          <h2 className="text-lg font-medium md:text-xl">
            Способи доставки
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <div className="rounded-2xl border border-neutral-200 p-6">
              <h3 className="font-medium text-foreground">Meest ПОШТА</h3>
              <p className="mt-1">
                Доставка у відділення Meest ПОШТА по всій Україні.
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-200 p-6">
              <h3 className="font-medium text-foreground">Нова ПОШТА</h3>
              <p className="mt-1">
                Доставка у відділення або поштомат Нової ПОШТИ по всій Україні.
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-200 p-6">
              <h3 className="font-medium text-foreground">
                Кур&apos;єрська доставка
              </h3>
              <p className="mt-1">
                Доставка кур&apos;єром за вказаною адресою.
              </p>
            </div>
          </div>
        </section>

        {/* Терміни доставки */}
        <section>
          <h2 className="text-lg font-medium md:text-xl">
            Терміни доставки
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Середній термін доставки складає{" "}
            <span className="font-medium text-foreground">
              7-11 робочих днів
            </span>{" "}
            з моменту оформлення замовлення. Термін може змінюватись залежно від
            завантаженості поштових служб та вашого місцезнаходження.
          </p>
        </section>

        {/* Вартість доставки */}
        <section>
          <h2 className="text-lg font-medium md:text-xl">
            Вартість доставки
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Доставка{" "}
            <span className="font-medium text-foreground">безкоштовна</span> при
            замовленні від{" "}
            <span className="font-medium text-foreground">1600 грн</span>. Для
            замовлень на меншу суму вартість доставки розраховується згідно з
            тарифами обраної поштової служби.
          </p>
        </section>

        {/* Способи оплати */}
        <section>
          <h2 className="text-lg font-medium md:text-xl">
            Способи оплати
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <div className="rounded-2xl border border-neutral-200 p-6">
              <h3 className="font-medium text-foreground">
                Оплата при отриманні
              </h3>
              <p className="mt-1">
                Оплатіть замовлення накладним платежем при отриманні у відділенні
                пошти.
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-200 p-6">
              <h3 className="font-medium text-foreground">
                Передоплата на картку
              </h3>
              <p className="mt-1">
                Переказ на банківську картку. Реквізити надсилаються після
                оформлення замовлення.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
