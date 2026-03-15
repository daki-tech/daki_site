# Project Configuration

> **Generated from:** PROJECT-BLUEPRINT.md v1.0
> **Instructions:** Check `[x]` for features you want, uncheck `[ ]` for features to skip.
> For stack choices, select **ONE** option per category.
> Fill in `___` fields with your project-specific values.
> AI reads this file + `PROJECT-BLUEPRINT.md` (located at `D:\project-template\PROJECT-BLUEPRINT.md`) and generates the project.

---

## 1. Project Info

| Field | Value |
|-------|-------|
| **Project Name** | `___` |
| **Project Description** | `___` |
| **Domain** | `___` |
| **Default Locale** | `en` |
| **Author** | `___` |

---

## 2. Tech Stack

> Select **ONE** per category. Mark with `[x]`.

### Framework
- [x] Next.js 15 (App Router)
- [ ] Next.js 14 (App Router)
- [ ] Nuxt 3
- [ ] SvelteKit

### Language
- [x] TypeScript
- [ ] JavaScript

### Styling
- [x] Tailwind CSS + shadcn/ui
- [ ] Tailwind CSS (no component library)
- [ ] CSS Modules
- [ ] Styled Components

### Animation Library
- [x] Framer Motion
- [ ] CSS only (Tailwind animate)
- [ ] GSAP
- [ ] None

### Database
- [x] Supabase (PostgreSQL)
- [ ] Firebase (Firestore)
- [ ] Planetscale (MySQL + Prisma)
- [ ] MongoDB (Mongoose)
- [ ] None (static site)

### Authentication
- [x] Supabase Auth
- [ ] Firebase Auth
- [ ] NextAuth.js / Auth.js
- [ ] Clerk
- [ ] None

### Payments
- [x] LemonSqueezy
- [ ] Stripe
- [ ] Paddle
- [ ] None

### Email Service
- [x] Resend
- [ ] SendGrid
- [ ] Mailgun
- [ ] AWS SES
- [ ] None

### File Storage
- [ ] Supabase Storage
- [ ] AWS S3
- [ ] Cloudflare R2
- [ ] Uploadthing
- [x] None

### Analytics
- [ ] Vercel Analytics
- [ ] Google Analytics
- [ ] Plausible
- [ ] PostHog
- [x] None

### Error Tracking
- [ ] Sentry
- [ ] LogRocket
- [x] None

### Hosting / CDN
- [x] Vercel
- [ ] Netlify
- [ ] Cloudflare Pages
- [ ] Docker (self-hosted)

---

## 3. Authentication Features

### Auth Methods
- [x] Email + Password
- [x] Magic Link / OTP verification
- [ ] Passwordless (magic link only)

### OAuth Providers
- [x] Google
- [ ] GitHub
- [ ] Apple
- [ ] Discord
- [ ] Twitter / X
- [ ] Facebook
- [ ] Microsoft

### Auth Features
- [x] Remember me toggle
- [x] Forgot password / reset flow
- [x] Password strength indicator
- [x] Caps Lock detection
- [ ] Two-factor authentication (2FA / TOTP)
- [x] Email verification (OTP step)
- [ ] Account deletion
- [x] Session management (auto-logout on browser close)

---

## 4. Pages & Routes

### Marketing / Public Pages
- [x] Landing page — minimal (hero + CTA)
- [ ] Landing page — full (hero + features grid + testimonials + CTA)
- [x] Pricing page
- [ ] Contact / Support page
- [ ] Blog
- [ ] Changelog / What's New
- [ ] Documentation / Help center
- [ ] FAQ page (standalone)

### Auth Pages
- [x] Login page
- [x] Signup page
- [x] OTP verification screen
- [x] Forgot password screen
- [x] New password screen
- [x] Success / redirect screen

### Dashboard / App Pages
- [x] Dashboard (main app area)
- [x] Settings page (profile + subscription combined)
- [ ] Profile page (separate from settings)
- [ ] Notifications center
- [ ] Onboarding wizard (first-time user)

### Admin Pages
- [x] Admin panel
  - [x] User stats dashboard
  - [x] User management (search, grant/revoke)
  - [x] Discount management
  - [x] Email broadcast
  - [x] Payment settings
  - [ ] Feature flags
  - [ ] Audit log viewer

### Legal Pages
- [ ] Privacy Policy
- [ ] Terms of Service
- [ ] Cookie Policy

### Error Pages
- [ ] Custom 404 page
- [ ] Custom 500 / error page

---

## 5. UI / UX Features

### Theme
- [x] Dark / Light toggle
- [ ] System preference detection (auto-detect OS theme)
- [x] Theme persistence (localStorage)
- [x] Profile-synced theme (database)

### Internationalization (i18n)
- [x] Multi-language support
- [x] Geo-detection (IP country via Vercel header)
- [x] Accept-Language header fallback
- [x] Language selector in navbar
- [x] Profile-synced language (database)
- [x] Marketing pages: localStorage language persistence

**Languages** (check all needed):
- [x] English (en)
- [ ] Ukrainian (uk)
- [ ] Russian (ru)
- [ ] Spanish (es)
- [ ] French (fr)
- [ ] Italian (it)
- [ ] German (de)
- [ ] Portuguese (pt)
- [ ] Chinese (zh)
- [ ] Japanese (ja)
- [ ] Korean (ko)
- [ ] Arabic (ar)
- [ ] Other: `___`

### Responsive Design
- [x] Mobile-first responsive layout
- [x] Full viewport height app layout (`h-[100dvh]`)
- [ ] Sidebar navigation (desktop)
- [x] Header navigation (horizontal)
- [x] Burger menu (mobile)

### Components & Patterns
- [x] Toast notifications (Sonner)
- [x] Loading spinners
- [ ] Skeleton loading states
- [ ] Loading.tsx suspense boundaries
- [x] Profile dropdown (avatar, name, settings, logout)
- [ ] Command palette (Cmd+K)
- [ ] Breadcrumbs
- [ ] Pagination component
- [ ] Data tables (sortable, filterable)
- [x] Modal dialogs
- [x] Tooltips
- [x] Badges
- [x] Cards

### Animations
- [x] Page transitions (fade-in, slide-up)
- [x] Staggered element animations
- [ ] Scroll-triggered animations
- [ ] Micro-interactions (hover, focus effects)
- [x] Step transitions (AnimatePresence for auth flow)

---

## 6. API & Backend

### API Patterns
- [x] Route handlers (GET, POST, PATCH, DELETE)
- [x] Auth-protected API routes
- [x] Admin-protected API routes
- [x] Webhook handlers with HMAC signature verification

### API Routes (check what you need)
- [x] `/api/auth/callback` — OAuth code exchange
- [x] `/api/ensure-profile` — profile upsert on login
- [x] `/api/profile` — read/update user profile
- [x] `/api/webhooks/[provider]` — payment events
- [x] `/api/admin` — stats + user management
- [x] `/api/admin/settings` — config CRUD
- [x] `/api/admin/discounts` — discount CRUD
- [x] `/api/admin/email` — broadcast email
- [ ] `/api/contact` — contact form handler
- [ ] `/api/upload` — file upload handler

---

## 7. Database Schema

### Core Tables
- [x] `profiles` — user data, subscription tier, usage limits, preferences
- [x] `subscriptions` — payment provider data, status, plan, period
- [ ] `admin_settings` — key-value config store
- [ ] `discounts` — global/personal discount rules

### Database Features
- [x] Row Level Security (RLS) policies
- [x] Profile auto-creation on first login (ensure-profile pattern)
- [ ] Database migrations folder (`supabase/migrations/`)
- [ ] Seed data script

### App-Specific Tables

> Add your custom tables here. AI will create the schema + CRUD routes.

```
Table: ___
  - column_name: type (description)
  - column_name: type (description)

Table: ___
  - column_name: type (description)
  - column_name: type (description)
```

---

## 8. Email Templates

- [x] Subscription purchase confirmation
- [x] Subscription cancellation notice
- [ ] Welcome email (on signup)
- [ ] Email verification
- [ ] Password reset email
- [ ] Admin broadcast template
- [ ] Weekly digest / summary

---

## 9. Security

- [x] Security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- [ ] Content Security Policy (CSP) header
- [ ] Strict-Transport-Security (HSTS)
- [x] Middleware route protection (redirect unauth from dashboard)
- [x] Middleware auth redirect (redirect auth from login/signup)
- [x] Webhook signature verification (HMAC-SHA256)
- [x] Input validation with Zod
- [ ] CSRF protection
- [ ] Rate limiting (API routes)
- [ ] Rate limiting (auth routes)

---

## 10. SEO

- [x] Root metadata (title, description, icons)
- [ ] Per-page metadata / `generateMetadata()`
- [ ] Open Graph tags (og:title, og:image, etc.)
- [ ] Twitter Card tags
- [ ] Sitemap.xml (`app/sitemap.ts`)
- [ ] robots.txt (`app/robots.ts`)
- [ ] JSON-LD structured data
- [ ] Canonical URLs

---

## 11. DevOps & Tooling

### Linting & Formatting
- [x] ESLint (Next.js default)
- [x] Prettier
- [x] Prettier Tailwind plugin
- [ ] Husky + lint-staged (pre-commit hooks)

### Testing
- [ ] Vitest (unit tests)
- [ ] Playwright (E2E tests)
- [ ] Testing Library (component tests)

### CI/CD
- [ ] GitHub Actions: lint + type-check
- [ ] GitHub Actions: test
- [ ] GitHub Actions: deploy preview on PR
- [ ] GitHub Actions: deploy production on push to main

### Containerization
- [ ] Dockerfile (multi-stage build)
- [ ] docker-compose.yml

### Environment
- [x] `.env.local.example` with categorized variables and setup instructions
- [ ] `@t3-oss/env-nextjs` for schema-validated env vars

---

## 12. PWA

- [ ] Web app manifest (`app/manifest.ts`)
- [ ] Service worker
- [ ] Offline fallback page
- [ ] Install prompt

---

## 13. Subscription Tiers

> Define your pricing tiers. AI generates the pricing page, feature gating, and subscription logic.

### Tier 1: Free
- **Price:** $0/month
- **Limits:**
  - `___` (e.g., 1,000 characters/month)
  - `___`
- **Features:**
  - [x] `___` (e.g., Basic translation)
  - [ ] `___`

### Tier 2: Pro
- **Price:** $`___`/month
- **Limits:**
  - `___` (e.g., Unlimited)
  - `___`
- **Features:**
  - [x] Everything in Free
  - [x] `___` (e.g., AI word analysis)
  - [x] `___` (e.g., Personal dictionary)
  - [ ] `___`

### Tier 3: Enterprise (optional)
- **Price:** $`___`/month or custom
- **Features:**
  - [x] Everything in Pro
  - [x] `___` (e.g., Team management)
  - [x] `___` (e.g., API access)

---

## 14. Custom App Features

> Describe your app's unique features. AI creates pages, components, API routes, and DB tables.

### Feature 1: `___`
- **Description:** `___`
- **Route:** `/___`
- **Components needed:** `___`
- **API routes needed:** `___`
- **Database tables needed:** `___`

### Feature 2: `___`
- **Description:** `___`
- **Route:** `/___`
- **Components needed:** `___`
- **API routes needed:** `___`
- **Database tables needed:** `___`

### Feature 3: `___`
- **Description:** `___`
- **Route:** `/___`
- **Components needed:** `___`
- **API routes needed:** `___`
- **Database tables needed:** `___`

---

## 15. Social Links (footer / landing page)

- [ ] Telegram: `___`
- [ ] Instagram: `___`
- [ ] TikTok: `___`
- [ ] Twitter / X: `___`
- [ ] GitHub: `___`
- [ ] YouTube: `___`
- [ ] LinkedIn: `___`
- [ ] Discord: `___`
- [ ] Etsy: `___`
- [ ] Other: `___`

---

## 16. Environment Variables

> **Auto-populated by AI** based on your stack selections above.
> After AI generates the project, it will fill in this section with all required env vars.

```env
# AI will fill this based on your stack choices
```

---

## 17. Notes / Special Instructions

> Add any additional context, design preferences, constraints, or special requirements here.
> Examples: "Use serif fonts for headings", "Dark mode by default", "Minimalist design like Apple".

```
___
```

---

## How to Use This File

1. **Copy** this file into your new project folder
2. **Edit** the checkboxes and fill in the `___` fields
3. **Tell AI:**
   > Read `project-config.md` in this folder and `D:\project-template\PROJECT-BLUEPRINT.md`.
   > Generate the full project scaffold based on my configuration.
4. AI creates all selected features using patterns from the blueprint
5. You customize the generated code with your app-specific logic

---

## Quick Start Presets

> Uncomment the preset closest to your needs, then adjust individual checkboxes.

<!--
### Preset: Minimal Landing + Auth
Uncheck: Admin, Pricing, Email, i18n, Analytics, Legal, Blog
Keep: Landing, Login, Signup, Dashboard, Settings

### Preset: Full SaaS
Keep everything checked as-is. This is the default.

### Preset: Internal Tool (no marketing)
Uncheck: Landing, Pricing, Marketing header, Social links, SEO, Blog
Keep: Auth, Dashboard, Settings, Admin

### Preset: API-only (headless)
Uncheck: All pages, UI components, Animations, Theme, i18n
Keep: API routes, Auth, Database, Webhooks
-->
