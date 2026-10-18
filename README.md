# Forage: Fridge-to-Table Recipe App

Log what's in your fridge, find recipes you can actually cook with it, close the loop by deducting what you used, and keep a running history of every meal. A zero-cost, fully self-hosted MVP: no external recipe API, no daily rate limits.

**Live:** https://forage-sooty-six.vercel.app

---

## What it does

- **Landing page.** Signed-out visitors land on a public front page at `/` with a live demo: tap ingredients on and off and watch recipes re-rank. Sign in and sign up live at `/login`.
- **Fridge.** An organised text index: categories (produce, dairy, protein, grains, pantry, frozen) down the left, ingredients in columns with quantities on the right, alphabetical within each category. Search filters the list; tap any ingredient to edit or remove it. Add ingredients one at a time (autocomplete fills unit and category) or paste a whole list at once ("500g chicken, 2 eggs, handful basil") and let it parse itself. Adding more of something you already have merges quantities instead of duplicating rows. The add form stays open so you can enter several in a row.
- **Pantry staples.** Switch on the always-on-hand basics (salt, oil, garlic, eggs...) once; they are silently included in every recipe match, shopping list and cook deduction without tracking quantities. They live as a checklist at the bottom of the Fridge page.
- **Recipe search.** Matches your fridge and pantry against our own recipe database, weighted so recipes using more of what you have rank higher, and so a missing protein counts very differently from a missing pinch of spice. Every recipe shows an ingredient bar, one segment per ingredient (filled = in your fridge, outlined = still to buy). Filter by diet and time, sort by best match, fewest missing, most matching or quickest, and scale servings. A long ingredient list collapses to a few chips.
- **Recipe detail.** Ingredients split into "have" and "need to buy", a servings scaler that live-recalculates every quantity (proper fractions, not decimals), and step-by-step instructions.
- **"I cooked this".** Deducts exactly what you used from your fridge. Handles unit mismatches (recipe says "2 chicken breasts", your fridge has "500g chicken breast": it estimates the conversion and lets you adjust it), then logs the meal to history.
- **Saved recipes and shopping list.** Heart a recipe to save it. The shopping list is built live from your saved recipes plus this week's planned meals, grouped by recipe, with anything you already have hidden by default.
- **Buy missing ingredients.** One-click search links to Instacart and Amazon for anything still on your list, per ingredient (affiliate-linked).
- **Cooking history.** A timeline of everything you've cooked, taggable by meal type, rateable on a five-point scale, with a weekly summary and a "cook again" shortcut.
- **Weekly meal planner.** A 7-day grid with 4 slots per day. Browse any week, schedule a recipe into this week or next from the recipe page, and cook straight from the plan (same deduction flow as the recipe page).
- **Profile and settings.** Display name, default servings and default diet (used as the starting filters on Recipes), password change, sign out, and delete account (behind a type-your-email confirmation).
- **Everyday UX.** Removing a fridge item, history entry or planned meal shows an Undo toast before anything is deleted. Dialogs close on Escape and trap focus. The browser Back button closes an open recipe instead of leaving the page. Each page sets its own tab title.
- **Auth.** Email sign-up and sign-in, forgot-password flow, resend-confirmation flow.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite 8 + Tailwind CSS v4 + React Router 7 + lucide-react |
| Backend | Supabase (Postgres + Auth + Row Level Security + RPC functions) |
| Recipe data | Self-hosted in our own `recipes` table, seeded from [TheMealDB](https://www.themealdb.com/) (free, ~320 recipes), [Food.com via Hugging Face](https://huggingface.co/datasets/AkashPS11/recipes_data_food.com) (MIT licensed, 522k+ recipes with real nutrition data), and 50 hand-validated Iranian recipes |
| Hosting | Vercel, auto-deploys from `main` |
| Type | Young Serif (headings) and Albert Sans (text), loaded from Google Fonts |
| Affiliate links | Instacart + Amazon search links, per ingredient, configurable |

No external recipe API is called at runtime. Recipe search runs entirely against our own Postgres table via a GIN-indexed RPC function.

---

## Design system

Warm produce colours on a neutral paper, and illustration instead of stock imagery.

- **Hues.** Tomato `#D8321F`, butter `#FFD23F`, spinach `#1E6B3E`, carrot `#F28A1E` and radish `#EA6A8E`, with a warm brown-black ink `#2B2118` on paper `#FAFAF7`. Each section owns one hue (`src/lib/hues.js`): Fridge butter, Recipes tomato, Saved carrot, Planner spinach, History radish. Colour also carries meaning: spinach green means "in your fridge" or "selected", carrot means "need to buy", red is destructive.
- **Tokens.** All colours, fonts and shadows are CSS variables in `src/index.css`. Change them there.
- **Page headers.** `PageHeader` renders a full-width colour band through a portal into a slot owned by the layout, so each page declares its header where its own logic lives.
- **Illustrations.** `src/components/ui/Produce.jsx` holds the hand-drawn flat produce set (one ink-outline weight). `src/lib/produceMap.js` maps ingredient names to illustrations; anything without one gets a lettered sticker rather than a wrong picture. They appear on the landing page, recipe cards without photos, empty states and page headers.
- **Controls.** Buttons look printed and pressable (ink outline, hard 3px shadow); chips are pills; recipe cards are borderless tiles with a framed photo.

---

## Getting started

### 1. Run the database migrations

In the [Supabase SQL editor](https://supabase.com/dashboard/project/_/sql), run every `supabase_*` SQL file in this repo, in this order:

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
supabase_step16_migration.sql       # normalize_ingredient() fix: '-us' words (octopus, asparagus)
supabase_step17_migration.sql       # derive real diet tags from ingredients + backfill
supabase_step18_migration.sql       # nutrition columns (required before scripts/import-foodcom.py)
supabase_step19_migration.sql       # fix search_by_ingredients statement timeout on large recipe tables
supabase_step20_migration.sql       # OPTIONAL one-off cleanup, see note below
supabase_step21_delete_account.sql  # delete_my_account() RPC, required for "Delete account"
```

> The three ingredient-normalization files all define the same `normalize_ingredient()` function. They were iterated on in the same pass and are all safe to run (`create or replace`), but `supabase_step15_migration.sql` is the authoritative final version.

> `supabase_step20_migration.sql` **deletes** recipes already in your table that fail the importer's current quality bar (real image, enough ingredients, enough instructions). It is irreversible, though re-running the Food.com import brings back anything that qualifies. You only need it if you imported recipes before those stricter filters existed. Skip it on a fresh database.

> Without `supabase_step21_delete_account.sql`, the app still works. The "Delete account" button just reports that deletion is not set up and deletes nothing.

### 2. Point the app at your Supabase project

The project URL and anon key are constants at the top of `src/lib/supabase.js` (they currently point at the original project). Replace both with your own from **Project Settings → API**. The anon key is designed to ship in browser code and is protected by Row Level Security. Never put the service-role key in the frontend.

### 3. Seed the recipe database

**Option A: TheMealDB (quick start, ~320 recipes, no nutrition data)**

```bash
SUPABASE_SERVICE_KEY=your_service_role_key node scripts/seed-mealdb.js
```

Pulls from TheMealDB's free public API. No account or key needed on their end. Good for getting the app running in a few minutes; not enough recipes for daily real-world use.

**Option B: Food.com via Hugging Face (recommended, real nutrition data, strict quality filtering)**

First run `supabase_step18_migration.sql` (adds the nutrition columns this import populates), then:

```bash
pip install pandas pyarrow supabase requests
SUPABASE_SERVICE_KEY=your_service_role_key python3 scripts/import-foodcom.py
```

Streams the [Food.com recipes dataset](https://huggingface.co/datasets/AkashPS11/recipes_data_food.com) (MIT licensed, 522k+ raw recipes) directly from Hugging Face, no manual download. By default the importer prioritises **clean data over raw count** and rejects any recipe that doesn't have all of: a real image, at least 3 ingredients, and at least 150 characters of real instructions. Since only about half of Food.com's community-submitted recipes have any image at all, expect the final imported count to be well under the 522k raw total. Run with `--dry-run` first to see the real numbers before committing to a full import. Expect 20 to 40 minutes for the full dataset scan either way.

Useful flags:

```bash
python3 scripts/import-foodcom.py --dry-run --limit 500     # test without writing anything
python3 scripts/import-foodcom.py --limit 20000              # import a smaller slice
python3 scripts/import-foodcom.py --allow-no-image           # prioritise dataset size over image coverage
```

The final summary printout breaks down exactly why recipes were rejected (no image / short instructions / too few ingredients / etc.) so you can see the quality/quantity trade-off directly.

**Option C: AI-generated Iranian recipes (50 recipes, hand-validated)**

```bash
python3 scripts/validate-ai-recipes.py                                   # checks schema, duplicates, units, nutrition
pip install supabase
SUPABASE_SERVICE_KEY=your_service_role_key python3 scripts/import-ai-iranian.py   # add --dry-run to preview
```

The recipes live in `scripts/data/iranian-recipes-batch1.json` and `batch2.json`, generated with structured `{quantity, unit, name}` ingredients so no free-text parsing is needed. They have no photos yet and are tagged `source='ai-generated'` so they are easy to find and add images to later.

All seed scripts are safe to run together or independently; they upsert by `source_id`, so re-running never creates duplicates.

### 4. Configure Supabase Auth redirect URLs

**Authentication → URL Configuration → Redirect URLs**, add:

```
https://your-deployed-url.vercel.app/reset-password
https://your-deployed-url.vercel.app/fridge
http://localhost:5173/reset-password
http://localhost:5173/fridge
```

`/reset-password` is required for the forgot-password flow, and `/fridge` is where the sign-up confirmation email sends people back.

### 5. Run locally

```bash
npm install
npm run dev
```

### 6. Environment variables (all optional)

Copy `.env.example` to `.env`. No keys are required for the app to run. These only control the affiliate "buy ingredients" links:

```
VITE_AFFILIATE_PLATFORMS=instacart,amazon
VITE_INSTACART_AFFILIATE_ID=
VITE_AMAZON_AFFILIATE_TAG=
VITE_WALMART_AFFILIATE_ID=
```

### 7. Deploy to Vercel

Import this repo, set the same env vars in **Project Settings → Environment Variables** if you want affiliate tracking, and deploy. `vercel.json` already handles SPA routing (rewrites all paths to `index.html`).

> **Note on commit authorship:** Vercel can silently block deployments if the pushing commit's author email isn't linked to a verified GitHub account. Make sure `git config user.email` matches an email on your GitHub account before pushing.

---

## Project structure

```
src/
├── components/
│   ├── landing/     # Public front page with the live ingredient demo
│   ├── auth/        # Sign in / sign up / forgot password / reset password
│   ├── fridge/      # FridgePage + FridgeIndex (text index), IngredientSheet (edit/remove),
│   │                #   AddIngredientForm (single + smart paste), RecipesPage (search results)
│   ├── recipes/     # RecipeCard, detail view, filters, servings scaler, Cook It + schedule modals
│   ├── saved/       # Saved recipes + shopping list (smart-hide, per-recipe grouping)
│   ├── schedule/    # Weekly meal planner
│   ├── history/     # Cooking history timeline + recipe preview modal
│   ├── profile/     # Profile and settings, account deletion
│   ├── layout/      # Navbar (masthead + mobile tab bar), PageHeader (portal colour band)
│   └── ui/          # Button, Input, Toast, Produce (illustrations), glyphs, autocomplete, buy button
├── hooks/           # One hook per data domain (useFridge, usePantry, useMealPlan, ...) plus
│                    #   useDialog, useDeferredDelete (undo), useBackToClose, usePageTitle
├── lib/
│   ├── supabase.js          # All Supabase queries in one place (project URL + anon key live here)
│   ├── recipeDb.js          # Recipe search/match/sort logic + ingredient normalization
│   ├── recipeEngine.js      # Thin public API over recipeDb
│   ├── cookUtils.js         # Unit conversion + deduction planning for "Cook It"
│   ├── unitNorm.js          # Quantity merge/conversion helpers
│   ├── ingredientParser.js  # Natural-language ingredient parsing (smart paste)
│   ├── ingredientSuggestions.js  # Autocomplete list with default unit/category
│   ├── ingredientNormalize.js    # Name normalization helpers
│   ├── recipeUtils.js       # Weighted match % / ingredient importance tiers
│   ├── affiliateLinks.js    # Per-ingredient grocery search link builder
│   ├── preferences.js       # Profile preferences stored in the auth user's metadata
│   ├── hues.js              # Per-section colour map
│   ├── fridgeConstants.js   # Categories and units
│   └── produceMap.js        # Ingredient name -> illustration
├── App.jsx
├── index.css                # Design tokens
└── main.jsx
scripts/
├── seed-mealdb.js           # TheMealDB seed (quick start, ~320 recipes)
├── import-foodcom.py        # Food.com import (recommended, 522k+ recipes + nutrition)
├── validate-ai-recipes.py   # Checks the AI-generated recipe batches before import
├── import-ai-iranian.py     # Imports the 50 validated Iranian recipes
└── data/                    # iranian-recipes-batch1.json, batch2.json
supabase_*.sql               # Migrations, run in the order listed above
```

---

## Known limitations

- Recipe count and nutrition data depend on which seed you run. TheMealDB alone (~320 recipes, no nutrition) is enough to demo but not for daily use; `scripts/import-foodcom.py` (522k+ recipes, real nutrition on the majority) is the recommended source for a real deployment. See "Seed the recipe database" above.
- **Multi-week planning is partial.** You can browse any week in the planner and schedule into this week or next from a recipe page, but the shopping list only reads the current week's plan, so meals planned for next week don't appear on it yet. There is no way to schedule beyond next week from a recipe page or to copy a week.
- The Supabase project URL and anon key are hardcoded in `src/lib/supabase.js` rather than read from environment variables.
- No error boundaries around page components.
- There is no automated test suite in the repo yet.
- `npm run lint` reports a number of existing errors, mostly the React Hooks rules about setting state inside effects.
- Fonts load from Google Fonts at runtime, so the app needs internet access to render them.
- The AI-generated Iranian recipes have no photos; they show illustrated placeholders.
- Affiliate links open a single-item search per ingredient (platforms don't allow multi-item cart deep-linking without an approved Shoppable/Partner API).
- Food.com's `CookTime` field sometimes bundles passive time (freezing, marinating) with active cooking, with no way to separate them at the data level. `scripts/import-foodcom.py` clamps anything over 4 hours to null rather than show a misleading "1440 min" badge, so a small number of recipes show no time estimate.

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
- [x] Larger recipe dataset (Food.com, 522k+ recipes, MIT licensed)
- [x] Nutrition data (real macros on the majority of Food.com recipes)
- [x] Profile and settings, with account deletion
- [x] Public landing page and redesigned interface (produce hues, illustration, text-first fridge)
- [x] Undo for removals, keyboard-friendly dialogs, Back button closes recipes
- [x] Planner: browse any week, schedule into next week
- [ ] **Multi-week meal planning (finish):** include upcoming weeks in the shopping list, schedule beyond next week, copy a week
- [ ] PWA / offline support
