# DaKi Platform - Handover Document
# Документ передачи проекта новому разработчику
**Дата:** 17.03.2026

---

## 1. Что это за проект

**DaKi** — e-commerce платформа для продажи верхнего женского одежды (розница + опт).

**Стек:**
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Деплой:** Vercel (проект `new-site`)
- **Домен:** dakifashion.com (через Cloudflare DNS)
- **Уведомления:** Telegram Bot, Resend (email), Google Sheets
- **Каталог:** sync-скрипт из локальных файлов + админ-панель

---

## 2. Как запустить локально

```bash
cd D:\DaKi
npm install
npm run dev
# Откроется http://localhost:3000
```

Все env-переменные в `.env.local` (НЕ коммитить!).

---

## 3. Структура проекта

```
D:\DaKi/
├── app/                      # Next.js App Router
│   ├── (marketing)/          # Публичные страницы (каталог, про нас, контакты, профиль)
│   │   ├── catalog/[id]/     # Страница товара (product-page-client.tsx)
│   │   ├── about/            # Про нас
│   │   ├── contact/          # Контакты
│   │   ├── profile/          # Профиль пользователя + Мої замовлення
│   │   ├── cart/             # Корзина + оформление заказа
│   │   └── admin/            # Админ-панель (клиентский компонент)
│   ├── api/                  # API routes
│   │   ├── orders/           # Создание заказов (POST)
│   │   ├── admin/            # Админские API (models CRUD, upload, orders, revenue)
│   │   │   ├── models/[id]/  # PATCH/DELETE модели
│   │   │   ├── upload/       # Загрузка файлов <4MB
│   │   │   └── upload-url/   # Signed URL для файлов >4MB
│   │   ├── telegram/         # Telegram Bot webhook + setup
│   │   ├── settings/         # Публичный API настроек (hero, контакты)
│   │   └── newsletter/       # Рассылка
│   └── auth/                 # Auth callbacks (confirm, callback)
├── components/
│   ├── admin/                # admin-panel.tsx — ГЛАВНЫЙ ФАЙЛ АДМИНКИ (~1500+ строк)
│   ├── catalog/              # Компоненты товара (hero, description, delivery, size-chart)
│   ├── landing/              # Компоненты главной страницы
│   ├── marketing/            # Header, Footer
│   └── ui/                   # shadcn/ui компоненты
├── hooks/
│   └── use-realtime.ts       # Supabase Realtime подписки
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # Клиент Supabase (браузер)
│   │   ├── server.ts         # Серверный клиент (SSR)
│   │   └── admin.ts          # Service Role клиент (обходит RLS)
│   ├── constants.ts          # Контакты, ссылки
│   └── data.ts               # Серверные функции загрузки данных
├── scripts/
│   └── sync-catalog.ts       # Синхронизация каталога из info-файлов
├── style/catalog/            # Локальные фото и info-файлы моделей
├── supabase/
│   ├── schema.sql            # ЕДИНЫЙ SQL-скрипт всей БД
│   ├── fix-auth.sql          # Фикс авторизации
│   ├── nuclear-fix.sql       # Комплексный фикс auth + RLS
│   ├── migrate-add-columns.sql
│   └── migrate-orders-fix.sql
└── middleware.ts              # Auth middleware (пропускает публичные страницы)
```

---

## 4. Ключевые файлы и что они делают

### Админ-панель
- **`components/admin/admin-panel.tsx`** — основной файл. ~1500 строк. Содержит ВСЕ вкладки: Товари, Замовлення, Виручка, Користувачі, Головна сторінка, Розсилка, Контакти.
- Вкладки стилизованы как iOS segmented control.
- Drag & drop для перетаскивания цветовых вариантов модели (@dnd-kit).
- Realtime подписки: админ видит новые заказы и изменения моделей без перезагрузки.

### Страница товара
- **`app/(marketing)/catalog/[id]/product-page-client.tsx`** — рендерит 4 блока:
  1. Hero (цвет, цена, корзина, messenger-ссылки)
  2. Описание (текст/HTML + изображение)
  3. Правила доставки + возврат
  4. Таблица размеров
- Поддерживает HTML-контент (через `dangerouslySetInnerHTML` с проверкой `isHtml`).
- Messenger-ссылки ведут на @daki_support с URL товара в тексте.

### Realtime
- **`hooks/use-realtime.ts`** — хук `useRealtimeTable(table, onUpdate, options)`.
- Подписка на `postgres_changes` через Supabase Realtime.
- Используется в admin-panel (orders + catalog_models) и profile (orders).
- **ВАЖНО:** В Supabase нужно включить: `ALTER PUBLICATION supabase_realtime ADD TABLE orders, catalog_models;`

### Telegram Bot
- **`app/api/telegram/webhook/route.ts`** — обработка webhook:
  - `/start` — регистрация подписчика (только из whitelist!)
  - `callback_query` — inline-кнопки смены статуса заказа (Підтверджено/Відправлено/Доставлено)
  - Статусы синхронизируются между всеми подписчиками
- **Ограничение доступа:** env `TELEGRAM_ALLOWED_USERS` — список chat_id через запятую. Неавторизованные получают сообщение с их chat_id для добавления.

### Синхронизация каталога
- **`scripts/sync-catalog.ts`** — парсит `style/catalog/{category}/{sku}/info` файлы.
- Загружает фото из `{ColorName}/1.JPG` в Supabase Storage.
- Создает записи в `catalog_models`, `model_colors`, `model_sizes`.
- Секции в info-файлах определяются массивом `SECTION_PATTERNS` (Опис, Склад, Правила доставки, Правила повернення, Таблиця розмірів).
- **Запуск:** `npm run sync`

### Скорость оптимизации
- `createAdminClient()` — обходит RLS, быстрее обычного клиента.
- `Promise.all` — параллельное обновление модели/цветов/размеров.
- Middleware пропускает auth-check для публичных страниц.
- Next.js `after()` — уведомления (email, Telegram, Google Sheets) отправляются фоново.

---

## 5. База данных (Supabase)

**Проект:** `goihhwjnsbzdtfzldxzb` (daki-tech's Project)

### Таблицы:
| Таблица | Описание |
|---------|----------|
| `profiles` | Профили пользователей (id ссылается на auth.users) |
| `catalog_models` | Модели одежды (sku, name, price, description, delivery_info, return_info, size_chart) |
| `model_sizes` | Размеры и остатки для каждой модели |
| `model_colors` | Цветовые варианты модели (name, hex, image_urls, is_default) |
| `orders` | Заказы (order_number serial, статусы: draft/confirmed/shipped/completed/cancelled) |
| `order_items` | Позиции заказа |
| `admin_settings` | Настройки сайта (key-value, jsonb) |
| `discounts` | Скидки |
| `subscriptions` | Подписки пользователей |
| `telegram_subscribers` | Подписчики Telegram-бота |
| `telegram_order_messages` | Связь заказ ↔ сообщение в Telegram (для обновления inline-кнопок) |
| `newsletter_subscribers` | Подписчики email-рассылки |
| `stock_movements` | Движение товаров |
| `webhook_events` | Логи вебхуков |

### RLS (Row Level Security):
- Все таблицы защищены RLS.
- `is_admin_user()` — функция SECURITY DEFINER, проверяет `profiles.is_admin`.
- Каталог: публичный SELECT, админ — полный доступ.
- Заказы: INSERT открыт для всех (guest checkout), SELECT/UPDATE — свой или админ.

### Единый SQL:
Файл `supabase/schema.sql` — полный скрипт создания всех таблиц, индексов, RLS-политик, триггеров. Безопасен для повторного запуска (IF NOT EXISTS, DROP IF EXISTS).

---

## 6. Внешние сервисы

| Сервис | Для чего | Настройка |
|--------|----------|-----------|
| **Vercel** | Деплой, хостинг | Проект `new-site`, env vars в dashboard |
| **Supabase** | БД, Auth, Storage, Realtime | Проект `goihhwjnsbzdtfzldxzb` |
| **Telegram Bot** | Уведомления о заказах + управление статусами | Token в env, webhook на `/api/telegram/webhook` |
| **Resend** | Email (подтверждение регистрации, рассылки) | API key в env, домен dakifashion.com |
| **Google Sheets** | Дублирование заказов | Webhook URL в env |
| **Nova Poshta API** | Поиск городов и отделений для доставки | API key в env |
| **Cloudflare** | DNS, SSL | Dashboard (WAF не настроен) |
| **Google OAuth** | Вход через Google | Client ID/Secret в env + Supabase Auth providers |

---

## 7. ENV-переменные

```
NEXT_PUBLIC_SUPABASE_URL        # Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Supabase anon key (публичный)
SUPABASE_SERVICE_ROLE_KEY       # Service role key (СЕКРЕТ! Только сервер)
NEXT_PUBLIC_APP_URL             # URL сайта
TELEGRAM_BOT_TOKEN              # Токен Telegram бота
TELEGRAM_CHAT_ID                # Основной chat_id админа
TELEGRAM_ALLOWED_USERS          # Разрешенные chat_id (через запятую)
GOOGLE_SHEETS_WEBHOOK_URL       # URL Apps Script для Google Sheets
NOVA_POSHTA_API_KEY             # API ключ Новой Почты
RESEND_API_KEY                  # API ключ Resend
RESEND_FROM_EMAIL               # Email отправителя
GOOGLE_CLIENT_ID                # Google OAuth
GOOGLE_CLIENT_SECRET            # Google OAuth
```

**ВАЖНО:** После добавления/изменения env в Vercel нужен редеплой!

---

## 8. Как деплоить

```bash
# Вариант 1: Через Vercel CLI
vercel --prod

# Вариант 2: Push в GitHub → автоматический деплой
git push origin main
```

Vercel автоматически деплоит при push в main.

---

## 9. Что было сделано (полный список выполненных задач)

### Сессия 1 (13-14.03):
- Стилизация админ-панели под стиль сайта
- Удаление вкладки "Лендинг", надписи "Адмін-панель"
- iOS-стиль вкладок (segmented control)
- Форма добавления/редактирования модели (все поля)
- Разделы: Товари, Замовлення, Виручка, Користувачі, Головна, Розсилка, Контакти
- Значок скидки (pill с градиентом)
- Футер: соцсети в "Контакти", 4 блока равномерно
- Хедер: центрирование навигации
- Формат Telegram-уведомления (артикул, "просит связаться")
- Удаление /dashboard, редирект на /profile
- "Запомнить меня" — автозаполнение
- Сброс пароля через код
- Карточка пользователя/заказа (попап)
- Сортировка товаров по остаткам/проданным
- Выручка по месяцам/годам
- Редактирование главной страницы через админку
- Контакты из admin_settings
- Загрузка видео через signed URL (>4MB)
- Оптимизация скорости сайта

### Сессия 2 (15-16.03):
- Email privacy fix
- Перевод админ-панели (РУС → УКР переключение)
- Фильтр выручки
- Удаление ring у color swatches
- Профиль: cleanup
- Попапы заказов: улучшение
- 3 колонки статуса заказов
- Контакты: layout
- iOS-стиль страниц
- Telegram bot: inline кнопки (Підтверджено/Відправлено/Доставлено)
- Страницы Про нас/Контакти: full-width

### Сессия 3 (16-17.03):
- **Описания моделей:** Заполнены для всех 3 основных моделей (1366, 1368, 1371)
- **Sync script fix:** Удален `wholesale_price` (колонка не существует)
- **Supabase Realtime:** Создан hook `use-realtime.ts`, интегрирован в админку и профиль
- **Номера заказов от 1398:** SQL для `setval()`
- **Фото рекомендации на "Про нас":** Размеры в комментариях
- **Drag & drop:** Перетаскивание цветовых вариантов модели (@dnd-kit)
- **Color swatch ring:** Убран круг, оставлен border + scale
- **delivery_info/return_info/size_chart:** Обнаружены ОТСУТСТВУЮЩИЕ колонки! Добавлены ALTER TABLE
- **Messenger ссылки:** @daki_support с URL товара
- **Скорость сохранения:** createAdminClient + Promise.all
- **Info файлы:** Переписаны с правильными секциями
- **SQL заполнение моделей:** Все 8 моделей теперь имеют description, delivery_info, return_info, size_chart
- **Telegram bot whitelist:** Ограничение доступа через TELEGRAM_ALLOWED_USERS
- **Unified schema.sql:** Все миграции в одном файле

---

## 10. Что НЕ сделано (задачи для нового разработчика)

| # | Задача | Приоритет | Подробности |
|---|--------|-----------|-------------|
| 1 | **Деплой на Vercel** | КРИТИЧЕСКИЙ | Все изменения ЛОКАЛЬНЫЕ. Живой сайт dakifashion.com работает на СТАРОМ коде! Нужен `git push` + деплой |
| 2 | **Vercel env: TELEGRAM_ALLOWED_USERS** | КРИТИЧЕСКИЙ | Добавить в Vercel Dashboard → Settings → Environment Variables |
| 3 | **Добавить chat_id 3 менеджеров** | Высокий | Каждый шлет /start боту → получает свой chat_id → добавить в TELEGRAM_ALLOWED_USERS через запятую |
| 4 | **Supabase SQL** | Высокий | Выполнить если ещё не: `ALTER PUBLICATION supabase_realtime ADD TABLE orders, catalog_models;` и `SELECT setval(pg_get_serial_sequence('orders', 'order_number'), 1397, true);` |
| 5 | **Cloudflare WAF** | Средний | Настроить защиту: rate limiting, bot protection, WAF rules |
| 6 | **Универсальный blueprint** | Низкий | Объединить PROJECT-BLUEPRINT.md + project-config.md в один файл |
| 7 | **Email рассылка тест** | Средний | Протестировать раздел "Розсилка" в админке |
| 8 | **vitpad17@gmail.com только админка** | Низкий | В middleware.ts перенаправлять admin-email на /admin |

---

## 11. Частые проблемы и решения

### "delivery_info не сохраняется"
→ Колонки `delivery_info`, `return_info`, `size_chart` были ДОБАВЛЕНЫ через ALTER TABLE. Если на новом Supabase их нет — запустить `schema.sql`.

### "Sync script падает с wholesale_price"
→ Колонка была удалена из модели. В sync-скрипте строка убрана.

### "Бот отвечает всем"
→ Настроена фильтрация через `TELEGRAM_ALLOWED_USERS`. Если env пустой — fallback на `TELEGRAM_CHAT_ID`.

### "Заказы не появляются в реалтайме"
→ Нужно выполнить SQL: `ALTER PUBLICATION supabase_realtime ADD TABLE orders;`

### "Slow saves in admin"
→ Использован `createAdminClient()` (обходит RLS) + `Promise.all` для параллельных операций.

### "500 на регистрации/логине"
→ Запустить `supabase/nuclear-fix.sql` — комплексный фикс триггеров auth.users.

---

## 12. Как добавить нового менеджера в Telegram бот

1. Менеджер открывает бота и шлет `/start`
2. Бот отвечает: "У вас немає доступу. Ваш Chat ID: XXXXXXX"
3. Добавить этот ID в `TELEGRAM_ALLOWED_USERS` (через запятую):
   - Локально: `.env.local`
   - На продакшне: Vercel Dashboard → Environment Variables
4. Редеплой (для Vercel)

---

## 13. Контакты и доступы

- **Supabase:** supabase.com → daki-tech's Project
- **Vercel:** vercel.com → daki-techs-projects/new-site
- **Cloudflare:** dash.cloudflare.com (DNS dakifashion.com)
- **Resend:** resend.com (домен dakifashion.com)
- **Google Cloud:** console.cloud.google.com (OAuth, Apps Script)
- **Admin аккаунт:** vitpad17@gmail.com (is_admin = true в profiles)
