# PROJECT BLUEPRINT — Universal SaaS Web App Reference

> **Version:** 1.0
> **Purpose:** Comprehensive reference for AI-assisted SaaS project generation.
> **Usage:** AI reads this file + `project-config.md` to generate a full project scaffold.
> **Stack:** Configurable — supports multiple frameworks, databases, auth, and payment providers.

---

## Table of Contents

1. [Project Foundation](#1-project-foundation)
2. [Authentication System](#2-authentication-system)
3. [Database Layer](#3-database-layer)
4. [Payments & Subscriptions](#4-payments--subscriptions)
5. [Email Service](#5-email-service)
6. [Internationalization (i18n)](#6-internationalization-i18n)
7. [Theming & UI System](#7-theming--ui-system)
8. [Pages & Routes](#8-pages--routes)
9. [API Routes](#9-api-routes)
10. [File Storage](#10-file-storage)
11. [Analytics & Monitoring](#11-analytics--monitoring)
12. [SEO](#12-seo)
13. [Security](#13-security)
14. [DevOps & Deployment](#14-devops--deployment)
15. [PWA Support](#15-pwa-support)
16. [Provider Architecture](#16-provider-architecture)

---

## 1. Project Foundation

### 1.1 Directory Structure (Next.js App Router)

```
project-root/
├── app/
│   ├── (auth)/                    # Auth route group (public)
│   │   ├── layout.tsx             # Auth layout with LanguageProvider
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/               # Protected route group
│   │   ├── layout.tsx             # Dashboard layout (auth check, profile, providers)
│   │   ├── dashboard/page.tsx     # Main app page
│   │   ├── settings/page.tsx      # Profile + subscription
│   │   └── admin/page.tsx         # Admin panel
│   ├── (marketing)/               # Public route group
│   │   ├── layout.tsx             # Marketing layout with LanguageProvider
│   │   ├── page.tsx               # Landing page
│   │   └── pricing/page.tsx       # Pricing & plans
│   ├── api/                       # API routes
│   │   ├── auth/callback/route.ts # OAuth callback
│   │   ├── ensure-profile/route.ts
│   │   ├── profile/route.ts
│   │   ├── webhooks/
│   │   │   └── [provider]/route.ts
│   │   └── admin/
│   │       ├── route.ts
│   │       ├── settings/route.ts
│   │       ├── discounts/route.ts
│   │       └── email/route.ts
│   ├── layout.tsx                 # Root layout (ThemeProvider, Toaster)
│   ├── globals.css                # Tailwind + CSS variables
│   ├── not-found.tsx              # Custom 404
│   ├── error.tsx                  # Custom error page
│   ├── sitemap.ts                 # Dynamic sitemap
│   └── robots.ts                  # Robots.txt
├── components/
│   ├── auth/                      # Auth forms, OAuth buttons
│   ├── dashboard/                 # Header, navigation, profile dropdown
│   ├── marketing/                 # Landing sections, marketing header
│   ├── settings/                  # Profile form, subscription card
│   ├── admin/                     # Admin panel components
│   ├── providers/                 # Context providers
│   │   ├── theme-provider.tsx
│   │   ├── language-provider.tsx
│   │   └── profile-provider.tsx
│   └── ui/                        # shadcn/ui base components
├── hooks/
│   └── use-auth-flow.ts           # Auth state machine
├── lib/
│   ├── supabase/                  # OR firebase/, prisma/, etc.
│   │   ├── client.ts              # Browser client
│   │   ├── server.ts              # Server client (cookies)
│   │   ├── admin.ts               # Service role client
│   │   ├── middleware.ts          # Session + route protection
│   │   └── ensure-profile.ts     # Profile auto-creation
│   ├── i18n.ts                    # Translation records
│   ├── types.ts                   # TypeScript interfaces
│   ├── email.ts                   # Email client + templates
│   ├── payments.ts                # Payment provider config
│   ├── geo-language.ts            # Country → language mapping
│   ├── constants.ts               # App constants
│   └── utils.ts                   # cn() helper, formatters
├── middleware.ts                  # Root middleware
├── public/                        # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── components.json                # shadcn/ui config
├── .env.local.example
├── .gitignore
└── project-config.md              # Feature checklist (this system)
```

### 1.2 Configuration Files

#### package.json scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "format": "prettier --write .",
    "clean": "rm -rf .next out node_modules"
  }
}
```

#### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### next.config.ts
```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }]
  },
}
export default nextConfig
```

#### tailwind.config.ts
```typescript
import type { Config } from 'tailwindcss'
import tailwindAnimate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [tailwindAnimate],
}
export default config
```

### 1.3 Core Dependencies

#### Always included
```
next react react-dom typescript @types/react @types/node
tailwindcss tailwindcss-animate postcss autoprefixer
class-variance-authority clsx tailwind-merge
lucide-react
sonner
zod
```

#### UI (if shadcn/ui selected)
```
@radix-ui/react-avatar @radix-ui/react-dialog @radix-ui/react-dropdown-menu
@radix-ui/react-label @radix-ui/react-popover @radix-ui/react-select
@radix-ui/react-separator @radix-ui/react-slot @radix-ui/react-switch
@radix-ui/react-tabs @radix-ui/react-tooltip
```

#### Forms (if forms needed)
```
react-hook-form @hookform/resolvers
```

#### Animations (if Framer Motion selected)
```
framer-motion
```

#### Date utilities
```
date-fns
```

#### ID generation
```
nanoid
```

### 1.4 Utility: cn() helper

```typescript
// lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

## 2. Authentication System

### 2.1 Supabase Auth

#### Browser client — `lib/supabase/client.ts`
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

#### Server client — `lib/supabase/server.ts`
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { /* Server Component — ignored, middleware handles it */ }
        },
      },
    }
  )
}
```

#### Admin client — `lib/supabase/admin.ts`
```typescript
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

#### Middleware session — `lib/supabase/middleware.ts`
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // PROTECTED_ROUTES: defined in project-config.md
  const protectedRoutes = ['/dashboard', '/settings', '/admin']
  if (!user && protectedRoutes.some(r => request.nextUrl.pathname.startsWith(r))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users from auth pages
  const authRoutes = ['/login', '/signup']
  if (user && authRoutes.some(r => request.nextUrl.pathname.startsWith(r))) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

#### Dependencies
```
@supabase/ssr @supabase/supabase-js
```

### 2.2 Firebase Auth (alternative)

#### Client setup — `lib/firebase/client.ts`
```typescript
import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const auth = getAuth(app)
export const db = getFirestore(app)
```

#### Dependencies
```
firebase firebase-admin
```

### 2.3 NextAuth.js / Auth.js (alternative)

#### Setup — `lib/auth.ts`
```typescript
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import Apple from 'next-auth/providers/apple'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! }),
    GitHub({ clientId: process.env.GITHUB_CLIENT_ID!, clientSecret: process.env.GITHUB_CLIENT_SECRET! }),
    Apple({ clientId: process.env.APPLE_CLIENT_ID!, clientSecret: process.env.APPLE_CLIENT_SECRET! }),
  ],
  callbacks: {
    session({ session, token }) { session.user.id = token.sub!; return session },
  },
})
```

#### Dependencies
```
next-auth@beta @auth/core
```

### 2.4 Clerk (alternative)

#### Dependencies
```
@clerk/nextjs
```

#### Setup
```typescript
// middleware.ts
import { clerkMiddleware } from '@clerk/nextjs/server'
export default clerkMiddleware()
export const config = { matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'] }
```

### 2.5 OAuth Providers Pattern (Supabase)

```typescript
// Common OAuth sign-in function
async function signInWithOAuth(provider: 'google' | 'github' | 'apple' | 'discord' | 'twitter' | 'facebook' | 'azure') {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/api/auth/callback`,
      queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
    },
  })
  return error
}
```

#### OAuth callback — `app/api/auth/callback/route.ts`
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
```

### 2.6 Auth Flow State Machine

The auth flow uses a step-based state machine for smooth animated transitions between screens:

```typescript
type AuthStep = 'login' | 'signup' | 'otp-verify' | 'forgot-password' | 'reset-otp' | 'new-password' | 'success'
type Direction = 'forward' | 'backward'

interface AuthState {
  step: AuthStep
  direction: Direction
  email: string
  error: string | null
}
```

**Transitions:**
- `login` → `signup` (switch to register)
- `login` → `forgot-password` (forgot link)
- `signup` → `otp-verify` (after signup submit)
- `forgot-password` → `reset-otp` (after email submit)
- `reset-otp` → `new-password` (after OTP verified)
- `new-password` → `success` (after password set)
- `otp-verify` → `success` (after OTP verified)

### 2.7 Auth UI Components

| Component | Purpose |
|-----------|---------|
| `AuthCard` | Container with title, step animations |
| `LoginForm` | Email, password, remember-me, forgot-password link |
| `SignupForm` | Full name, email, password, password strength |
| `OtpInput` | 6-digit code entry with auto-advance |
| `OtpStep` | Verify screen with resend timer (60s) |
| `ForgotPasswordForm` | Email input for recovery |
| `NewPasswordForm` | New password + confirm |
| `SuccessScreen` | Animated checkmark, auto-redirect |
| `OAuthButton` | Google/GitHub/Apple/etc styled buttons |
| `AuthDivider` | "OR" separator line |
| `PasswordInput` | Toggle visibility, caps lock warning |
| `PasswordStrength` | Visual strength meter (weak/medium/strong) |

### 2.8 Session Management

```typescript
// Remember-me pattern in dashboard layout
useEffect(() => {
  const rememberMe = localStorage.getItem('remember-me')
  const sessionActive = sessionStorage.getItem('session-active')

  if (rememberMe === 'false' && !sessionActive) {
    // Browser was closed — sign out
    supabase.auth.signOut().then(() => router.push('/login'))
    return
  }
  sessionStorage.setItem('session-active', 'true')
}, [])
```

### 2.9 Profile Auto-Creation

```typescript
// /api/ensure-profile/route.ts
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Upsert profile — creates on first login, returns existing on subsequent
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
    }, { onConflict: 'id', ignoreDuplicates: false })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

---

## 3. Database Layer

### 3.1 Supabase (PostgreSQL)

#### Core Schema — profiles table
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  characters_used INTEGER NOT NULL DEFAULT 0,
  characters_limit INTEGER NOT NULL DEFAULT 1000,
  interface_language TEXT NOT NULL DEFAULT 'en',
  theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role can manage all"
  ON public.profiles FOR ALL USING (auth.role() = 'service_role');
```

#### Subscriptions table
```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id TEXT,          -- LemonSqueezy/Stripe subscription ID
  status TEXT DEFAULT 'active',
  plan TEXT NOT NULL DEFAULT 'pro',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
```

#### Admin settings table
```sql
CREATE TABLE public.admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### Discounts table
```sql
CREATE TABLE public.discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('global', 'personal')),
  email TEXT,                -- NULL for global, email for personal
  discount_percent INTEGER NOT NULL DEFAULT 0,
  duration_months INTEGER DEFAULT 1,
  starts_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### TypeScript types — `lib/types.ts`
```typescript
export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  subscription_tier: 'free' | 'pro' | 'enterprise'
  characters_used: number
  characters_limit: number
  interface_language: string
  theme: 'light' | 'dark'
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  provider_id: string | null
  status: string | null
  plan: string
  current_period_end: string | null
  created_at: string
  updated_at: string
}
```

### 3.2 Firebase / Firestore (alternative)

Collections mirror the SQL schema:
- `users/{uid}` → profile data
- `subscriptions/{uid}` → subscription data
- `admin_settings/{key}` → config values

Security Rules:
```
match /users/{userId} {
  allow read, update: if request.auth.uid == userId;
}
```

### 3.3 Prisma + Planetscale/MySQL (alternative)

```prisma
model Profile {
  id               String   @id @default(uuid())
  email            String?  @unique
  fullName         String?
  avatarUrl        String?
  subscriptionTier String   @default("free")
  interfaceLanguage String  @default("en")
  theme            String   @default("light")
  isAdmin          Boolean  @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

Dependencies: `prisma @prisma/client`

### 3.4 MongoDB / Mongoose (alternative)

```typescript
const profileSchema = new Schema({
  email: String,
  fullName: String,
  avatarUrl: String,
  subscriptionTier: { type: String, default: 'free', enum: ['free', 'pro', 'enterprise'] },
  interfaceLanguage: { type: String, default: 'en' },
  theme: { type: String, default: 'light', enum: ['light', 'dark'] },
  isAdmin: { type: Boolean, default: false },
}, { timestamps: true })
```

Dependencies: `mongoose`

---

## 4. Payments & Subscriptions

### 4.1 LemonSqueezy

#### Setup — `lib/payments.ts`
```typescript
import { lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js'

export function initLemonSqueezy() {
  lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY! })
}
```

#### Webhook — `app/api/webhooks/lemonsqueezy/route.ts`
```typescript
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, subscriptionPurchaseEmail, subscriptionCancelledEmail } from '@/lib/email'

export async function POST(request: Request) {
  const rawBody = await request.text()
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!
  const signature = request.headers.get('x-signature')

  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  if (digest !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody)
  const eventName = payload.meta.event_name
  const userId = payload.meta.custom_data?.user_id

  if (!userId) return NextResponse.json({ error: 'No user_id' }, { status: 400 })

  const supabase = createAdminClient()

  switch (eventName) {
    case 'subscription_created':
    case 'subscription_updated': {
      await supabase.from('profiles').update({
        subscription_tier: 'pro',
        characters_limit: 999999999,
      }).eq('id', userId)

      // Send welcome email
      const { data: profile } = await supabase.from('profiles').select('email, full_name').eq('id', userId).single()
      if (profile?.email) {
        const tmpl = subscriptionPurchaseEmail(profile.full_name || '', `ORD-${Date.now()}`)
        await sendEmail({ to: profile.email, ...tmpl })
      }
      break
    }
    case 'subscription_cancelled':
    case 'subscription_expired': {
      await supabase.from('profiles').update({
        subscription_tier: 'free',
        characters_limit: 1000,
      }).eq('id', userId)

      const { data: profile } = await supabase.from('profiles').select('email, full_name').eq('id', userId).single()
      if (profile?.email) {
        const tmpl = subscriptionCancelledEmail(profile.full_name || '')
        await sendEmail({ to: profile.email, ...tmpl })
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
```

#### Dependencies
```
@lemonsqueezy/lemonsqueezy.js
```

#### Environment variables
```
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_WEBHOOK_SECRET=
```

### 4.2 Stripe (alternative)

#### Setup — `lib/payments.ts`
```typescript
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})
```

#### Checkout session
```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  payment_method_types: ['card'],
  line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
  success_url: `${origin}/settings?success=true`,
  cancel_url: `${origin}/pricing`,
  client_reference_id: userId,
  customer_email: userEmail,
})
```

#### Webhook verification
```typescript
const sig = request.headers.get('stripe-signature')!
const event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
```

#### Dependencies
```
stripe
```

#### Environment variables
```
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
```

### 4.3 Paddle (alternative)

#### Dependencies
```
@paddle/paddle-node-sdk
```

#### Environment variables
```
PADDLE_API_KEY=
PADDLE_WEBHOOK_SECRET=
PADDLE_PRICE_ID=
```

### 4.4 Pricing Page Pattern

```
Tier comparison layout:
┌─────────────────┐  ┌─────────────────┐
│   FREE           │  │   PRO            │
│   $0/month       │  │   $X/month       │
│                   │  │                   │
│   ✓ Feature 1    │  │   ✓ Feature 1    │
│   ✓ Feature 2    │  │   ✓ Feature 2    │
│   ✗ Feature 3    │  │   ✓ Feature 3    │
│   ✗ Feature 4    │  │   ✓ Feature 4    │
│                   │  │                   │
│  [Sign Up Free]  │  │  [Get Started]   │
└─────────────────┘  └─────────────────┘
```

Auth-aware logic:
- Not logged in → Show "Sign Up" / "Get Started" buttons
- Logged in + free → Show "Upgrade" button
- Logged in + pro → Show "Current Plan" badge + "Manage" link

---

## 5. Email Service

### 5.1 Resend

```typescript
// lib/email.ts
import { Resend } from 'resend'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

const FROM = 'APP_NAME <hello@DOMAIN.com>'

interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  try {
    const { data, error } = await getResend().emails.send({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    })
    if (error) { console.error('[Email] Error:', error); return { success: false, error } }
    return { success: true, data }
  } catch (err) {
    console.error('[Email] Exception:', err)
    return { success: false, error: err }
  }
}
```

#### Email template pattern
```typescript
export function subscriptionPurchaseEmail(name: string, orderNumber: string) {
  return {
    subject: 'Welcome to APP_NAME Pro!',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: 700;">APP_NAME</h1>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
        <h2 style="font-size: 20px;">Thank you, ${name}!</h2>
        <p style="color: #555; line-height: 1.6;">Your subscription is active.</p>
        <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; font-size: 14px; color: #888;">Order number</p>
          <p style="margin: 4px 0 0; font-size: 18px; font-weight: 600;">${orderNumber}</p>
        </div>
      </div>
    `,
  }
}
```

Dependencies: `resend`

### 5.2 SendGrid (alternative)

```typescript
import sgMail from '@sendgrid/mail'
sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  await sgMail.send({ to, from: FROM, subject, html })
}
```

Dependencies: `@sendgrid/mail`

### 5.3 Mailgun (alternative)

Dependencies: `mailgun.js form-data`

### 5.4 AWS SES (alternative)

Dependencies: `@aws-sdk/client-ses`

---

## 6. Internationalization (i18n)

### 6.1 Translation System

```typescript
// lib/i18n.ts
export type Locale = 'en' | 'uk' | 'ru' | 'es' | 'fr' | 'it' // extend as needed

const translations: Record<Locale, Record<string, string>> = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.settings': 'Settings',
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.forgotPassword': 'Forgot password?',
    'auth.rememberMe': 'Remember me',
    'auth.orContinueWith': 'Or continue with',
    'auth.noAccount': "Don't have an account?",
    'auth.hasAccount': 'Already have an account?',
    'pricing.free': 'Free',
    'pricing.pro': 'Pro',
    'pricing.signIn': 'Sign In',
    'pricing.getStarted': 'Get Started',
    'profile.language': 'Language',
    'profile.theme': 'Theme',
    'profile.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    // ... extend per project
  },
  // Other locales follow the same structure
}

export function t(locale: Locale, key: string): string {
  return translations[locale]?.[key] || translations.en[key] || key
}
```

### 6.2 Language Provider

```typescript
// components/providers/language-provider.tsx
'use client'
import { createContext, useContext, useCallback } from 'react'
import { t, type Locale } from '@/lib/i18n'

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'en', setLocale: () => {}, t: (key) => key,
})

export function LanguageProvider({
  children, locale, onLocaleChange,
}: {
  children: React.ReactNode; locale: Locale; onLocaleChange: (locale: Locale) => void
}) {
  const translate = useCallback((key: string) => t(locale, key), [locale])
  return (
    <LanguageContext.Provider value={{ locale, setLocale: onLocaleChange, t: translate }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() { return useContext(LanguageContext) }
```

### 6.3 Geo-Detection

```typescript
// lib/geo-language.ts
const COUNTRY_TO_LANGUAGE: Record<string, string> = {
  US: 'en', GB: 'en', AU: 'en', CA: 'en',
  UA: 'uk',
  RU: 'ru', BY: 'ru', KZ: 'ru',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es',
  FR: 'fr', BE: 'fr',
  IT: 'it',
  DE: 'de', AT: 'de', CH: 'de',
  // ... extend
}

export function getLanguageByCountry(country: string): string {
  return COUNTRY_TO_LANGUAGE[country.toUpperCase()] || 'en'
}

export function getLanguageByAcceptHeader(header: string): string {
  const langs = header.split(',').map(part => {
    const [lang, q] = part.trim().split(';q=')
    return { lang: lang.split('-')[0].toLowerCase(), q: q ? parseFloat(q) : 1 }
  }).sort((a, b) => b.q - a.q)

  const supported = ['en', 'uk', 'ru', 'es', 'fr', 'it']
  return langs.find(l => supported.includes(l.lang))?.lang || 'en'
}
```

### 6.4 Middleware Geo Integration

```typescript
// middleware.ts
import { updateSession } from '@/lib/supabase/middleware'
import { getLanguageByCountry, getLanguageByAcceptHeader } from '@/lib/geo-language'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)

  const country = request.headers.get('x-vercel-ip-country') || undefined
  let lang: string

  if (country) {
    lang = getLanguageByCountry(country)
    response.headers.set('x-geo-country', country)
  } else {
    const acceptLang = request.headers.get('accept-language') || ''
    lang = getLanguageByAcceptHeader(acceptLang)
  }

  response.cookies.set('geo-lang', lang, { maxAge: 60 * 60 * 24 * 365, path: '/', sameSite: 'lax' })
  response.headers.set('x-geo-lang', lang)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

### 6.5 Language Constants

```typescript
// lib/constants.ts
export const UI_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'uk', name: 'Українська' },
  { code: 'ru', name: 'Русский' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
] as const
```

---

## 7. Theming & UI System

### 7.1 Theme Provider

```typescript
// components/providers/theme-provider.tsx
'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'light', setTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') setTheme(stored)
    // Optional: system preference detection
    // else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark')
  }, [])

  useEffect(() => {
    if (!mounted) return
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    localStorage.setItem('theme', theme)
  }, [theme, mounted])

  if (!mounted) return <>{children}</>

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
```

### 7.2 CSS Variables — `app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --radius: 0.5rem;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
  }

  .dark {
    --background: 0 0% 15.7%;
    --foreground: 0 0% 95%;
    --card: 0 0% 15.7%;
    --card-foreground: 0 0% 95%;
    --popover: 0 0% 18%;
    --popover-foreground: 0 0% 95%;
    --primary: 0 0% 95%;
    --primary-foreground: 0 0% 9%;
    --secondary: 0 0% 21%;
    --secondary-foreground: 0 0% 95%;
    --muted: 0 0% 21%;
    --muted-foreground: 0 0% 63.9%;
    --accent: 0 0% 21%;
    --accent-foreground: 0 0% 95%;
    --destructive: 0 72% 50%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 26%;
    --input: 0 0% 21%;
    --ring: 0 0% 83.1%;
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground; }
  html { scroll-behavior: smooth; -webkit-tap-highlight-color: transparent; }
}
```

### 7.3 Animation Patterns (Framer Motion)

```typescript
// Fade-in from below
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
>

// Staggered children
{items.map((item, i) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: i * 0.1 }}
  />
))}

// Step transitions with direction
<AnimatePresence mode="wait" custom={direction}>
  <motion.div
    key={step}
    custom={direction}
    initial={{ opacity: 0, x: direction === 'forward' ? 50 : -50 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: direction === 'forward' ? -50 : 50 }}
    transition={{ duration: 0.2 }}
  />
</AnimatePresence>
```

### 7.4 Toast Notifications

```typescript
// Root layout
import { Toaster } from 'sonner'
// Inside body:
<Toaster position="bottom-right" />

// Usage anywhere:
import { toast } from 'sonner'
toast.success('Profile updated')
toast.error('Something went wrong')
toast.info('Processing...')
```

---

## 8. Pages & Routes

### 8.1 Root Layout

```typescript
// app/layout.tsx
import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'APP_NAME',
  description: 'APP_DESCRIPTION',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### 8.2 Marketing Layout

```typescript
// app/(marketing)/layout.tsx
'use client'
import { useState, useEffect } from 'react'
import { LanguageProvider } from '@/components/providers/language-provider'
import type { Locale } from '@/lib/i18n'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('preferred-locale')
      if (saved) setLocale(saved as Locale)
    } catch {}
  }, [])

  const handleLocaleChange = (l: Locale) => {
    setLocale(l)
    try { localStorage.setItem('preferred-locale', l) } catch {}
  }

  return (
    <LanguageProvider locale={locale} onLocaleChange={handleLocaleChange}>
      {children}
    </LanguageProvider>
  )
}
```

### 8.3 Dashboard Layout

```typescript
// app/(dashboard)/layout.tsx
'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/dashboard/header'
import { LanguageProvider } from '@/components/providers/language-provider'
import { ProfileProvider } from '@/components/providers/profile-provider'
import { useTheme } from '@/components/providers/theme-provider'
import type { Profile } from '@/lib/types'
import type { Locale } from '@/lib/i18n'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [locale, setLocale] = useState<Locale>('en')
  const { setTheme } = useTheme()

  // Session check (remember-me)
  useEffect(() => {
    const rememberMe = localStorage.getItem('remember-me')
    const sessionActive = sessionStorage.getItem('session-active')
    if (rememberMe === 'false' && !sessionActive) {
      const supabase = createClient()
      supabase.auth.signOut().then(() => router.push('/login'))
      return
    }
    sessionStorage.setItem('session-active', 'true')
  }, [router])

  // Load profile and sync language/theme
  const loadProfile = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const res = await fetch('/api/ensure-profile', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setProfile(data as Profile)
        if (data.interface_language) setLocale(data.interface_language as Locale)
        if (data.theme) setTheme(data.theme)
        return
      }
    } catch {}

    // Fallback profile
    setProfile({
      id: user.id, email: user.email || null,
      full_name: user.user_metadata?.full_name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
      subscription_tier: 'free', characters_used: 0, characters_limit: 1000,
      interface_language: 'en', theme: 'light', is_admin: false,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    })
  }, [setTheme])

  useEffect(() => { loadProfile() }, [loadProfile])

  return (
    <LanguageProvider locale={locale} onLocaleChange={setLocale}>
      <ProfileProvider profile={profile} onRefresh={loadProfile}>
        <div className="flex h-[100dvh] flex-col overflow-hidden">
          <Header profile={profile} />
          <main className="min-h-0 flex-1 overflow-hidden">
            <div className="mx-auto flex h-full max-w-7xl flex-col px-2 pb-2 pt-1 md:px-4">
              {children}
            </div>
          </main>
        </div>
      </ProfileProvider>
    </LanguageProvider>
  )
}
```

### 8.4 Landing Page Structure

```
┌──────────────────────────────────────┐
│  Header: Logo | Nav | Theme | Auth   │
├──────────────────────────────────────┤
│                                      │
│         HERO SECTION                 │
│     Headline + Subtitle              │
│       [CTA Button]                   │
│                                      │
├──────────────────────────────────────┤
│       FEATURES GRID (optional)       │
│   ┌───┐  ┌───┐  ┌───┐               │
│   │ 1 │  │ 2 │  │ 3 │               │
│   └───┘  └───┘  └───┘               │
├──────────────────────────────────────┤
│     TESTIMONIALS (optional)          │
├──────────────────────────────────────┤
│       FOOTER: Social links           │
└──────────────────────────────────────┘
```

### 8.5 Settings Page Structure

```
Two-column layout (lg:grid-cols-2):
┌──────────────────┬──────────────────┐
│  PROFILE FORM    │  SUBSCRIPTION    │
│                  │                  │
│  Avatar upload   │  Current Plan    │
│  Full name       │  Usage meter     │
│  Email (readonly)│  Upgrade button  │
│  Language select │  Manage link     │
│  Theme toggle    │                  │
│  [Save]          │                  │
└──────────────────┴──────────────────┘
```

### 8.6 Admin Panel Structure

```
Tabs or sections:
┌──────────────────────────────────────┐
│  STATS: Total users | Pro | Free     │
├──────────────────────────────────────┤
│  USER MANAGEMENT                     │
│  Search | List | Grant/Revoke pro    │
├──────────────────────────────────────┤
│  DISCOUNTS                           │
│  Create global/personal discounts    │
├──────────────────────────────────────┤
│  EMAIL BROADCAST                     │
│  Subject | Body | Audience | Send    │
├──────────────────────────────────────┤
│  SETTINGS                            │
│  Payment config | App settings       │
└──────────────────────────────────────┘
```

### 8.7 Error Pages

```typescript
// app/not-found.tsx
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="mt-4 text-muted-foreground">Page not found</p>
        <a href="/" className="mt-8 inline-block underline">Go home</a>
      </div>
    </div>
  )
}

// app/error.tsx
'use client'
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold">500</h1>
        <p className="mt-4 text-muted-foreground">Something went wrong</p>
        <button onClick={reset} className="mt-8 underline">Try again</button>
      </div>
    </div>
  )
}
```

---

## 9. API Routes

### 9.1 Auth-Protected Pattern

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ... your logic
  return NextResponse.json({ data: result })
}
```

### 9.2 Admin-Protected Pattern

```typescript
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // ... admin logic
}
```

### 9.3 Webhook Security Pattern

```typescript
import crypto from 'crypto'

function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
}
```

---

## 10. File Storage

### 10.1 Supabase Storage

```typescript
// Upload
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.png`, file, {
    upsert: true,
    contentType: file.type,
  })

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/avatar.png`)
```

### 10.2 AWS S3 / Cloudflare R2

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})
```

### 10.3 Uploadthing

Dependencies: `uploadthing @uploadthing/react`

---

## 11. Analytics & Monitoring

### 11.1 Vercel Analytics

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
// In body: <Analytics />
```

Dependencies: `@vercel/analytics`

### 11.2 Google Analytics

```typescript
// app/layout.tsx
import Script from 'next/script'
// In head:
<Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
<Script id="google-analytics" strategy="afterInteractive">
  {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
    gtag('js',new Date());gtag('config','${GA_ID}');`}
</Script>
```

### 11.3 Sentry Error Tracking

Dependencies: `@sentry/nextjs`

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'
Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: 1.0 })
```

---

## 12. SEO

### 12.1 Root Metadata

```typescript
export const metadata: Metadata = {
  title: { default: 'APP_NAME', template: '%s | APP_NAME' },
  description: 'APP_DESCRIPTION',
  keywords: ['keyword1', 'keyword2'],
  authors: [{ name: 'AUTHOR' }],
  openGraph: {
    title: 'APP_NAME',
    description: 'APP_DESCRIPTION',
    url: 'https://DOMAIN.com',
    siteName: 'APP_NAME',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'APP_NAME',
    description: 'APP_DESCRIPTION',
    images: ['/og-image.png'],
  },
}
```

### 12.2 Sitemap

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://DOMAIN.com'
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    { url: `${base}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    // ... add pages
  ]
}
```

### 12.3 Robots

```typescript
// app/robots.ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/admin/', '/settings/'] },
    sitemap: 'https://DOMAIN.com/sitemap.xml',
  }
}
```

---

## 13. Security

### 13.1 Security Headers (next.config.ts)

```typescript
headers: [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" },
]
```

### 13.2 Input Validation with Zod

```typescript
import { z } from 'zod'

const profileSchema = z.object({
  full_name: z.string().min(1).max(100),
  interface_language: z.enum(['en', 'uk', 'ru', 'es', 'fr', 'it']),
  theme: z.enum(['light', 'dark']),
})

// In API route:
const body = await request.json()
const parsed = profileSchema.safeParse(body)
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
}
```

### 13.3 Rate Limiting (in-memory)

```typescript
const rateLimit = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimit.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimit.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}
```

---

## 14. DevOps & Deployment

### 14.1 Environment Variables Template

```env
# ═══ Database ═══
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ═══ Payments ═══
# LemonSqueezy
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_WEBHOOK_SECRET=
# Stripe (alternative)
# STRIPE_SECRET_KEY=
# STRIPE_WEBHOOK_SECRET=
# STRIPE_PRICE_ID=

# ═══ Email ═══
RESEND_API_KEY=

# ═══ App ═══
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# ═══ Analytics (optional) ═══
# NEXT_PUBLIC_GA_ID=
# NEXT_PUBLIC_SENTRY_DSN=

# ═══ Storage (optional) ═══
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=
# AWS_BUCKET_NAME=
```

### 14.2 GitHub Actions CI

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run build
```

### 14.3 Dockerfile

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --production

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

### 14.4 Linting Setup

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

---

## 15. PWA Support

### 15.1 Web Manifest

```typescript
// app/manifest.ts
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'APP_NAME',
    short_name: 'APP_NAME',
    description: 'APP_DESCRIPTION',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
```

---

## 16. Provider Architecture

### 16.1 Provider Hierarchy

```
RootLayout:
  └── ThemeProvider          ← outermost (affects all pages)
        └── Toaster          ← notifications

MarketingLayout:
  └── LanguageProvider       ← localStorage-backed locale

AuthLayout:
  └── LanguageProvider       ← localStorage-backed locale

DashboardLayout:
  └── LanguageProvider       ← profile-synced locale
        └── ProfileProvider  ← user data + refresh
              └── Header
              └── main content
```

### 16.2 Profile Provider

```typescript
// components/providers/profile-provider.tsx
'use client'
import { createContext, useContext } from 'react'
import type { Profile } from '@/lib/types'

interface ProfileContextType {
  profile: Profile | null
  onRefresh: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextType>({
  profile: null, onRefresh: async () => {},
})

export function ProfileProvider({
  children, profile, onRefresh,
}: {
  children: React.ReactNode; profile: Profile | null; onRefresh: () => Promise<void>
}) {
  return (
    <ProfileContext.Provider value={{ profile, onRefresh }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() { return useContext(ProfileContext) }
```

---

## Appendix: Quick Reference

### Placeholder Tokens
Replace these across the generated project:
- `APP_NAME` → project name
- `APP_DESCRIPTION` → project description
- `DOMAIN.com` → production domain
- `AUTHOR` → author name

### shadcn/ui Components to Install
```bash
npx shadcn@latest init
npx shadcn@latest add button input label card dialog dropdown-menu
npx shadcn@latest add avatar badge separator switch tabs tooltip popover select
```
