import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Політика конфіденційності | DaKi",
  description:
    "Політика конфіденційності інтернет-магазину DaKi. Інформація про збір, обробку та захист персональних даних відповідно до Закону України «Про захист персональних даних».",
};

export default function PrivacyPolicyPage() {
  return (
    <div>
      {/* Header */}
      <div className="text-center px-4 pt-4 lg:pt-6">
        <h1 className="text-2xl font-light uppercase tracking-[0.15em] md:text-3xl">
          Політика конфіденційності
        </h1>
      </div>

      {/* Content */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-4 lg:px-6 space-y-10">
          {/* 1. Загальні положення */}
          <div>
            <h2 className="text-base font-medium uppercase tracking-[0.1em] md:text-lg">
              1. Загальні положення
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              <p>
                Ця Політика конфіденційності (далі — Політика) визначає порядок збору,
                обробки, зберігання та захисту персональних даних користувачів
                інтернет-магазину DaKi (далі — Сайт), що розміщений за
                адресою{" "}
                <Link href="/" className="underline hover:text-foreground">
                  dakifashion.com
                </Link>
                .
              </p>
              <p>
                Володільцем персональних даних є ТМ &quot;DaKi&quot; (далі — Володілець).
              </p>
              <p>
                Ця Політика розроблена відповідно до Закону України &quot;Про захист
                персональних даних&quot; від 01.06.2010 № 2297-VI (далі — Закон),
                Конституції України та іншого чинного законодавства України у сфері
                захисту персональних даних.
              </p>
              <p>
                Використовуючи Сайт та/або надаючи свої персональні дані, Ви
                підтверджуєте, що ознайомлені з цією Політикою та надаєте свою згоду
                на обробку персональних даних відповідно до умов, викладених нижче.
              </p>
            </div>
          </div>

          {/* 2. Визначення термінів */}
          <div>
            <h2 className="text-base font-medium uppercase tracking-[0.1em] md:text-lg">
              2. Визначення термінів
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              <p>У цій Політиці терміни вживаються у значенні, визначеному ст. 2 Закону:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-foreground">Персональні дані</strong> —
                  відомості чи сукупність відомостей про фізичну особу, яка
                  ідентифікована або може бути конкретно ідентифікована.
                </li>
                <li>
                  <strong className="text-foreground">Обробка персональних даних</strong> —
                  будь-яка дія або сукупність дій, таких як збирання, реєстрація,
                  накопичення, зберігання, адаптування, зміна, поновлення, використання
                  і поширення, знеособлення, знищення персональних даних.
                </li>
                <li>
                  <strong className="text-foreground">Суб&apos;єкт персональних даних</strong> —
                  фізична особа, персональні дані якої обробляються (далі — Користувач).
                </li>
                <li>
                  <strong className="text-foreground">Володілець персональних даних</strong> —
                  ТМ &quot;DaKi&quot;, яка визначає мету обробки персональних даних,
                  встановлює склад цих даних та процедури їх обробки.
                </li>
                <li>
                  <strong className="text-foreground">Згода суб&apos;єкта персональних даних</strong> —
                  добровільне волевиявлення фізичної особи (за умови її поінформованості)
                  щодо надання дозволу на обробку її персональних даних відповідно до
                  сформульованої мети їх обробки.
                </li>
              </ul>
            </div>
          </div>

          {/* 3. Які дані ми збираємо */}
          <div>
            <h2 className="text-base font-medium uppercase tracking-[0.1em] md:text-lg">
              3. Які персональні дані ми збираємо
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base">
              <p>Ми збираємо лише ті дані, які є необхідними для надання наших послуг:</p>

              <div>
                <h3 className="font-medium text-foreground">3.1. При реєстрації на Сайті:</h3>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Прізвище та ім&apos;я</li>
                  <li>Адреса електронної пошти (email)</li>
                  <li>Пароль (зберігається у зашифрованому вигляді)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-foreground">3.2. При оформленні замовлення:</h3>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Прізвище та ім&apos;я</li>
                  <li>Номер телефону</li>
                  <li>Адреса електронної пошти (email)</li>
                  <li>Адреса доставки (область, місто, відділення Нової Пошти)</li>
                  <li>Спосіб оплати</li>
                  <li>Коментар до замовлення (за бажанням)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-foreground">3.3. При заповненні профілю:</h3>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Прізвище та ім&apos;я</li>
                  <li>Номер телефону</li>
                  <li>Місто та відділення доставки (за замовчуванням)</li>
                  <li>Мова інтерфейсу</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-foreground">3.4. При підписці на розсилку:</h3>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Адреса електронної пошти (email)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-foreground">3.5. Автоматично при використанні Сайту:</h3>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Технічні файли cookie, необхідні для роботи авторизації</li>
                  <li>IP-адреса (у серверних журналах хостинг-провайдера)</li>
                </ul>
              </div>

              <p>
                Ми <strong className="text-foreground">не збираємо</strong> дані
                про расове або етнічне походження, політичні, релігійні або світоглядні
                переконання, стан здоров&apos;я, статеве життя, біометричні або генетичні
                дані (ст. 7 Закону).
              </p>
            </div>
          </div>

          {/* 4. Мета обробки */}
          <div>
            <h2 className="text-base font-medium uppercase tracking-[0.1em] md:text-lg">
              4. Мета обробки персональних даних
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              <p>
                Відповідно до ст. 6 та ст. 11 Закону, обробка персональних даних
                здійснюється з такою метою:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-foreground">Виконання замовлення</strong> —
                  обробка та відправка замовлень, зв&apos;язок з покупцем щодо статусу
                  замовлення, організація доставки.
                </li>
                <li>
                  <strong className="text-foreground">Ведення облікового запису</strong> —
                  реєстрація, авторизація, збереження історії замовлень, персоналізація
                  налаштувань.
                </li>
                <li>
                  <strong className="text-foreground">Комунікація</strong> —
                  відповідь на звернення, інформування про статус замовлення, надсилання
                  повідомлень про зміни в роботі Сайту.
                </li>
                <li>
                  <strong className="text-foreground">Маркетинг</strong> —
                  надсилання інформації про нові колекції, акції та спеціальні пропозиції
                  (лише за наявності окремої згоди).
                </li>
                <li>
                  <strong className="text-foreground">Виконання вимог законодавства</strong> —
                  ведення бухгалтерського та податкового обліку, фіскалізація розрахунків.
                </li>
                <li>
                  <strong className="text-foreground">Забезпечення роботи Сайту</strong> —
                  підтримка працездатності, безпеки та захисту від шахрайства.
                </li>
              </ul>
            </div>
          </div>

          {/* 5. Підстави для обробки */}
          <div>
            <h2 className="text-base font-medium uppercase tracking-[0.1em] md:text-lg">
              5. Правові підстави для обробки
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              <p>
                Обробка персональних даних здійснюється на підставі ст. 11 Закону:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-foreground">Згода</strong> (п. 1 ч. 1 ст. 11) —
                  при реєстрації, підписці на розсилку, наданні додаткових даних у профілі.
                </li>
                <li>
                  <strong className="text-foreground">Виконання правочину</strong> (п. 3 ч. 1 ст. 11) —
                  при оформленні та виконанні замовлення.
                </li>
                <li>
                  <strong className="text-foreground">Виконання обов&apos;язку, передбаченого законом</strong>{" "}
                  (п. 5 ч. 1 ст. 11) — ведення бухгалтерського обліку та фіскалізація.
                </li>
                <li>
                  <strong className="text-foreground">Законний інтерес</strong> (п. 6 ч. 1 ст. 11) —
                  забезпечення безпеки Сайту та запобігання шахрайству.
                </li>
              </ul>
            </div>
          </div>

          {/* 6. Передача третім особам */}
          <div>
            <h2 className="text-base font-medium uppercase tracking-[0.1em] md:text-lg">
              6. Передача даних третім особам
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              <p>
                Відповідно до ст. 14 та ст. 21 Закону, ми можемо передавати
                персональні дані наступним категоріям одержувачів:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-foreground">Платіжні системи</strong> —
                  для проведення онлайн-оплати (Checkbox.ua). Передаються: сума
                  замовлення, email. Платіжні дані (номер картки тощо) обробляються
                  виключно платіжною системою та не зберігаються на Сайті.
                </li>
                <li>
                  <strong className="text-foreground">Сервіси електронної пошти</strong> —
                  для надсилання підтвердження замовлення та інформаційних повідомлень.
                  Передаються: email, деталі замовлення.
                </li>
                <li>
                  <strong className="text-foreground">Хостинг-провайдери</strong> —
                  для забезпечення роботи Сайту та зберігання даних. Дані зберігаються
                  на серверах, що забезпечують належний рівень захисту.
                </li>
              </ul>
              <p>
                Ми <strong className="text-foreground">не продаємо</strong> та не
                передаємо персональні дані третім особам у комерційних цілях.
              </p>
              <p>
                Передача персональних даних державним органам здійснюється виключно
                у випадках та порядку, передбачених законодавством України.
              </p>
            </div>
          </div>

          {/* 7. Передача за кордон */}
          <div>
            <h2 className="text-base font-medium uppercase tracking-[0.1em] md:text-lg">
              7. Транскордонна передача даних
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              <p>
                Для забезпечення роботи Сайту ми використовуємо послуги хостинг-провайдерів
                та сервісів, сервери яких можуть розташовуватися за межами України.
              </p>
              <p>
                Відповідно до ст. 29 Закону, передача персональних даних здійснюється
                лише до країн, які забезпечують належний рівень захисту персональних
                даних, зокрема до держав — учасниць Конвенції Ради Європи про захист
                осіб у зв&apos;язку з автоматизованою обробкою персональних даних.
              </p>
            </div>
          </div>

          {/* 8. Строки зберігання */}
          <div>
            <h2 className="text-base font-medium uppercase tracking-[0.1em] md:text-lg">
              8. Строки зберігання персональних даних
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              <p>
                Персональні дані зберігаються не довше, ніж це необхідно для цілей,
                для яких вони збиралися (ч. 8 ст. 6 Закону):
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-foreground">Дані облікового запису</strong> —
                  протягом усього періоду використання акаунту та до моменту його
                  видалення на вимогу Користувача.
                </li>
                <li>
                  <strong className="text-foreground">Дані замовлень</strong> —
                  не менше 1095 днів (3 роки) з дня подання податкової звітності за
                  відповідний період, відповідно до п. 44.3 ст. 44 Податкового кодексу
                  України.
                </li>
                <li>
                  <strong className="text-foreground">Дані підписки на розсилку</strong> —
                  до моменту відписки Користувача.
                </li>
                <li>
                  <strong className="text-foreground">Технічні дані (cookies, серверні журнали)</strong> —
                  протягом строку дії сесії авторизації або до 30 днів для серверних
                  журналів.
                </li>
              </ul>
              <p>
                Після закінчення строку зберігання персональні дані видаляються або
                знеособлюються відповідно до ст. 15 Закону.
              </p>
            </div>
          </div>

          {/* 9. Захист даних */}
          <div>
            <h2 className="text-base font-medium uppercase tracking-[0.1em] md:text-lg">
              9. Захист персональних даних
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              <p>
                Відповідно до ст. 24 Закону, ми вживаємо необхідних організаційних
                та технічних заходів для захисту персональних даних від випадкових
                втрати або знищення, незаконної обробки та несанкціонованого доступу:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Шифрування з&apos;єднання за протоколом HTTPS (SSL/TLS)</li>
                <li>Зберігання паролів у захешованому вигляді (bcrypt)</li>
                <li>Розмежування прав доступу до бази даних (Row Level Security)</li>
                <li>Регулярне оновлення програмного забезпечення</li>
                <li>Обмеження доступу до персональних даних лише для уповноважених осіб</li>
              </ul>
            </div>
          </div>

          {/* 10. Права суб'єкта */}
          <div>
            <h2 className="text-base font-medium uppercase tracking-[0.1em] md:text-lg">
              10. Права суб&apos;єкта персональних даних
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              <p>
                Відповідно до ст. 8 Закону, Ви маєте право:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-foreground">Знати</strong> про джерела
                  збирання, місцезнаходження своїх персональних даних, мету їх обробки.
                </li>
                <li>
                  <strong className="text-foreground">Отримувати інформацію</strong> про
                  умови надання доступу до персональних даних, зокрема інформацію про
                  третіх осіб, яким передаються дані.
                </li>
                <li>
                  <strong className="text-foreground">Отримати доступ</strong> до своїх
                  персональних даних не пізніше ніж за 30 календарних днів з дня запиту.
                </li>
                <li>
                  <strong className="text-foreground">Вимагати зміни або знищення</strong> своїх
                  персональних даних, якщо вони обробляються незаконно чи є недостовірними.
                </li>
                <li>
                  <strong className="text-foreground">Відкликати згоду</strong> на
                  обробку персональних даних.
                </li>
                <li>
                  <strong className="text-foreground">Заперечити</strong> проти
                  обробки персональних даних.
                </li>
                <li>
                  <strong className="text-foreground">Знати механізм</strong> автоматичної
                  обробки персональних даних.
                </li>
                <li>
                  <strong className="text-foreground">Оскаржити</strong> дії чи бездіяльність
                  Володільця — звернутися зі скаргою до Уповноваженого Верховної Ради
                  України з прав людини або до суду.
                </li>
              </ul>
            </div>
          </div>

          {/* 11. Як реалізувати свої права */}
          <div>
            <h2 className="text-base font-medium uppercase tracking-[0.1em] md:text-lg">
              11. Порядок реалізації прав
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              <p>
                Для реалізації своїх прав, передбачених ст. 8 Закону, Ви можете
                звернутися до нас одним із наступних способів:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Електронна пошта:{" "}
                  <a
                    href="mailto:daki.fashion.ua@gmail.com"
                    className="underline hover:text-foreground"
                  >
                    daki.fashion.ua@gmail.com
                  </a>
                </li>
                <li>
                  Через{" "}
                  <Link href="/contact" className="underline hover:text-foreground">
                    форму зворотного зв&apos;язку
                  </Link>{" "}
                  на Сайті
                </li>
              </ul>
              <p>
                Ми розглянемо Ваше звернення протягом 30 календарних днів з дня
                його надходження відповідно до ст. 16 Закону. У разі потреби цей
                строк може бути продовжено до 45 календарних днів з обов&apos;язковим
                повідомленням (ст. 17 Закону).
              </p>
              <p>
                Для видалення облікового запису та всіх пов&apos;язаних персональних
                даних надішліть запит на вказану електронну пошту. Ми видалимо дані
                протягом 30 днів, за винятком тих, що підлягають обов&apos;язковому
                зберіганню відповідно до законодавства (п. 44.3 ст. 44 Податкового
                кодексу України).
              </p>
            </div>
          </div>

          {/* 12. Використання Сайту неповнолітніми */}
          <div>
            <h2 className="text-base font-medium uppercase tracking-[0.1em] md:text-lg">
              12. Використання Сайту неповнолітніми
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              <p>
                Сайт не призначений для осіб, які не досягли 18 років. Ми свідомо
                не збираємо персональні дані неповнолітніх. Здійснення онлайн-оплати
                доступне лише особам, які досягли повної цивільної дієздатності
                відповідно до ст. 34 Цивільного кодексу України.
              </p>
            </div>
          </div>

          {/* 13. Зміни до Політики */}
          <div>
            <h2 className="text-base font-medium uppercase tracking-[0.1em] md:text-lg">
              13. Зміни до Політики конфіденційності
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              <p>
                Ми залишаємо за собою право вносити зміни до цієї Політики. Актуальна
                версія завжди доступна на цій сторінці. Дата останнього оновлення
                вказана на початку документа.
              </p>
              <p>
                У разі суттєвих змін ми повідомимо Користувачів шляхом розміщення
                відповідного повідомлення на Сайті або надсилання електронного листа.
              </p>
            </div>
          </div>

          {/* 14. Контакти */}
          <div>
            <h2 className="text-base font-medium uppercase tracking-[0.1em] md:text-lg">
              14. Контактна інформація
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              <p>
                З питань, що стосуються обробки та захисту персональних даних,
                звертайтеся:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-foreground">Володілець:</strong> ТМ &quot;DaKi&quot;
                </li>
                <li>
                  <strong className="text-foreground">Email:</strong>{" "}
                  <a
                    href="mailto:daki.fashion.ua@gmail.com"
                    className="underline hover:text-foreground"
                  >
                    daki.fashion.ua@gmail.com
                  </a>
                </li>
              </ul>
              <p>
                У разі незадоволення відповіддю Ви маєте право звернутися зі скаргою
                до Уповноваженого Верховної Ради України з прав людини (ст. 22, 23 Закону).
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
