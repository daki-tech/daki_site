"use client";

import Link from "next/link";
import { ArrowRight, Scissors, Truck, Shield, Sparkles, Heart, Factory } from "lucide-react";

const stats = [
  { value: "25+", label: "років на ринку" },
  { value: "50+", label: "моделей у колекції" },
  { value: "10 000+", label: "задоволених клієнтів" },
  { value: "100%", label: "власне виробництво" },
];

const advantages = [
  {
    icon: Factory,
    title: "Власне виробництво",
    desc: "Повний цикл виробництва — від розробки лекал до готового виробу. Контролюємо якість на кожному етапі.",
  },
  {
    icon: Scissors,
    title: "Актуальний дизайн",
    desc: "Слідкуємо за світовими трендами та адаптуємо їх для українських реалій. Кожен сезон — нові моделі.",
  },
  {
    icon: Shield,
    title: "Гарантія якості",
    desc: "Використовуємо якісні тканини та фурнітуру. Кожен виріб проходить перевірку перед відправкою.",
  },
  {
    icon: Truck,
    title: "Швидка доставка",
    desc: "Відправляємо замовлення по всій Україні через Нову Пошту та Meest. Безкоштовна доставка від 1 600 грн.",
  },
  {
    icon: Heart,
    title: "Індивідуальний підхід",
    desc: "Допомагаємо з вибором розміру та моделі. Завжди на зв'язку через месенджери та телефон.",
  },
  {
    icon: Sparkles,
    title: "Доступні ціни",
    desc: "Прямі ціни від виробника без посередників та націнок. Регулярні акції та спеціальні пропозиції.",
  },
];

const process = [
  { step: "01", title: "Розробка", desc: "Дизайн, лекала, підбір тканин" },
  { step: "02", title: "Виробництво", desc: "Пошив на власному виробництві" },
  { step: "03", title: "Контроль якості", desc: "Перевірка кожного виробу" },
  { step: "04", title: "Доставка", desc: "Швидка відправка по Україні" },
];

export default function AboutPage() {
  return (
    <div>
      {/* Header */}
      <div className="text-center px-4 pt-12 lg:pt-20">
        <h1 className="text-2xl font-light uppercase tracking-[0.15em] md:text-3xl">
          Про компанію DaKi
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground md:text-base">
          Український виробник верхнього жіночого одягу з багаторічним досвідом та власним виробництвом
        </p>
      </div>

      {/* Stats */}
      <section className="mt-12 border-y border-neutral-200">
        <div className="mx-auto max-w-[1600px] px-4 lg:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-neutral-200">
            {stats.map((s) => (
              <div key={s.label} className="py-10 text-center">
                <div className="text-3xl font-light tracking-wide md:text-4xl">{s.value}</div>
                <div className="mt-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 lg:px-6">
          <h2 className="text-lg font-medium uppercase tracking-[0.1em] md:text-xl">
            Наша історія
          </h2>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base">
            <p>
              DaKi — це сімейна компанія, яка з 2000 року створює верхній жіночий одяг.
              Ми почали з невеликої майстерні, а сьогодні маємо повноцінне виробництво,
              де кожен виріб проходить шлях від ідеї до готового продукту.
            </p>
            <p>
              Наша команда — це досвідчені конструктори, технологи та швачки, які поділяють
              спільну мету: створювати одяг, у якому жінки почуваються впевнено та стильно.
              Ми працюємо з якісними тканинами та фурнітурою, слідкуємо за світовими трендами
              та адаптуємо їх для українського ринку.
            </p>
            <p>
              Пальта, пуховики, куртки, жилети та тренчі DaKi — це поєднання актуального дизайну,
              комфорту та доступних цін. Ми пишаємося тим, що кожен виріб створений в Україні
              з увагою до деталей.
            </p>
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="bg-neutral-50 py-16 md:py-24">
        <div className="mx-auto max-w-[1600px] px-4 lg:px-6">
          <div className="text-center">
            <h2 className="text-lg font-medium uppercase tracking-[0.1em] md:text-xl">
              Чому обирають DaKi
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              Те, що відрізняє нас від інших
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {advantages.map((a) => (
              <div key={a.title} className="rounded-2xl border border-neutral-200 bg-white p-6">
                <a.icon className="h-6 w-6 text-neutral-400" strokeWidth={1.5} />
                <h3 className="mt-4 text-sm font-medium">{a.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-[1600px] px-4 lg:px-6">
          <div className="text-center">
            <h2 className="text-lg font-medium uppercase tracking-[0.1em] md:text-xl">
              Як ми працюємо
            </h2>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {process.map((p) => (
              <div key={p.step} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-neutral-200 text-lg font-light text-neutral-400">
                  {p.step}
                </div>
                <h3 className="mt-4 text-sm font-medium">{p.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-neutral-200 py-16 md:py-24">
        <div className="mx-auto max-w-[1600px] px-4 text-center lg:px-6">
          <h2 className="text-xl font-light uppercase tracking-[0.15em] md:text-2xl">
            Готові обрати свій стиль?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
            Перегляньте нашу колекцію та знайдіть ідеальну модель для себе
          </p>
          <Link
            href="/catalog"
            className="mt-8 inline-flex items-center gap-2 rounded-none border border-foreground bg-foreground px-8 py-3 text-xs font-medium uppercase tracking-[0.15em] text-background transition hover:bg-transparent hover:text-foreground"
          >
            Перейти до каталогу
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
