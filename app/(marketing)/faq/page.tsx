"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

/* ── Small FAQ accordion (question → answer) ── */

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-neutral-100 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-3.5 text-left text-sm font-medium transition-colors hover:text-neutral-600"
      >
        {q}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100 pb-4" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden text-sm leading-relaxed text-muted-foreground">
          {a}
        </div>
      </div>
    </div>
  );
}

/* ── Big section accordion (title → rich content) ── */

function Section({
  title,
  children,
  open,
  onToggle,
}: {
  title: string;
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-neutral-200">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-6 text-left"
      >
        <h2 className="text-lg font-medium uppercase tracking-[0.1em] md:text-xl">
          {title}
        </h2>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-neutral-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`grid transition-all duration-500 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100 pb-8" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

/* ── Page ── */

export default function FaqPage() {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggle = (id: string) => setOpenSection((prev) => (prev === id ? null : id));

  return (
    <div className="mx-auto max-w-[1600px] px-4 pt-4 pb-10 lg:px-6 lg:pt-6 lg:pb-16">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-light uppercase tracking-[0.15em] md:text-3xl">
          Часті запитання
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
          Все про замовлення, доставку, оплату та повернення
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-3xl">
        {/* ─── 1. Доставка та оплата ─── */}
        <Section title="Доставка та оплата" open={openSection === "delivery"} onToggle={() => toggle("delivery")}>
          <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
            {/* Способи доставки */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-foreground">
                Способи доставки
              </h3>
              <div className="space-y-2">
                <div className="rounded-xl border border-neutral-200 p-4">
                  <span className="font-medium text-foreground">Нова Пошта</span>
                  <span className="ml-2">— відділення або поштомат по всій Україні</span>
                </div>
                <div className="rounded-xl border border-neutral-200 p-4">
                  <span className="font-medium text-foreground">Meest Пошта</span>
                  <span className="ml-2">— відділення по всій Україні</span>
                </div>
                <div className="rounded-xl border border-neutral-200 p-4">
                  <span className="font-medium text-foreground">Кур&apos;єрська доставка</span>
                  <span className="ml-2">— за вказаною адресою</span>
                </div>
              </div>
            </div>

            {/* Терміни і вартість */}
            <div className="rounded-xl bg-neutral-50 p-5 space-y-2">
              <p>
                Термін доставки:{" "}
                <span className="font-medium text-foreground">7–11 робочих днів</span>
              </p>
              <p>
                Безкоштовна доставка при замовленні від{" "}
                <span className="font-medium text-foreground">1 600 грн</span>
              </p>
            </div>

            {/* Способи оплати */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-foreground">
                Способи оплати
              </h3>
              <div className="space-y-2">
                <div className="rounded-xl border border-neutral-200 p-4">
                  <span className="font-medium text-foreground">Оплата при отриманні</span>
                  <span className="ml-2">— накладний платіж у відділенні пошти</span>
                </div>
                <div className="rounded-xl border border-neutral-200 p-4">
                  <span className="font-medium text-foreground">Передоплата на картку</span>
                  <span className="ml-2">— реквізити надсилаються після оформлення</span>
                </div>
              </div>
            </div>

            {/* FAQ по доставці */}
            <div className="mt-2">
              <FaqItem q="Які терміни доставки?" a="Доставка по Україні здійснюється протягом 1–3 робочих днів після відправлення. Час обробки замовлення — 1–2 робочих дні." />
              <FaqItem q="Скільки коштує доставка?" a="Вартість доставки розраховується за тарифами обраної поштової служби та залежить від ваги посилки. Орієнтовна вартість — від 70 грн." />
              <FaqItem q="Чи є безкоштовна доставка?" a="Так, безкоштовна доставка діє при замовленні від 1 600 грн." />
            </div>
          </div>
        </Section>

        {/* ─── 2. Обмін та повернення ─── */}
        <Section title="Обмін та повернення" open={openSection === "exchange"} onToggle={() => toggle("exchange")}>
          <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
            {/* Умови повернення */}
            <div>
              <p>
                Ви можете повернути товар протягом{" "}
                <span className="font-medium text-foreground">14 днів</span> з
                моменту отримання, якщо товар у належному стані:
              </p>
              <ul className="mt-3 list-inside list-disc space-y-1.5">
                <li>Не був у використанні</li>
                <li>Збережено товарний вигляд та споживчі властивості</li>
                <li>Наявні всі бірки та ярлики</li>
                <li>Наявний документ, що підтверджує покупку</li>
              </ul>
            </div>

            {/* Обмін */}
            <div className="rounded-xl bg-neutral-50 p-5">
              <p>
                <span className="font-medium text-foreground">Обмін</span> можливий
                на інший розмір або колір за наявності на складі. Доставка обміну —
                за рахунок покупця.
              </p>
            </div>

            {/* Кроки */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-foreground">
                Як оформити повернення
              </h3>
              <div className="space-y-2">
                {[
                  "Зв'яжіться з нами через месенджер або телефон",
                  "Отримайте підтвердження та інструкції щодо відправки",
                  "Надішліть товар поштовою службою за вказаною адресою",
                  "Кошти повертаються протягом 3–5 робочих днів після перевірки",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-neutral-200 p-4">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-medium text-white">
                      {i + 1}
                    </span>
                    <p>{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Важливо */}
            <div className="rounded-xl border border-neutral-200 p-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-foreground">
                Важливо
              </h3>
              <ul className="list-inside list-disc space-y-1.5">
                <li>Товари на індивідуальне замовлення не підлягають поверненню</li>
                <li>Доставка при поверненні — за рахунок покупця</li>
                <li>Кошти повертаються тим самим способом оплати</li>
                <li>При виявленні браку — безкоштовний обмін протягом 14 днів</li>
              </ul>
            </div>

            {/* FAQ по обміну */}
            <div className="mt-2">
              <FaqItem q="Як повернути товар?" a="Зв'яжіться з нами, вкажіть номер замовлення та причину повернення. Товар потрібно надіслати у первісному стані з усіма бірками." />
              <FaqItem q="Протягом якого терміну можна повернути?" a="Повернення приймається протягом 14 днів з моменту отримання замовлення, відповідно до Закону України про захист прав споживачів." />
              <FaqItem q="Які умови обміну?" a="Обмін можливий на інший розмір або колір за наявності. Товар має бути у первісному стані, без слідів носіння та з усіма етикетками." />
            </div>
          </div>
        </Section>

        {/* ─── 3. Часті запитання ─── */}
        <Section title="Часті запитання" open={openSection === "faq"} onToggle={() => toggle("faq")}>
          <div className="space-y-8">
            {/* Замовлення */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em]">
                Замовлення
              </h3>
              <FaqItem q="Як оформити замовлення?" a="Оберіть потрібний товар, вкажіть розмір та колір, додайте його до кошика та оформіть замовлення. Після підтвердження наш менеджер зв'яжеться з вами для уточнення деталей." />
              <FaqItem q="Які способи оплати доступні?" a="Ми приймаємо оплату на карту ПриватБанку, а також накладений платіж при отриманні на Новій Пошті. Оплата можлива у гривнях." />
              <FaqItem q="Чи можу я змінити або скасувати замовлення?" a="Так, ви можете змінити або скасувати замовлення до моменту його відправлення. Зв'яжіться з нами через месенджер або за телефоном якнайшвидше." />
            </div>

            {/* Товар */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em]">
                Товар
              </h3>
              <FaqItem q="Як підібрати розмір?" a="На сторінці кожного товару є розмірна сітка з детальними вимірами. Рекомендуємо зняти свої мірки та порівняти їх із таблицею розмірів." />
              <FaqItem q="Як доглядати за виробом?" a="Рекомендації по догляду вказані на етикетці кожного виробу та в описі товару на сайті. Загалом, радимо делікатне прання при 30°C та уникати прямого прасування декоративних елементів." />
              <FaqItem q="Чи відповідає колір на фото реальному?" a="Ми намагаємося передати колір максимально точно, проте відтінок може незначно відрізнятися залежно від налаштувань вашого екрану. Якщо є сумніви — напишіть нам, і ми надішлемо додаткові фото." />
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
