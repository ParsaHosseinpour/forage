/**
 * Common ingredient names for autocomplete typeahead.
 *
 * Sorted roughly by frequency so the most common items surface first in
 * prefix matches. Case-normalised to Title Case for display.
 *
 * To extend: just add names to the relevant section.
 */

const SUGGESTIONS = [
  // ── Produce ──────────────────────────────────────────────────────────────
  'Tomatoes', 'Cherry tomatoes', 'Roma tomatoes',
  'Onion', 'Red onion', 'Spring onions', 'Shallots',
  'Garlic', 'Garlic cloves',
  'Ginger', 'Fresh ginger',
  'Lemon', 'Lime', 'Orange',
  'Carrot', 'Carrots',
  'Celery', 'Celery stalks',
  'Bell pepper', 'Red pepper', 'Green pepper', 'Yellow pepper',
  'Spinach', 'Baby spinach',
  'Broccoli', 'Cauliflower',
  'Zucchini', 'Courgette',
  'Eggplant', 'Aubergine',
  'Mushrooms', 'Button mushrooms', 'Portobello mushrooms', 'Shiitake mushrooms',
  'Avocado',
  'Cucumber',
  'Lettuce', 'Romaine lettuce', 'Iceberg lettuce',
  'Kale', 'Swiss chard', 'Bok choy',
  'Leek', 'Leeks',
  'Asparagus',
  'Green beans', 'French beans',
  'Peas', 'Frozen peas',
  'Corn', 'Sweet corn',
  'Potato', 'Potatoes', 'Sweet potato', 'Baby potatoes',
  'Squash', 'Butternut squash',
  'Pumpkin',
  'Fennel',
  'Artichoke',
  'Cabbage', 'Red cabbage',
  'Brussels sprouts',
  'Beetroot',
  'Radish',
  'Turnip', 'Parsnip',
  'Apple', 'Banana', 'Mango', 'Pineapple', 'Strawberries', 'Blueberries',
  'Fresh basil', 'Fresh parsley', 'Fresh coriander', 'Fresh thyme',
  'Fresh rosemary', 'Fresh mint', 'Fresh dill', 'Fresh chives',
  'Chilli', 'Red chilli', 'Green chilli',

  // ── Protein ──────────────────────────────────────────────────────────────
  'Chicken breast', 'Chicken thighs', 'Chicken legs', 'Whole chicken',
  'Ground beef', 'Beef mince', 'Beef steak', 'Sirloin steak', 'Ribeye steak',
  'Pork chops', 'Pork loin', 'Pork belly', 'Ground pork',
  'Lamb chops', 'Lamb mince', 'Lamb shoulder',
  'Turkey breast', 'Turkey mince',
  'Salmon fillet', 'Salmon',
  'Tuna', 'Canned tuna',
  'Cod fillet', 'Cod',
  'Shrimp', 'Prawns',
  'Bacon', 'Streaky bacon', 'Back bacon',
  'Ham', 'Pancetta', 'Prosciutto',
  'Sausages', 'Chorizo', 'Salami',
  'Tofu', 'Firm tofu', 'Silken tofu',
  'Tempeh',
  'Eggs', 'Large eggs',

  // ── Dairy ─────────────────────────────────────────────────────────────────
  'Milk', 'Whole milk', 'Semi-skimmed milk',
  'Butter', 'Unsalted butter', 'Salted butter',
  'Heavy cream', 'Double cream', 'Single cream', 'Sour cream', 'Crème fraîche',
  'Parmesan', 'Parmesan cheese',
  'Mozzarella', 'Fresh mozzarella',
  'Cheddar', 'Cheddar cheese',
  'Feta', 'Feta cheese',
  'Ricotta', 'Ricotta cheese',
  'Cream cheese', 'Mascarpone',
  'Yogurt', 'Greek yogurt',
  'Coconut milk', 'Coconut cream',

  // ── Grains & Starches ─────────────────────────────────────────────────────
  'Pasta', 'Spaghetti', 'Linguine', 'Penne', 'Rigatoni', 'Fettuccine',
  'Tagliatelle', 'Macaroni', 'Gnocchi', 'Lasagne sheets',
  'Rice', 'Basmati rice', 'Jasmine rice', 'Arborio rice',
  'Bread', 'Sourdough', 'Baguette', 'Ciabatta', 'Pita bread',
  'Tortillas', 'Corn tortillas', 'Flour tortillas',
  'Flour', 'Plain flour', 'Self-raising flour', 'Bread flour',
  'Oats', 'Rolled oats',
  'Quinoa', 'Couscous', 'Bulgur wheat',
  'Noodles', 'Rice noodles', 'Egg noodles', 'Udon noodles',
  'Breadcrumbs', 'Panko breadcrumbs',

  // ── Pantry ────────────────────────────────────────────────────────────────
  'Olive oil', 'Extra virgin olive oil',
  'Vegetable oil', 'Sunflower oil', 'Coconut oil', 'Sesame oil',
  'Salt', 'Sea salt', 'Kosher salt',
  'Black pepper', 'White pepper',
  'Sugar', 'Brown sugar', 'Caster sugar', 'Icing sugar',
  'Honey', 'Maple syrup',
  'Soy sauce', 'Dark soy sauce', 'Tamari',
  'Fish sauce',
  'Vinegar', 'White wine vinegar', 'Red wine vinegar', 'Balsamic vinegar',
  'Lemon juice',
  'Tomato paste', 'Tomato purée',
  'Canned tomatoes', 'Chopped tomatoes', 'Passata',
  'Chicken stock', 'Vegetable stock', 'Beef stock',
  'Canned chickpeas', 'Chickpeas',
  'Canned black beans', 'Black beans',
  'Canned kidney beans', 'Kidney beans',
  'Canned lentils', 'Red lentils', 'Green lentils',
  'Cumin', 'Ground cumin', 'Cumin seeds',
  'Paprika', 'Smoked paprika',
  'Chilli powder', 'Chilli flakes', 'Cayenne pepper',
  'Turmeric', 'Ground turmeric',
  'Coriander', 'Ground coriander',
  'Oregano', 'Dried oregano',
  'Thyme', 'Dried thyme',
  'Rosemary', 'Dried rosemary',
  'Basil', 'Dried basil',
  'Bay leaves',
  'Cinnamon', 'Ground cinnamon',
  'Nutmeg',
  'Mustard', 'Dijon mustard', 'Wholegrain mustard',
  'Mayonnaise',
  'Worcestershire sauce',
  'Hot sauce', 'Tabasco',
  'Oyster sauce', 'Hoisin sauce',
  'Cornstarch', 'Cornflour',
  'Baking powder', 'Baking soda', 'Bicarbonate of soda',
  'Vanilla extract', 'Vanilla bean',
  'Cocoa powder', 'Dark chocolate',
  'Peanut butter', 'Tahini',
  'Capers', 'Olives',
  'Sundried tomatoes',
  'Anchovies',
  'Almonds', 'Walnuts', 'Cashews', 'Pine nuts', 'Pecans',
  'Raisins', 'Dried apricots', 'Dates',
]

/**
 * Return up to `limit` suggestions matching the given query.
 * Matches on prefix first, then anywhere in the name.
 *
 * @param {string} query
 * @param {number} limit
 * @returns {string[]}
 */
export function getSuggestions(query, limit = 6) {
  if (!query || query.length < 2) return []
  const q = query.toLowerCase().trim()

  const prefix = []
  const anywhere = []

  for (const s of SUGGESTIONS) {
    const sl = s.toLowerCase()
    if (sl.startsWith(q)) prefix.push(s)
    else if (sl.includes(q)) anywhere.push(s)
  }

  return [...prefix, ...anywhere].slice(0, limit)
}
