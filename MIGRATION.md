# Миграция DaKi на новые аккаунты

Инструкция для переноса проекта на новые Supabase / Vercel / Resend / GitHub / Cloudflare.

## 1. Переменные окружения

Все ключи хранятся в одном месте — `.env.local` (локально) и Vercel Dashboard → Settings → Environment Variables (прод).

### Список всех переменных:

| Переменная | Откуда взять | Описание |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → URL | URL проекта |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key | Публичный ключ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key | Серверный ключ (секретный!) |
| `NEXT_PUBLIC_APP_URL` | Ваш домен | `https://dakifashion.com` для прода |
| `TELEGRAM_BOT_TOKEN` | @BotFather в Telegram | Токен бота |
| `TELEGRAM_CHAT_ID` | Чат-ID получателя уведомлений | Числовой ID |
| `GOOGLE_SHEETS_WEBHOOK_URL` | Google Apps Script → Deploy → Web App URL | Вебхук для записи заказов |
| `RESEND_API_KEY` | resend.com → API Keys | Ключ для отправки писем |
| `RESEND_FROM_EMAIL` | resend.com → Domains (верифицированный) | `noreply@dakifashion.com` |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → Credentials | OAuth (если используется) |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → Credentials | OAuth секрет |

## 2. Порядок переноса

### Шаг 1: Новый Supabase
1. Создать проект на supabase.com
2. Открыть SQL Editor
3. Вставить и выполнить **весь** файл `supabase/schema.sql`
4. В Settings → Auth → URL Configuration указать новый домен сайта
5. Скопировать URL, anon key, service_role key

### Шаг 2: Новый Vercel
1. Import проект с GitHub
2. Добавить все переменные окружения из таблицы выше
3. Deploy

### Шаг 3: Новый Resend
1. Зарегистрироваться на resend.com
2. Добавить и верифицировать домен (DNS записи)
3. Создать API ключ
4. Обновить `RESEND_API_KEY` и `RESEND_FROM_EMAIL`

### Шаг 4: Новый Telegram-бот
1. @BotFather → /newbot → получить токен
2. Написать боту `/start`
3. Получить chat_id (https://api.telegram.org/bot{TOKEN}/getUpdates)
4. Обновить `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`

### Шаг 5: Google Sheets
1. Создать таблицу, открыть Apps Script
2. Настроить вебхук (код есть в репо)
3. Deploy as Web App → скопировать URL
4. Обновить `GOOGLE_SHEETS_WEBHOOK_URL`

### Шаг 6: GitHub
1. Fork или push в новый репозиторий
2. В Vercel привязать новый репо

### Шаг 7: Cloudflare (опционально)
1. Добавить домен в Cloudflare
2. Сменить NS у регистратора
3. Включить: SSL Full (Strict), WAF, DDoS Protection, Bot Fight Mode
4. Подробнее — см. раздел Cloudflare ниже

## 3. Cloudflare — настройка безопасности

### Что нужно сделать:
1. **Добавить домен** → Cloudflare Dashboard → Add Site → `dakifashion.com`
2. **Сменить nameservers** у регистратора домена на те, что покажет Cloudflare
3. **SSL/TLS** → Full (Strict) — шифрование от браузера до Vercel
4. **Security → WAF** → включить Managed Rules (бесплатные)
5. **Security → Bots** → Bot Fight Mode ON
6. **Security → DDoS** → автоматически включена на всех планах
7. **Speed → Minify** → JS, CSS, HTML
8. **Caching** → Standard, Browser TTL = 4 hours
9. **Page Rules** (если нужно):
   - `/api/*` → Cache Level: Bypass (API не кэшировать)

### Это я НЕ могу сделать за тебя:
- Смена nameservers у регистратора (нужен логин к регистратору)
- Верификация домена

### Это я МОГУ сделать:
- Если ты залогинишься в Cloudflare в браузере и дашь доступ через Chrome, я смогу настроить все правила WAF, DDoS, кэширования через интерфейс
