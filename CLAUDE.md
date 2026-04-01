# DaKi — Wholesale Women's Outerwear Platform

## About
DaKi is a Ukrainian manufacturer of women's outerwear. This is their B2B wholesale platform with a product catalog, cart, admin panel, and customer management.

## Tech Stack
- **Framework**: Next.js 15 (App Router, Server Components, Server Actions)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS 4 + Shadcn/UI
- **Database**: Supabase (PostgreSQL + Auth + RLS + Storage)
- **Payments**: Checkbox.ua (Ukrainian fiscal receipts)
- **Email**: Resend
- **Auth**: Supabase Auth (email/password + Google OAuth)
- **State**: Zustand (cart, wishlist)
- **i18n**: Custom (uk/ru/en) in `lib/i18n.ts`
- **Hosting**: Vercel
- **Shipping**: Nova Poshta API integration

## Project Structure

```
app/
  (auth)/        # Login, signup, forgot-password, verify, new-password, profile-completion, callback
  (dashboard)/   # Admin panel, dashboard, orders, settings
  (marketing)/   # Public: catalog, catalog/[id], cart, wishlist, checkout, about, contact, FAQ, lookbook, size guide, shipping-info, exchange-returns
  api/           # admin, auth, catalog, payment, orders, profile, settings, newsletter, stock, nova-poshta, telegram, cron, webhooks
components/
  ui/            # Shadcn/UI primitives
  marketing/     # Landing, header, footer, shared marketing components
  catalog/       # Product cards, filters, gallery, size selectors
  admin/         # Admin panel components
  auth/          # Auth forms
lib/
  supabase/      # Supabase clients
  auth.ts        # Auth helpers
  cart-store.ts  # Zustand cart store
  wishlist-store.ts
  payments.ts    # Checkbox.ua integration
  email.ts       # Resend email
  i18n.ts        # Translations (all 3 locales)
  constants.ts   # Config, nav links, contacts, categories, seasons, sizes
  utils.ts       # cn(), formatCurrency(), etc.
  validations.ts # Zod schemas
  data.ts        # Data fetching helpers
  types.ts       # TypeScript types
  checkbox.ts    # Checkbox.ua payment API
```

## Key Patterns

### Product Page Template (Approved)
4 blocks (white background):
1. Hero — color selector, price, Add to Cart + heart, messenger order links
2. Description — product image + description (style, material, care)
3. Delivery Rules — delivery options + return policy
4. Size Chart — tab-separated table with sizes and stock

### Adding New Models
1. Create folder: `catalog/{category}/{sku}/`
2. Create `info` file with metadata
3. Add color folders with photos (`1.JPG`, `Опис.png`, `Правила доставки.png`)
4. Run `npm run sync` to parse and upload
5. Product appears automatically with approved template

### Sync Script
`scripts/sync-catalog.ts` — parses info files from catalog directories, detects sections via `SECTION_PATTERNS`, uploads photos to Supabase Storage, creates DB records.

## Commands
- `npm run dev` — Dev server
- `npm run build` — Production build
- `npm run sync` — Sync catalog from local files to Supabase

## Environment
- Primary language: Ukrainian (uk)
- Currency: UAH (₴)
- Target audience: Wholesale buyers (B2B)
- Email: daki.fashion.ua@gmail.com
- Telegram: @DaKiWholesale
- Instagram: @daki.ua

## Important
- All UI text must use translation keys from `lib/i18n.ts`
- Products come from Supabase `models` table (not `products`)
- Prices always in UAH
- Size scale: 42, 44, 46, 48, 50, 52, 54
- Categories: Пальта, Пуховики, Куртки, Тренчі, Парки, Жилети

## Claude Code Best Practices (from Anthropic Academy)

### Skills System
- Skills are reusable markdown instructions (SKILL.md) that Claude auto-applies to matching tasks
- Place in `.claude/skills/` with frontmatter: name, description, allowed-tools
- Write precise descriptions so skills trigger reliably
- Use progressive disclosure — keep initial context small, load details on demand
- Restrict tool access per skill to prevent unintended actions

### Subagents
- Subagents run in isolated context windows — main conversation stays clean
- Use for: code review, documentation, testing, exploration, parallel research
- Define in `.claude/agents/` with clear role, tools, and output format
- Always specify what the agent should return (structured output)
- Anti-pattern: using subagents for trivial single-file edits

### MCP (Model Context Protocol)
- Three primitives: Tools (model-controlled), Resources (app-controlled), Prompts (user-controlled)
- Build servers with Python SDK using decorators for tool definitions
- Transport: stdio (local), SSE (remote), HTTP (stateless scaling)
- Sampling: MCP servers can request LLM calls through connected clients
- Use MCP Inspector for debugging servers in browser
- For production: choose stateless HTTP for horizontal scaling with load balancers

### Claude Code Workflow
- Combine multiple tools in single responses for efficiency
- Use visual inputs (screenshots) to communicate UI changes
- Use reasoning modes for complex architectural decisions
- Build custom commands for repetitive tasks (`.claude/commands/`)
- Integrate GitHub for automated code review via hooks

### API Patterns (for AI integrations)
- Always validate with Zod at API boundaries
- Use Server Actions for mutations, API routes for webhooks/streaming
- Verify webhook signatures (Checkbox.ua, Telegram)
- Return proper HTTP status codes with NextResponse.json()
- Never expose internal errors to clients

## Agent Team

This project uses Claude Code Agent Teams. Subagents defined in `.claude/agents/`:
- `frontend-dev` — Next.js, Tailwind, Shadcn/UI, Ukrainian i18n, components
- `backend-dev` — Supabase, Server Actions, API routes, payments, shipping, email
- `reviewer` — Security (RLS, auth), i18n compliance, type safety, B2B patterns

## Available Skills & Plugins

### Installed Plugins (global)
- github, commit-commands, supabase, vercel, playwright
- frontend-design, typescript-lsp, feature-dev, code-review
- claude-code-setup, claude-md-management, hookify
- code-simplifier, security-guidance

### SEO Skills (global, 18 skills)
- `/seo` — full site audit
- `/seo-page` — single page analysis
- `/seo-technical` — technical SEO
- `/seo-schema` — structured data (JSON-LD)
- `/seo-content` — E-E-A-T and content quality
- `/seo-sitemap` — sitemap analysis/generation
- `/seo-images` — image optimization
- `/seo-hreflang` — international SEO
- `/seo-local` — local business SEO

### Commands (`.claude/commands/`)
- `/component` — generate React components
- `/debug` — debug assistant
- `/test` — test assistant
- `/refactor` — code refactoring
- `/lint` — lint assistant
- `/hooks` — React hooks
- `/state-management` — Zustand patterns
- `/typescript-migrate` — TS migration
- `/npm-scripts` — npm scripts helper

## Resource Links
- Supabase docs: https://supabase.com/docs
- Next.js docs: https://nextjs.org/docs
- Checkbox.ua API: https://docs.checkbox.ua
- Nova Poshta API: https://developers.novaposhta.ua
- Anthropic Academy: https://anthropic.skilljar.com
- Claude Code docs: https://code.claude.com/docs/en
- MCP docs: https://modelcontextprotocol.io
