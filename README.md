# DaKi Wholesale

Стильный B2B сайт для компании по продаже верхней женской одежды.

## Что реализовано

- Marketing страницы: `/`, `/catalog`, `/pricing`
- Мультиязычность: русский, украинский, английский
- Auth flow: `/login`, `/signup`, `/verify`, `/forgot-password`, `/new-password`, `/success`
- Личный кабинет: `/dashboard`, `/orders`, `/settings`
- Админ-панель: `/admin`
- API маршруты: auth callback, profile, admin, discounts, settings, email, models, webhooks
- Каталог с фильтрами по скидке, году, стилю, сезону, наличию
- Учет остатков по ростовкам + движения товара (поступление/продажа)
- SQL схема Supabase с RLS: `supabase/schema.sql`

## Стек

- Next.js 15 (App Router), TypeScript
- Tailwind CSS + shadcn-compatible UI
- Framer Motion
- Supabase Auth + PostgreSQL
- Resend (email broadcast)

## Быстрый запуск

1. Установить зависимости:

```bash
npm install
```

2. Создать локальные переменные:

```bash
cp .env.local.example .env.local
```

3. Заполнить значения Supabase и сервисов в `.env.local`.

4. В Supabase выполнить SQL из `supabase/schema.sql`.

5. Запустить проект:

```bash
npm run dev
```

## Полезные команды

```bash
npm run lint
npm run type-check
npm run build
```

## Важно

- Без настроенного Supabase маркетинговые страницы и каталог откроются с mock-данными.
- Для входа, заказов и админ-панели требуется рабочий Supabase проект и schema.sql.
