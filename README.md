# 🌿 Forage — Fridge-to-Table Recipe App

Log what's in your fridge, find recipes you can actually cook with it, close the loop by deducting what you used, and keep a running history of every meal. Built as a zero-cost, fully self-hosted MVP — no external recipe API, no daily rate limits.

**Live:** https://forage-sooty-six.vercel.app

---

## What it does

- **Fridge inventory** — add ingredients one at a time (with autocomplete that auto-fills unit + category) or paste a whole list at once ("500g chicken, 2 eggs, handful basil") and let it parse itself. Adding more of something you already have merges quantities instead of duplicating rows.
- **Pantry staples** — mark always-on-hand basics (salt, oil, garlic, eggs...) once; they're silently included in every recipe match, shopping list, and cook deduction without needing exact quantities tracked.
- **Recipe search** — matches your fridge + pantry against our own recipe database (not a third-party API), weighted so recipes using more of what you actually have rank higher, with a real match-percentage that treats a missing protein very differently from a missing pinch of spice.
- **Recipe detail** — ingredients split into "have" vs "need to buy," a servings scaler that live-recalculates every quantity (with proper fractions, not decimals), step-by-step instructions.
- **"I Cooked This"** — deducts exactly what you used from your fridge. Handles unit mismatches intelligently (recipe says "2 chicken breasts," your fridge has "500g chicken breast" → estimates the conversion and lets you adjust it), then logs the meal to history.
- **Saved recipes & shopping list** — heart a recipe to save it; the shopping list is built live from everything you've saved, grouped by recipe, with anything you already have hidden by default.
- **Buy missing ingredients** — one-click search links to Instacart and Amazon for anything still on your shopping list, per ingredient (affiliate-linked).
- **Cooking history** — a timeline of everything you've cooked, taggable by meal type, rateable with emoji, with a weekly summary and a "cook again" shortcut.
- **Weekly meal planner** — a 7-day grid with 4 slots/day; schedule recipes ahead, auto-synced into your shopping list, with a "Cook Now" button that runs the same deduction flow as the recipe page.
- **Auth** — email sign-up/sign-in, forgot-password flow, resend-confirmation flow.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS v4 |
| Backend | Supabase (Postgres + Auth + Row Level Security + RPC functions) |
| Recipe data | Self-hosted in our own `recipes` table — seeded once from [TheMealDB](https://www.themealdb.com/) (free, no key) |
| Hosting | Vercel, auto-deploys from `main` |
| Affiliate links | Instacart + Amazon search links, per-ingredient, configurable |

No external recipe API is called at runtime — recipe search runs entirely against our own Postgres table via a GIN-indexed RPC function.

---

## Getting started

### 1. Run the database migrations

In the [Supabase SQL editor](https://supabase.com/dashboard/project/_/sql), run every `supabase_*_migration.sql` file in this repo, in this order:

```
supabase_migration.sql              # profiles, fridge_items, recipe_cache
supabase_step5_migration.sql        # saved_recipes, shopping_checks
supabase_step7_migration.sql        # pantry_staples on profiles
supabase_step8_migration.sql        # recipes table + search_by_ingredients RPC
supabase_step10_migration.sql       # cook_history, unit normalization
supabase_step12_migration.sql       # rating / meal_type / calories on cook_history
supabase_step13_14_migration.sql    # meal_plan table
supabase_matching_migration.sql     # ingredient normalization (draft)
supabase_quality_migration.sql      # ingredient normalization (draft)
supabase_step15_migration.sql       # ingredient normalization (final) + recipe quality_score
```

> The last three all define the same `normalize_ingredient()` function — they were iterated on in the same pass and are all safe to run (`create or replace`), but `supabase_step15_migration.sql` is the authoritative final version.

### 2. Seed the recipe database (one-time)

```bash
SUPABASE_SERVICE_KEY=your_service_role_key node scripts/seed-mealdb.js
```

Get the service role key from **Supabase Dashboard → Project Settings → API → service_role**. This pulls ~320 recipes from TheMealDB's free API and inserts them into your `recipes` table. Safe to re-run (upserts by source ID).

### 3. Configure Supabase Auth redirect URLs

**Authentication → URL Configuration → Redirect URLs**, add:
```
https://your-deployed-url.vercel.app/reset-password
http://localhost:5173/reset-password
```
Required for the forgot-password flow to work.

### 4. Run locally

```bash
npm install
npm run dev
```

### 5. Environment variables (all optional)

Copy `.env.example` to `.env`. No keys are required for the app to run — these only control the affiliate "buy ingredients" links:

```
VITE_AFFILIATE_PLATFORMS=instacart,amazon
VITE_INSTACART_AFFILIATE_ID=
VITE_AMAZON_AFFILIATE_TAG=
VITE_WALMART_AFFILIATE_ID=
```

### 6. Deploy to Vercel

Import this repo, set the same env vars in **Project Settings → Environment Variables** if you want affiliate tracking, and deploy. `vercel.json` already handles SPA routing (rewrites all paths to `index.html`).

> **Note on commit authorship:** Vercel can silently block deployments if the pushing commit's author email isn't linked to a verified GitHub account. Make sure `git config user.email` matches an email on your GitHub account before pushing.

---

## Project structure

```
src/
├── components/
│   ├── auth/        # Sign in / sign up / forgot password / reset password
│   ├── fridge/       # Fridge CRUD, smart-paste form, pantry staples panel
│   ├── recipes/      # Search results, detail view, servings scaler, Cook It modal
│   ├── saved/         # Saved recipes + shopping list (smart-hide, per-recipe grouping)
│   ├── schedule/      # Weekly meal planner
│   ├── history/       # Cooking history timeline + recipe preview modal
│   ├── layout/         # Navbar
│   └── ui/              # Button, Input, Toast, Autocomplete, BuyIngredientsButton
├── hooks/         # One hook per data domain (useFridge, usePantry, useCookHistory, etc.)
├── lib/
│   ├── supabase.js          # All Supabase queries in one place
│   ├── recipeDb.js          # Recipe search/match/sort logic + ingredient normalization
│   ├── recipeEngine.js      # Thin public API over recipeDb
│   ├── cookUtils.js         # Unit conversion + deduction planning for "Cook It"
│   ├── unitNorm.js          # Quantity merge/conversion helpers
│   ├── ingredientParser.js  # Natural-language ingredient parsing (smart paste)
│   ├── ingredientSuggestions.js  # Autocomplete list with default unit/category
│   ├── recipeUtils.js       # Weighted match % / ingredient importance tiers
│   └── affiliateLinks.js    # Per-ingredient grocery search link builder
├── App.jsx
└── main.jsx
scripts/
└── seed-mealdb.js   # One-time recipe database seed script
```

---

## Known limitations

- ~320 recipes seeded — enough to demo, not enough for daily real-world use. Architecture supports a larger seed with no code changes.
- No nutrition data on most recipes (TheMealDB doesn't provide it).
- Meal planner only shows the current week — no past/future week navigation yet.
- No error boundaries around page components.
- Affiliate links open a single-item search per ingredient (platforms don't allow multi-item cart deep-linking without an approved Shoppable/Partner API).

---

## Roadmap

- [x] Auth (sign up / sign in / forgot password / resend confirmation)
- [x] Fridge CRUD with smart quantity merging + unit sanitization
- [x] Pantry staples
- [x] Self-hosted recipe search (no external API, no rate limits)
- [x] Weighted match % + recipe prioritization by fridge coverage
- [x] Servings scaler with fraction display
- [x] "I Cooked This" with cross-unit deduction estimation
- [x] Saved recipes + smart-hide shopping list
- [x] Cooking history with ratings, meal-type tags, weekly summary
- [x] Weekly meal planner
- [x] Affiliate grocery ordering (Instacart + Amazon)
- [ ] Larger recipe dataset
- [ ] Nutrition data
- [ ] Multi-week meal planning
- [ ] PWA / offline support
