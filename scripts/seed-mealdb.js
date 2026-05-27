/**
 * Forage — TheMealDB Seed Script
 *
 * Fetches every recipe from TheMealDB (free, ~320 recipes) and inserts
 * them into your Supabase `recipes` table.
 *
 * Run ONCE locally after completing the Step 8 migration:
 *
 *   SUPABASE_SERVICE_KEY=your_service_role_key node scripts/seed-mealdb.js
 *
 * Where to get the service role key:
 *   Supabase Dashboard → Project Settings → API → service_role (secret)
 *
 * After seeding, the app will use the DB for all searches — no more
 * Spoonacular API calls or daily quota worries.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vgwtbfnccxiaplhhhzqd.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable is required.')
  console.error('Get it from: Supabase Dashboard → Settings → API → service_role')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const BASE = 'https://www.themealdb.com/api/json/v1/1'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function fetchJSON(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      if (i === retries - 1) throw err
      await sleep(1000 * (i + 1))
    }
  }
}

/**
 * Transform a raw TheMealDB meal object into our Supabase recipe schema.
 */
function parseMeal(meal) {
  const ingredients = []
  const ingredientLines = []

  for (let i = 1; i <= 20; i++) {
    const name    = meal[`strIngredient${i}`]?.trim()
    const measure = meal[`strMeasure${i}`]?.trim()
    if (!name) continue
    ingredients.push(name.toLowerCase())
    ingredientLines.push(measure ? `${measure} ${name}` : name)
  }

  // TheMealDB tags are comma-separated strings
  const tags = []
  if (meal.strTags) {
    tags.push(...meal.strTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean))
  }
  // Derive vegetarian/vegan tags from category
  const cat = (meal.strCategory || '').toLowerCase()
  if (['vegetarian', 'vegan', 'pasta', 'dessert', 'side', 'breakfast', 'miscellaneous'].includes(cat)) {
    if (cat === 'vegetarian' && !tags.includes('vegetarian')) tags.push('vegetarian')
    if (cat === 'vegan'      && !tags.includes('vegan'))      tags.push('vegan')
  }

  return {
    source_id:        meal.idMeal,
    source:           'mealdb',
    title:            meal.strMeal,
    ingredients,
    ingredient_lines: ingredientLines,
    instructions:     meal.strInstructions || null,
    image_url:        meal.strMealThumb    || null,
    source_url:       meal.strSource       || `https://www.themealdb.com/meal.php?c=${meal.idMeal}`,
    servings:         4,   // TheMealDB doesn't provide servings; 4 is a safe default
    cook_time:        null, // TheMealDB doesn't provide cook time
    tags,
    cuisine:          meal.strArea || null,
  }
}

async function seed() {
  console.log('🌿 Forage Recipe Seeder\n')

  // Step 1: Get all categories
  console.log('Fetching categories...')
  const catData = await fetchJSON(`${BASE}/categories.php`)
  const categories = catData.categories.map(c => c.strCategory)
  console.log(`  Found ${categories.length} categories: ${categories.join(', ')}\n`)

  // Step 2: Get all meal IDs across every category
  console.log('Fetching meal list...')
  const mealIdSet = new Set()
  for (const cat of categories) {
    const data = await fetchJSON(`${BASE}/filter.php?c=${encodeURIComponent(cat)}`)
    for (const meal of data.meals ?? []) mealIdSet.add(meal.idMeal)
    process.stdout.write('.')
    await sleep(100)
  }
  const mealIds = [...mealIdSet]
  console.log(`\n  Found ${mealIds.length} unique meals\n`)

  // Step 3: Fetch full details for every meal in parallel batches
  console.log('Fetching full recipe details...')
  const BATCH_SIZE = 8
  const allRows = []

  for (let i = 0; i < mealIds.length; i += BATCH_SIZE) {
    const batch = mealIds.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map(id => fetchJSON(`${BASE}/lookup.php?i=${id}`).then(d => d.meals?.[0]))
    )
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        allRows.push(parseMeal(r.value))
      }
    }
    process.stdout.write(`\r  Fetched ${Math.min(i + BATCH_SIZE, mealIds.length)}/${mealIds.length}`)
    await sleep(150)  // be courteous to the free API
  }
  console.log(`\n  Parsed ${allRows.length} recipes\n`)

  // Step 4: Upsert into Supabase in chunks
  console.log('Inserting into Supabase...')
  const CHUNK = 50
  let inserted = 0

  for (let i = 0; i < allRows.length; i += CHUNK) {
    const chunk = allRows.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('recipes')
      .upsert(chunk, { onConflict: 'source_id', ignoreDuplicates: false })

    if (error) {
      console.error(`\n  ⚠️  Insert error at chunk ${i}: ${error.message}`)
    } else {
      inserted += chunk.length
    }
    process.stdout.write(`\r  Inserted ${inserted}/${allRows.length}`)
  }

  console.log(`\n\n✅ Seeding complete! ${inserted} recipes are now in your Supabase DB.`)
  console.log('   Your app will now use the DB for all recipe searches — no API limits.')
}

seed().catch(err => {
  console.error('\n❌ Seed failed:', err.message)
  process.exit(1)
})
