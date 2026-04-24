# Ротація credentials після інциденту Vercel (2026-04-19)

**Контекст:** Vercel повідомив про інцидент з unauthorized access до внутрішніх систем. Наш проєкт у списку НЕ підтверджений як скомпрометований, але ротуємо превентивно.

## Перед стартом

```bash
# Переконайся що CLI залогінений
vercel login

# Привʼязати проєкт локально (раз)
vercel link

# Завантажити поточні env (перевірити, що в Vercel)
vercel env pull .env.vercel.backup
```

Генератор випадкових секретів (для webhook_secret, stock_sync тощо):

```bash
# 32 bytes hex (рекомендовано)
openssl rand -hex 32

# або base64url
openssl rand -base64 32 | tr '+/' '-_' | tr -d '='
```

## Чек-лист

Для кожного ключа: **(1)** видати новий у провайдера → **(2)** оновити у Vercel (Prod + Preview + Dev, позначити Sensitive) → **(3)** redeploy → **(4)** перевірити що працює → **(5)** відкликати старий.

### P0 — критичні

- [ ] **`SUPABASE_SERVICE_ROLE_KEY`**
  - Провайдер: https://supabase.com/dashboard/project/goihhwjnsbzdtfzldxzb/settings/api-keys
  - Дія: згенерувати новий service_role key, скопіювати
  - Vercel: `vercel env rm SUPABASE_SERVICE_ROLE_KEY production preview development` → `vercel env add SUPABASE_SERVICE_ROLE_KEY` (sensitive)
  - Тест після redeploy: створити тестове замовлення → перевірити що запис у БД зʼявився

- [ ] **`TELEGRAM_BOT_TOKEN`**
  - Провайдер: @BotFather у Telegram → `/revoke` → вибрати бота → отримати новий токен
  - Vercel: оновити `TELEGRAM_BOT_TOKEN`
  - Після redeploy: надіслати `/start` боту → має відповісти
  - Додатково: перевстановити webhook: `POST https://<ваш-домен>/api/telegram/setup-webhook`

- [ ] **`CHECKBOX_LICENSE_KEY`**
  - Провайдер: https://dashboard.checkbox.ua → Налаштування → API
  - Vercel: оновити
  - Тест: тестова оплата в sandbox

- [ ] **`CHECKBOX_CASHIER_LOGIN` + `CHECKBOX_CASHIER_PASSWORD`**
  - Провайдер: Checkbox dashboard → Касири → створити нового касира або скинути пароль
  - Vercel: оновити обидві змінні

- [ ] **`CHECKBOX_WEBHOOK_SECRET`**
  - Згенерувати: `openssl rand -hex 32`
  - Провайдер: Checkbox dashboard → Webhooks → вставити новий secret
  - Vercel: оновити
  - Тест: переглянути [app/api/payment/callback/route.ts](app/api/payment/callback/route.ts) — signature verification має проходити

- [ ] **`RESEND_API_KEY`**
  - Провайдер: https://resend.com/api-keys → Create (full access) → Revoke старий
  - Vercel: оновити
  - Тест: відправити тестовий лист через admin UI

### P1 — за добу

- [ ] **`NOVA_POSHTA_API_KEY`**
  - Провайдер: https://novaposhta.ua/profile/api (особистий кабінет)
  - Vercel: оновити
  - Тест: відкрити checkout → підвантаження відділень має працювати

- [ ] **`STOCK_SYNC_SECRET`** (shared secret з Google Apps Script)
  - Згенерувати: `openssl rand -hex 32`
  - Оновити у двох місцях одночасно:
    - Vercel env
    - Google Apps Script → Файл `.env` або `Script properties` → `STOCK_SYNC_SECRET`
  - Тест: запустити синхронізацію складу вручну

- [ ] **Google Apps Script webhook URLs**
  - `GOOGLE_SHEETS_WEBHOOK_URL`, `GOOGLE_SHEETS_STOCK_WEBHOOK_URL`, `GOOGLE_FINANCE_WEBHOOK_URL`, `GOOGLE_PERSONAL_WEBHOOK_URL`
  - У кожному Apps Script проєкті: **Deploy → New deployment** → отримати новий URL
  - Vercel: оновити відповідний env
  - Старий deployment: **Manage deployments → Archive**
  - Тест: створити замовлення (перевірити що йде у лист), /finance у боті (GOOGLE_FINANCE_WEBHOOK_URL)

### P2 — перевірка

- [x] **LemonSqueezy env vars** — код видалено у цьому branch. Після merge видалити з Vercel:
  - `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET`
  - `vercel env rm LEMONSQUEEZY_API_KEY production preview development`
  - (і для інших двох)

- [ ] **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** — публічний, ротація лише разом із JWT secret (зламає всі живі сесії). **Не чіпати без необхідності.**

## Vercel CLI — шпаргалка

```bash
# Переглянути всі env
vercel env ls

# Видалити конкретну змінну з усіх оточень
vercel env rm NAME production
vercel env rm NAME preview
vercel env rm NAME development

# Додати (інтерактивно попросить значення; якщо Sensitive — окремий промпт)
vercel env add NAME production

# Redeploy production
vercel --prod

# Подивитись логи prod
vercel logs <deployment-url>

# Переглянути деплої
vercel ls
```

## Активність до ротації

Після інциденту обовʼязково перевірити:

- [ ] Vercel Audit Log: https://vercel.com/daki-tech/~/settings/audit-log
- [ ] Supabase Auth → Users → останні логіни адмінів
- [ ] Supabase Logs → Unusual query patterns за останні 2 тижні
- [ ] Resend → Logs: чи не було неавторизованих відправок

## Sensitive Environment Variables

Після ротації всі секретні змінні позначити як Sensitive у Vercel UI:
Project → Settings → Environment Variables → напроти кожної серветної → ☑ "Sensitive"

Це запобігає їх відображенню у UI і prevent download через `vercel env pull`.
