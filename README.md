# 🌿 Forage — Fridge-to-Table AI Chef

Turn whatever's left in your fridge into step-by-step recipes. Log your ingredients, hit "Find recipes", and Forage matches you with meals you can actually make — no extra shopping required.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS v4 |
| Auth & DB | Supabase (Postgres + Row Level Security) |
| Recipe Engine | Spoonacular API with 1-hour Supabase cache |
| Hosting | Vercel |

## Getting started

### 1. Run the DB migration

Open the Supabase SQL editor and run `supabase_migration.sql`. Creates `profiles`, `fridge_items`, and `recipe_cache`.

### 2. Run locally

```bash
npm install
npm run dev
```

### 3. Deploy to Vercel

Import this repo in Vercel — no env vars needed for MVP. Hit deploy.

## Roadmap

- [x] Auth (email sign up / sign in)
- [x] Fridge CRUD (add, edit, delete ingredients)
- [x] Recipe matching via Spoonacular
- [x] Supabase recipe cache (1-hour TOS-compliant TTL)
- [ ] Dietary preference filters
- [ ] Weekly meal planner
- [ ] Shopping list for missing ingredients
