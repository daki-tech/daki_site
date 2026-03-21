import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Підбір розміру | DaKi",
  description: "Як правильно зняти мірки та підібрати розмір верхнього одягу DaKi",
};

const measurements = [
  {
    num: 1,
    title: "Довжина рукава",
    desc: "Виміряйте від плечового суглоба до зап'ястя. Рука має бути трохи зігнута.",
  },
  {
    num: 2,
    title: "Обхват грудей",
    desc: "Проведіть сантиметрову стрічку горизонтально навколо тулуба по найвищій точці грудей.",
  },
  {
    num: 3,
    title: "Обхват талії",
    desc: "Виміряйте у найвужчій частині тулуба, зазвичай трохи вище пупка.",
  },
  {
    num: 4,
    title: "Обхват стегон",
    desc: "Виміряйте у найширшій частині сідниць, ноги мають бути разом.",
  },
  {
    num: 5,
    title: "Довжина виробу",
    desc: "Виміряйте по зовнішньому шву від верхнього краю до нижнього. Рекомендуємо покласти на рівну поверхню виріб, який добре сидить, та виміряти його.",
  },
];

export default function SizeGuidePage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-neutral-400">
        <Link href="/" className="transition hover:text-neutral-900">Головна</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-neutral-900">Підбір розміру</span>
      </nav>

      <h1 className="text-2xl font-light tracking-wide lg:text-3xl">Підбір розміру</h1>

      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-500">
        В описі кожного товару є розмірна сітка конкретно під цей товар. Ви можете зняти свої мірки
        та підібрати розмір, який підходить саме Вам, використовуючи таблицю розмірів.
      </p>

      <h2 className="mt-10 text-lg font-medium">Як правильно зробити заміри?</h2>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_0.7fr] lg:gap-16 lg:items-center">
        {/* Left: instructions */}
        <div className="space-y-8">
          {measurements.map((m) => (
            <div key={m.num} className="flex gap-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-semibold text-rose-500">
                {m.num}
              </div>
              <div>
                <h3 className="font-medium">{m.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-neutral-500">{m.desc}</p>
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-sm text-neutral-600">
              <span className="font-medium">Порада:</span> знімайте мірки у нижній білизні або тонкому одязі,
              стійте рівно, не затягуйте стрічку занадто щільно.
            </p>
          </div>
        </div>

        {/* Right: SVG figure — centered */}
        <div className="hidden lg:flex lg:items-center lg:justify-center">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <svg viewBox="0 0 200 400" className="mx-auto h-auto w-full max-w-[240px]">
              {/* Head */}
              <circle cx="100" cy="30" r="18" fill="none" stroke="#d4d4d4" strokeWidth="1.5" />
              {/* Neck */}
              <line x1="100" y1="48" x2="100" y2="60" stroke="#d4d4d4" strokeWidth="1.5" />
              {/* Shoulders */}
              <line x1="60" y1="70" x2="140" y2="70" stroke="#d4d4d4" strokeWidth="1.5" />
              {/* Body */}
              <path d="M60,70 L55,180 L70,180 L75,280 L90,380 L100,380 L100,280 L100,380 L110,380 L125,280 L130,180 L145,180 L140,70" fill="none" stroke="#d4d4d4" strokeWidth="1.5" />
              {/* Arms */}
              <path d="M60,70 L40,180" fill="none" stroke="#d4d4d4" strokeWidth="1.5" />
              <path d="M140,70 L160,180" fill="none" stroke="#d4d4d4" strokeWidth="1.5" />

              {/* Measurement 1 - Sleeve length */}
              <line x1="140" y1="70" x2="160" y2="180" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4,3" />
              <circle cx="155" cy="150" r="10" fill="#f43f5e" opacity="0.15" />
              <text x="155" y="154" textAnchor="middle" fontSize="11" fill="#f43f5e" fontWeight="600">1</text>

              {/* Measurement 2 - Chest */}
              <line x1="52" y1="100" x2="148" y2="100" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4,3" />
              <circle cx="30" cy="100" r="10" fill="#f43f5e" opacity="0.15" />
              <text x="30" y="104" textAnchor="middle" fontSize="11" fill="#f43f5e" fontWeight="600">2</text>

              {/* Measurement 3 - Waist */}
              <line x1="55" y1="140" x2="145" y2="140" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4,3" />
              <circle cx="170" cy="140" r="10" fill="#f43f5e" opacity="0.15" />
              <text x="170" y="144" textAnchor="middle" fontSize="11" fill="#f43f5e" fontWeight="600">3</text>

              {/* Measurement 4 - Hips */}
              <line x1="57" y1="190" x2="143" y2="190" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4,3" />
              <circle cx="30" cy="190" r="10" fill="#f43f5e" opacity="0.15" />
              <text x="30" y="194" textAnchor="middle" fontSize="11" fill="#f43f5e" fontWeight="600">4</text>

              {/* Measurement 5 - Length */}
              <line x1="130" y1="180" x2="130" y2="370" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4,3" />
              <circle cx="150" cy="280" r="10" fill="#f43f5e" opacity="0.15" />
              <text x="150" y="284" textAnchor="middle" fontSize="11" fill="#f43f5e" fontWeight="600">5</text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
