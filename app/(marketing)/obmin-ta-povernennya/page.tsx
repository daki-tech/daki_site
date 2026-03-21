import { Breadcrumbs } from "@/components/shared/breadcrumbs";

export default function ExchangeAndReturnPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6 lg:py-8">
      <Breadcrumbs
        items={[
          { label: "Головна", href: "/" },
          { label: "Обмін та повернення" },
        ]}
        className="mb-4"
      />

      <h1 className="text-2xl font-light tracking-wide lg:text-3xl">
        Обмін та повернення
      </h1>

      <div className="mx-auto mt-8 max-w-3xl space-y-12">
        {/* Умови повернення */}
        <section>
          <h2 className="text-lg font-medium uppercase tracking-[0.1em] md:text-xl">
            Умови повернення
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
        </section>

        {/* Як оформити повернення */}
        <section>
          <h2 className="text-lg font-medium uppercase tracking-[0.1em] md:text-xl">
            Як оформити повернення
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
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
        </section>

        {/* Умови обміну */}
        <section>
          <h2 className="text-lg font-medium uppercase tracking-[0.1em] md:text-xl">
            Умови обміну
          </h2>
          <div className="mt-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              Обмін товару можливий на інший розмір або колір за наявності на
              складі. Для обміну товар має відповідати тим самим умовам, що й для
              повернення.
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2">
              <li>Обмін здійснюється протягом 14 днів з моменту отримання</li>
              <li>Товар має бути у належному стані зі збереженими бірками</li>
              <li>
                Доставка обміну здійснюється за рахунок покупця
              </li>
            </ul>
          </div>
        </section>

        {/* Важлива інформація */}
        <section>
          <h2 className="text-lg font-medium uppercase tracking-[0.1em] md:text-xl">
            Важлива інформація
          </h2>
          <div className="mt-4 rounded-2xl border border-neutral-200 p-6 text-sm leading-relaxed text-muted-foreground">
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
      </div>
    </div>
  );
}
