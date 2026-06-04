/**
 * Ingredient suggestions for autocomplete typeahead.
 *
 * Each entry has:
 *   name          — display name (Title Case)
 *   default_unit  — pre-selected unit when item is chosen from dropdown
 *   category      — pre-selected category
 *
 * Prefix matches surface first; substring matches follow.
 */

const ITEMS = [
  // ── Produce ─────────────────────────────────────────────────────────────────
  { name: 'Tomatoes',             default_unit: 'piece', category: 'produce'  },
  { name: 'Cherry tomatoes',      default_unit: 'g',     category: 'produce'  },
  { name: 'Roma tomatoes',        default_unit: 'piece', category: 'produce'  },
  { name: 'Onion',                default_unit: 'piece', category: 'produce'  },
  { name: 'Red onion',            default_unit: 'piece', category: 'produce'  },
  { name: 'Spring onions',        default_unit: 'bunch', category: 'produce'  },
  { name: 'Shallots',             default_unit: 'piece', category: 'produce'  },
  { name: 'Garlic',               default_unit: 'clove', category: 'produce'  },
  { name: 'Garlic cloves',        default_unit: 'clove', category: 'produce'  },
  { name: 'Ginger',               default_unit: 'g',     category: 'produce'  },
  { name: 'Fresh ginger',         default_unit: 'g',     category: 'produce'  },
  { name: 'Lemon',                default_unit: 'piece', category: 'produce'  },
  { name: 'Lime',                 default_unit: 'piece', category: 'produce'  },
  { name: 'Orange',               default_unit: 'piece', category: 'produce'  },
  { name: 'Carrot',               default_unit: 'piece', category: 'produce'  },
  { name: 'Carrots',              default_unit: 'g',     category: 'produce'  },
  { name: 'Celery',               default_unit: 'stalk', category: 'produce'  },
  { name: 'Bell pepper',          default_unit: 'piece', category: 'produce'  },
  { name: 'Red pepper',           default_unit: 'piece', category: 'produce'  },
  { name: 'Green pepper',         default_unit: 'piece', category: 'produce'  },
  { name: 'Spinach',              default_unit: 'g',     category: 'produce'  },
  { name: 'Baby spinach',         default_unit: 'g',     category: 'produce'  },
  { name: 'Broccoli',             default_unit: 'g',     category: 'produce'  },
  { name: 'Cauliflower',          default_unit: 'piece', category: 'produce'  },
  { name: 'Zucchini',             default_unit: 'piece', category: 'produce'  },
  { name: 'Eggplant',             default_unit: 'piece', category: 'produce'  },
  { name: 'Mushrooms',            default_unit: 'g',     category: 'produce'  },
  { name: 'Button mushrooms',     default_unit: 'g',     category: 'produce'  },
  { name: 'Portobello mushrooms', default_unit: 'g',     category: 'produce'  },
  { name: 'Avocado',              default_unit: 'piece', category: 'produce'  },
  { name: 'Cucumber',             default_unit: 'piece', category: 'produce'  },
  { name: 'Lettuce',              default_unit: 'piece', category: 'produce'  },
  { name: 'Kale',                 default_unit: 'g',     category: 'produce'  },
  { name: 'Leek',                 default_unit: 'piece', category: 'produce'  },
  { name: 'Asparagus',            default_unit: 'g',     category: 'produce'  },
  { name: 'Green beans',          default_unit: 'g',     category: 'produce'  },
  { name: 'Peas',                 default_unit: 'g',     category: 'produce'  },
  { name: 'Corn',                 default_unit: 'piece', category: 'produce'  },
  { name: 'Potato',               default_unit: 'piece', category: 'produce'  },
  { name: 'Potatoes',             default_unit: 'g',     category: 'produce'  },
  { name: 'Sweet potato',         default_unit: 'piece', category: 'produce'  },
  { name: 'Squash',               default_unit: 'g',     category: 'produce'  },
  { name: 'Pumpkin',              default_unit: 'g',     category: 'produce'  },
  { name: 'Cabbage',              default_unit: 'g',     category: 'produce'  },
  { name: 'Brussels sprouts',     default_unit: 'g',     category: 'produce'  },
  { name: 'Beetroot',             default_unit: 'piece', category: 'produce'  },
  { name: 'Apple',                default_unit: 'piece', category: 'produce'  },
  { name: 'Banana',               default_unit: 'piece', category: 'produce'  },
  { name: 'Mango',                default_unit: 'piece', category: 'produce'  },
  { name: 'Strawberries',         default_unit: 'g',     category: 'produce'  },
  { name: 'Fresh basil',          default_unit: 'bunch', category: 'produce'  },
  { name: 'Fresh parsley',        default_unit: 'bunch', category: 'produce'  },
  { name: 'Fresh coriander',      default_unit: 'bunch', category: 'produce'  },
  { name: 'Fresh thyme',          default_unit: 'sprig', category: 'produce'  },
  { name: 'Fresh rosemary',       default_unit: 'sprig', category: 'produce'  },
  { name: 'Fresh mint',           default_unit: 'bunch', category: 'produce'  },
  { name: 'Chilli',               default_unit: 'piece', category: 'produce'  },

  // ── Protein ─────────────────────────────────────────────────────────────────
  { name: 'Chicken breast',   default_unit: 'g',      category: 'protein' },
  { name: 'Chicken thighs',   default_unit: 'g',      category: 'protein' },
  { name: 'Chicken legs',     default_unit: 'piece',  category: 'protein' },
  { name: 'Ground beef',      default_unit: 'g',      category: 'protein' },
  { name: 'Beef mince',       default_unit: 'g',      category: 'protein' },
  { name: 'Beef steak',       default_unit: 'g',      category: 'protein' },
  { name: 'Pork chops',       default_unit: 'piece',  category: 'protein' },
  { name: 'Pork belly',       default_unit: 'g',      category: 'protein' },
  { name: 'Lamb chops',       default_unit: 'piece',  category: 'protein' },
  { name: 'Lamb mince',       default_unit: 'g',      category: 'protein' },
  { name: 'Salmon fillet',    default_unit: 'g',      category: 'protein' },
  { name: 'Salmon',           default_unit: 'g',      category: 'protein' },
  { name: 'Tuna',             default_unit: 'g',      category: 'protein' },
  { name: 'Canned tuna',      default_unit: 'can',    category: 'protein' },
  { name: 'Cod fillet',       default_unit: 'g',      category: 'protein' },
  { name: 'Shrimp',           default_unit: 'g',      category: 'protein' },
  { name: 'Prawns',           default_unit: 'g',      category: 'protein' },
  { name: 'Bacon',            default_unit: 'g',      category: 'protein' },
  { name: 'Ham',              default_unit: 'g',      category: 'protein' },
  { name: 'Sausages',         default_unit: 'piece',  category: 'protein' },
  { name: 'Chorizo',          default_unit: 'g',      category: 'protein' },
  { name: 'Tofu',             default_unit: 'g',      category: 'protein' },
  { name: 'Eggs',             default_unit: 'piece',  category: 'dairy'   },
  { name: 'Large eggs',       default_unit: 'piece',  category: 'dairy'   },

  // ── Dairy ────────────────────────────────────────────────────────────────────
  { name: 'Milk',             default_unit: 'ml',    category: 'dairy' },
  { name: 'Whole milk',       default_unit: 'ml',    category: 'dairy' },
  { name: 'Butter',           default_unit: 'g',     category: 'dairy' },
  { name: 'Unsalted butter',  default_unit: 'g',     category: 'dairy' },
  { name: 'Heavy cream',      default_unit: 'ml',    category: 'dairy' },
  { name: 'Double cream',     default_unit: 'ml',    category: 'dairy' },
  { name: 'Sour cream',       default_unit: 'ml',    category: 'dairy' },
  { name: 'Parmesan',         default_unit: 'g',     category: 'dairy' },
  { name: 'Mozzarella',       default_unit: 'g',     category: 'dairy' },
  { name: 'Cheddar',          default_unit: 'g',     category: 'dairy' },
  { name: 'Feta',             default_unit: 'g',     category: 'dairy' },
  { name: 'Ricotta',          default_unit: 'g',     category: 'dairy' },
  { name: 'Cream cheese',     default_unit: 'g',     category: 'dairy' },
  { name: 'Mascarpone',         default_unit: 'g',     category: 'dairy' },
  { name: 'Yogurt',           default_unit: 'ml',    category: 'dairy' },
  { name: 'Greek yogurt',     default_unit: 'ml',    category: 'dairy' },
  { name: 'Coconut milk',     default_unit: 'ml',    category: 'dairy' },

  // ── Grains ────────────────────────────────────────────────────────────────────
  { name: 'Pasta',            default_unit: 'g',     category: 'grains' },
  { name: 'Spaghetti',        default_unit: 'g',     category: 'grains' },
  { name: 'Linguine',         default_unit: 'g',     category: 'grains' },
  { name: 'Penne',            default_unit: 'g',     category: 'grains' },
  { name: 'Rigatoni',         default_unit: 'g',     category: 'grains' },
  { name: 'Rice',             default_unit: 'g',     category: 'grains' },
  { name: 'Basmati rice',     default_unit: 'g',     category: 'grains' },
  { name: 'Jasmine rice',     default_unit: 'g',     category: 'grains' },
  { name: 'Arborio rice',     default_unit: 'g',     category: 'grains' },
  { name: 'Bread',            default_unit: 'piece', category: 'grains' },
  { name: 'Flour',            default_unit: 'g',     category: 'grains' },
  { name: 'Plain flour',      default_unit: 'g',     category: 'grains' },
  { name: 'Oats',             default_unit: 'g',     category: 'grains' },
  { name: 'Quinoa',           default_unit: 'g',     category: 'grains' },
  { name: 'Couscous',         default_unit: 'g',     category: 'grains' },
  { name: 'Noodles',          default_unit: 'g',     category: 'grains' },
  { name: 'Tortillas',        default_unit: 'piece', category: 'grains' },
  { name: 'Breadcrumbs',      default_unit: 'g',     category: 'grains' },

  // ── Pantry ────────────────────────────────────────────────────────────────────
  { name: 'Water',                default_unit: 'ml',   category: 'pantry' },
  { name: 'Olive oil',            default_unit: 'ml',   category: 'pantry' },
  { name: 'Vegetable oil',        default_unit: 'ml',   category: 'pantry' },
  { name: 'Sesame oil',           default_unit: 'ml',   category: 'pantry' },
  { name: 'Salt',                 default_unit: 'tsp',  category: 'pantry' },
  { name: 'Black pepper',         default_unit: 'tsp',  category: 'pantry' },
  { name: 'Sugar',                default_unit: 'g',    category: 'pantry' },
  { name: 'Brown sugar',          default_unit: 'g',    category: 'pantry' },
  { name: 'Honey',                default_unit: 'tbsp', category: 'pantry' },
  { name: 'Soy sauce',            default_unit: 'tbsp', category: 'pantry' },
  { name: 'Vinegar',              default_unit: 'ml',   category: 'pantry' },
  { name: 'Lemon juice',          default_unit: 'ml',   category: 'pantry' },
  { name: 'Tomato paste',         default_unit: 'tbsp', category: 'pantry' },
  { name: 'Canned tomatoes',      default_unit: 'can',  category: 'pantry' },
  { name: 'Chicken stock',        default_unit: 'ml',   category: 'pantry' },
  { name: 'Vegetable stock',      default_unit: 'ml',   category: 'pantry' },
  { name: 'Canned chickpeas',     default_unit: 'can',  category: 'pantry' },
  { name: 'Canned black beans',   default_unit: 'can',  category: 'pantry' },
  { name: 'Red lentils',          default_unit: 'g',    category: 'pantry' },
  { name: 'Cumin',                default_unit: 'tsp',  category: 'pantry' },
  { name: 'Paprika',              default_unit: 'tsp',  category: 'pantry' },
  { name: 'Smoked paprika',       default_unit: 'tsp',  category: 'pantry' },
  { name: 'Chilli powder',        default_unit: 'tsp',  category: 'pantry' },
  { name: 'Turmeric',             default_unit: 'tsp',  category: 'pantry' },
  { name: 'Coriander',            default_unit: 'tsp',  category: 'pantry' },
  { name: 'Oregano',              default_unit: 'tsp',  category: 'pantry' },
  { name: 'Cinnamon',             default_unit: 'tsp',  category: 'pantry' },
  { name: 'Mustard',              default_unit: 'tbsp', category: 'pantry' },
  { name: 'Dijon mustard',        default_unit: 'tbsp', category: 'pantry' },
  { name: 'Mayonnaise',           default_unit: 'tbsp', category: 'pantry' },
  { name: 'Cornstarch',           default_unit: 'tbsp', category: 'pantry' },
  { name: 'Baking powder',        default_unit: 'tsp',  category: 'pantry' },
  { name: 'Vanilla extract',      default_unit: 'tsp',  category: 'pantry' },
  { name: 'Cocoa powder',         default_unit: 'g',    category: 'pantry' },
  { name: 'Peanut butter',        default_unit: 'tbsp', category: 'pantry' },
  { name: 'Tahini',               default_unit: 'tbsp', category: 'pantry' },
  { name: 'Almonds',              default_unit: 'g',    category: 'pantry' },
  { name: 'Walnuts',              default_unit: 'g',    category: 'pantry' },
  { name: 'Coconut cream',        default_unit: 'ml',   category: 'pantry' },
  { name: 'Fish sauce',           default_unit: 'tbsp', category: 'pantry' },
  { name: 'Oyster sauce',         default_unit: 'tbsp', category: 'pantry' },
  { name: 'Hoisin sauce',         default_unit: 'tbsp', category: 'pantry' },
]

/** Lookup map for O(1) default_unit + category resolution */
const ITEM_MAP = new Map(ITEMS.map(i => [i.name.toLowerCase(), i]))

/**
 * Get default_unit and category for a selected ingredient name.
 * Returns null if not found.
 */
export function getIngredientDefaults(name) {
  return ITEM_MAP.get(name.toLowerCase()) ?? null
}

/**
 * Return up to `limit` suggestions matching the given query.
 * Prefix matches first, then substring.
 */
export function getSuggestions(query, limit = 6) {
  if (!query || query.length < 2) return []
  const q = query.toLowerCase().trim()
  const prefix = [], anywhere = []
  for (const item of ITEMS) {
    const sl = item.name.toLowerCase()
    if (sl.startsWith(q))   prefix.push(item.name)
    else if (sl.includes(q)) anywhere.push(item.name)
  }
  return [...prefix, ...anywhere].slice(0, limit)
}
