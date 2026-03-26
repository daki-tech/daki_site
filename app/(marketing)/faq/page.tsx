"use client";

import { useState } from "react";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqCategory {
  title: string;
  items: FaqItem[];
}

const faqData: FaqCategory[] = [
  {
    title: "Замовлення",
    items: [
      {
        question: "Як оформити замовлення?",
        answer:
          "Оберіть потрібний товар, вкажіть розмір та колір, додайте його до кошика та оформіть замовлення. Після підтвердження наш менеджер зв\u2019яжеться з вами для уточнення деталей.",
      },
      {
        question: "Які способи оплати доступні?",
        answer:
          "Ми приймаємо оплату на карту ПриватБанку, а також накладений платіж при отриманні на Новій Пошті. Оплата можлива у гривнях.",
      },
      {
        question: "Чи можу я змінити або скасувати замовлення?",
        answer:
          "Так, ви можете змінити або скасувати замовлення до моменту його відправлення. Для цього зв\u2019яжіться з нами через месенджер або за телефоном якнайшвидше.",
      },
    ],
  },
  {
    title: "Доставка",
    items: [
      {
        question: "Які терміни доставки?",
        answer:
          "Доставка по Україні здійснюється протягом 1\u20133 робочих днів після відправлення. Час обробки замовлення \u2014 1\u20132 робочих дні.",
      },
      {
        question: "Скільки коштує доставка?",
        answer:
          "Вартість доставки розраховується за тарифами Нової Пошти та залежить від ваги та габаритів посилки. Орієнтовна вартість \u2014 від 70 грн.",
      },
      {
        question: "Чи є безкоштовна доставка?",
        answer:
          "Так, безкоштовна доставка діє при замовленні від певної суми. Деталі уточнюйте у нашого менеджера або слідкуйте за акціями на сайті.",
      },
    ],
  },
  {
    title: "Повернення та обмін",
    items: [
      {
        question: "Як повернути товар?",
        answer:
          "Для повернення зв\u2019яжіться з нами, вкажіть номер замовлення та причину повернення. Товар потрібно надіслати у первісному стані з усіма бірками.",
      },
      {
        question: "Протягом якого терміну можна повернути товар?",
        answer:
          "Повернення приймається протягом 14 днів з моменту отримання замовлення, відповідно до Закону України про захист прав споживачів.",
      },
      {
        question: "Які умови обміну?",
        answer:
          "Обмін можливий на інший розмір або колір за наявності. Товар має бути у первісному стані, без слідів носіння та з усіма етикетками.",
      },
    ],
  },
  {
    title: "Товар",
    items: [
      {
        question: "Як підібрати розмір?",
        answer:
          "На сторінці кожного товару є розмірна сітка з детальними вимірами. Рекомендуємо зняти свої мірки та порівняти їх із таблицею розмірів.",
      },
      {
        question: "Як доглядати за виробом?",
        answer:
          "Рекомендації по догляду вказані на етикетці кожного виробу та в описі товару на сайті. Загалом, радимо делікатне прання при 30\u00b0C та уникати прямого прасування декоративних елементів.",
      },
      {
        question: "Чи відповідає колір на фото реальному?",
        answer:
          "Ми намагаємося передати колір максимально точно, проте відтінок може незначно відрізнятися залежно від налаштувань вашого екрану. Якщо у вас є сумніви \u2014 напишіть нам, і ми надішлемо додаткові фото.",
      },
    ],
  },
];

function AccordionItem({ question, answer }: FaqItem) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-neutral-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-4 text-left transition-colors hover:text-neutral-600"
      >
        <span className="text-sm font-medium md:text-base">{question}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100 pb-4" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="text-sm leading-relaxed text-muted-foreground">{answer}</p>
        </div>
      </div>
    </div>
  );
}

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 lg:px-6 lg:py-20">
      <Breadcrumbs
        items={[
          { label: "Головна", href: "/" },
          { label: "Часті запитання" },
        ]}
        className="mb-8"
      />

      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-light uppercase tracking-[0.15em] md:text-3xl">
          Часті запитання
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
          Відповіді на найпопулярніші питання про замовлення, доставку та повернення.
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-3xl space-y-12">
        {/* Доставка та оплата */}
        <section>
          <h2 className="text-lg font-medium uppercase tracking-[0.1em] md:text-xl">
            Доставка та оплата
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

          <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              Середній термін доставки складає{" "}
              <span className="font-medium text-foreground">7-11 робочих днів</span>{" "}
              з моменту оформлення замовлення.
            </p>
            <p>
              Доставка{" "}
              <span className="font-medium text-foreground">безкоштовна</span> при
              замовленні від{" "}
              <span className="font-medium text-foreground">1600 грн</span>.
            </p>
          </div>

          <div className="mt-6 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <div className="rounded-2xl border border-neutral-200 p-6">
              <h3 className="font-medium text-foreground">Оплата при отриманні</h3>
              <p className="mt-1">
                Оплатіть замовлення накладним платежем при отриманні у відділенні пошти.
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-200 p-6">
              <h3 className="font-medium text-foreground">Передоплата на картку</h3>
              <p className="mt-1">
                Переказ на банківську картку. Реквізити надсилаються після оформлення замовлення.
              </p>
            </div>
          </div>
        </section>

        {/* Обмін та повернення */}
        <section>
          <h2 className="text-lg font-medium uppercase tracking-[0.1em] md:text-xl">
            Обмін та повернення
          </h2>
          <div className="mt-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              Ви можете повернути товар протягом{" "}
              <span className="font-medium text-foreground">14 днів</span> з
              моменту отримання замовлення за умови, що товар перебуває у
              належному стані.
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2">
              <li>Товар не був у використанні</li>
              <li>Збережено товарний вигляд та споживчі властивості</li>
              <li>Наявні всі бірки та ярлики</li>
              <li>Наявний документ, що підтверджує покупку</li>
            </ul>
          </div>

          <div className="mt-6 text-sm leading-relaxed text-muted-foreground">
            <p>
              Обмін товару можливий на інший розмір або колір за наявності на
              складі. Доставка обміну здійснюється за рахунок покупця.
            </p>
          </div>

          <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <div className="flex gap-4 rounded-2xl border border-neutral-200 p-6">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-medium text-white">
                1
              </span>
              <p>
                Зв&apos;яжіться з нами через месенджер або телефон та повідомте
                про бажання повернути товар.
              </p>
            </div>
            <div className="flex gap-4 rounded-2xl border border-neutral-200 p-6">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-medium text-white">
                2
              </span>
              <p>
                Отримайте підтвердження та інструкції щодо відправки товару.
              </p>
            </div>
            <div className="flex gap-4 rounded-2xl border border-neutral-200 p-6">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-medium text-white">
                3
              </span>
              <p>
                Надішліть товар поштовою службою за вказаною адресою.
              </p>
            </div>
            <div className="flex gap-4 rounded-2xl border border-neutral-200 p-6">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-medium text-white">
                4
              </span>
              <p>
                Після отримання та перевірки товару кошти повертаються протягом
                3-5 робочих днів.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-neutral-200 p-6 text-sm leading-relaxed text-muted-foreground">
            <ul className="list-inside list-disc space-y-2">
              <li>
                Поверненню та обміну не підлягають товари, виготовлені на
                індивідуальне замовлення
              </li>
              <li>
                Вартість доставки при поверненні сплачується покупцем
              </li>
              <li>
                Повернення коштів здійснюється тим самим способом, яким була
                проведена оплата
              </li>
              <li>
                У разі виявлення браку, зверніться до нас протягом 14 днів з
                моменту отримання для безкоштовного обміну або повернення
              </li>
            </ul>
          </div>
        </section>

        {/* FAQ accordion sections */}
        <section>
          <h2 className="text-lg font-medium uppercase tracking-[0.1em] md:text-xl">
            Запитання та відповіді
          </h2>
          <div className="mt-6 space-y-10">
            {faqData.map((category) => (
              <div key={category.title}>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.15em]">
                  {category.title}
                </h3>
                <div>
                  {category.items.map((item) => (
                    <AccordionItem key={item.question} {...item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
