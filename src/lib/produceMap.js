/** Which illustration fits an ingredient name, and category fallbacks. */
export const CATEGORY_ART = {
  produce: 'Tomatoes', protein: 'Chicken', dairy: 'Yogurt',
  grains: 'Rice', pantry: 'Lentils', frozen: 'Peas', other: 'Lentils',
}

export function produceKey(name = '') {
  const n = name.trim().toLowerCase()
  const map = [
    [/\beggs?\b/, 'Eggs'], [/tomato paste|canned|\bcans?\b|tinned/, 'Can'], [/tomato/, 'Tomatoes'],
    [/onion|shallot|leek/, 'Onion'], [/feta|cheese|paneer|halloumi|parmesan|mozzarella|cheddar/, 'Feta'],
    [/spinach|kale|lettuce|salad|greens|arugula|chard/, 'Spinach'],
    [/\brice\b|quinoa|couscous|pasta|noodle|spaghetti|grain|oats?\b/, 'Rice'],
    [/chicken|turkey|duck/, 'Chicken'], [/beef|steak|pork|lamb|bacon|sausage|\bham\b|\bmeat\b/, 'Steak'],
    [/fish|salmon|tuna|shrimp|prawn|cod\b|sardine/, 'Fish'],
    [/yogh?urt|kefir|sour cream/, 'Yogurt'], [/milk|cream/, 'Milk'], [/butter|margarine/, 'Butter'],
    [/lemon|\blimes?\b|orange|grapefruit/, 'Lemon'], [/lentil|bean|chickpea|pulse/, 'Lentils'],
    [/garlic/, 'Garlic'], [/\bpeas?\b|edamame/, 'Peas'],
    [/carrot/, 'Carrot'], [/potato|\byam\b/, 'Potato'], [/mushroom/, 'Mushroom'], [/apple|\bpears?\b/, 'Apple'],
    [/(bell|red|green|yellow|sweet) pepper|capsicum|chil+i|jalape/, 'Pepper'],
    [/\bpepper\b|\bsalt\b|spice|cumin|paprika|cinnamon|oregano|thyme|seasoning|turmeric/, 'Shaker'],
    [/flour|sugar|baking|powder|starch|cocoa/, 'Bag'],
    [/broccoli|cauliflower/, 'Broccoli'], [/cucumber|zucchini|courgette|pickle/, 'Cucumber'],
    [/bread|\bbun\b|toast|bagel|tortilla|pita|baguette/, 'Bread'],
    [/\boil\b|vinegar|sauce|ketchup|dressing/, 'Bottle'], [/honey|\bjam\b|syrup/, 'Honey'],
  ]
  for (const [re, key] of map) if (re.test(n)) return key
  return null
}

