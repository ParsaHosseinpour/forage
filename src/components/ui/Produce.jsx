/**
 * Hand-drawn style produce illustrations. Flat fills, one ink outline weight.
 * They are the app's personality: landing stickers, category art, empty states.
 */
const INK = '#2B2118'

const base = {
  fill: 'none',
  stroke: INK,
  strokeWidth: 2.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const ART = {
  Eggs: (
    <>
      <ellipse cx="44" cy="40" rx="11" ry="14" fill="#F0C98F" />
      <ellipse cx="29" cy="37" rx="15" ry="19" fill="#FFF6DD" />
      <path d="M21 30 C22 25 25 22 28 21" stroke="#fff" strokeWidth="3" />
    </>
  ),
  Tomatoes: (
    <>
      <path d="M32 18 C14 14 5 30 10 42 C15 55 49 55 54 42 C59 30 50 14 32 18Z" fill="#E2412C" />
      <path d="M19 30 C21 26 25 24 28 24" stroke="#F7A092" strokeWidth="3" />
      <path d="M32 19 L21 14 L28 21 L22 27 L32 23 L42 27 L36 21 L43 14 Z" fill="#3E9B5A" />
      <path d="M32 19 L32 9" />
    </>
  ),
  Onion: (
    <>
      <path d="M32 11 C38 20 54 24 52 38 C50 53 14 53 12 38 C10 24 26 20 32 11Z" fill="#C9608F" />
      <path d="M32 14 C24 26 22 40 27 51" stroke="#E7A6C4" />
      <path d="M32 14 C40 26 42 40 37 51" stroke="#E7A6C4" />
      <path d="M32 11 L30 5" />
    </>
  ),
  Feta: (
    <>
      <path d="M32 12 L54 22 L32 32 L10 22Z" fill="#FFFFFF" />
      <path d="M10 22 L32 32 L32 54 L10 44Z" fill="#F4ECD2" />
      <path d="M54 22 L32 32 L32 54 L54 44Z" fill="#FFF8E1" />
      <ellipse cx="38" cy="43" rx="3" ry="2.4" fill="#E6DAB4" strokeWidth="1.6" />
      <ellipse cx="46" cy="36" rx="2.2" ry="1.8" fill="#E6DAB4" strokeWidth="1.6" />
      <ellipse cx="19" cy="35" rx="2.6" ry="2.2" fill="#E6DAB4" strokeWidth="1.6" />
    </>
  ),
  Spinach: (
    <>
      <path d="M32 55 C9 46 8 22 32 8 C56 22 55 46 32 55Z" fill="#3E9B5A" />
      <path d="M32 55 L32 16" stroke="#1E6B3E" />
      <path d="M32 30 L22 23 M32 38 L43 30 M32 46 L22 40" stroke="#1E6B3E" strokeWidth="2" />
      <path d="M32 55 L32 61" />
    </>
  ),
  Rice: (
    <>
      <path d="M12 34 C14 19 50 19 52 34Z" fill="#FFFFFF" />
      <path d="M20 29 l3 -2 M30 25 l3 -1 M40 27 l3 2 M27 31 l3 0 M36 31 l3 0" strokeWidth="1.8" />
      <path d="M8 34 H56 C56 48 46 57 32 57 C18 57 8 48 8 34Z" fill="#F28A1E" />
      <path d="M14 42 H50" stroke="#FFD23F" strokeWidth="2" />
    </>
  ),
  Chicken: (
    <>
      <path d="M31 33 L14 50" strokeWidth="10" />
      <path d="M31 33 L14 50" stroke="#FFF3D6" strokeWidth="5" />
      <circle cx="11" cy="51" r="4" fill="#FFF3D6" />
      <circle cx="16" cy="56" r="4" fill="#FFF3D6" />
      <path d="M45 11 C59 14 58 35 44 39 C37 41 29 36 27 29 C25 21 34 9 45 11Z" fill="#E9A25A" />
      <path d="M40 18 C45 17 49 20 50 25" stroke="#F6D09B" strokeWidth="3" />
    </>
  ),
  Yogurt: (
    <>
      <path d="M14 25 H50 L46 55 H18Z" fill="#FFFFFF" />
      <path d="M19 40 C25 33 32 47 45 38" stroke="#EA6A8E" strokeWidth="3" />
      <rect x="11" y="17" width="42" height="9" rx="3" fill="#EA6A8E" />
    </>
  ),
  Lemon: (
    <>
      <path d="M5 33 L12 30 C18 15 46 15 52 30 L59 33 L52 36 C46 51 18 51 12 36Z" fill="#FFD23F" />
      <path d="M20 26 C24 22 30 21 35 22" stroke="#FFF2A8" strokeWidth="3" />
      <path d="M34 18 C37 8 48 8 51 12 C47 17 41 19 34 18Z" fill="#3E9B5A" />
    </>
  ),
  Lentils: (
    <>
      <rect x="15" y="10" width="34" height="9" rx="3" fill="#FFD23F" />
      <path d="M18 19 H46 V52 C46 55 44 57 41 57 H23 C20 57 18 55 18 52Z" fill="#FFF8E7" />
      <g strokeWidth="1.6">
        <circle cx="24" cy="50" r="3" fill="#C2751D" />
        <circle cx="31" cy="51" r="3" fill="#E08A2B" />
        <circle cx="38" cy="50" r="3" fill="#A85E14" />
        <circle cx="27" cy="44" r="3" fill="#E08A2B" />
        <circle cx="34" cy="44" r="3" fill="#C2751D" />
        <circle cx="41" cy="44" r="3" fill="#E08A2B" />
        <circle cx="30" cy="38" r="3" fill="#A85E14" />
      </g>
    </>
  ),
  Garlic: (
    <>
      <path d="M32 9 C36 16 49 22 50 36 C52 50 40 56 32 56 C24 56 12 50 14 36 C15 22 28 16 32 9Z" fill="#FFF8E7" />
      <path d="M32 14 C25 28 24 44 28 55" stroke="#D8C99A" />
      <path d="M32 14 C39 28 40 44 36 55" stroke="#D8C99A" />
      <path d="M28 56 H36 L34 61 H30Z" fill="#E7D9A8" strokeWidth="2" />
      <path d="M32 9 L32 4" />
    </>
  ),
  Peas: (
    <>
      <path d="M7 40 C13 20 51 20 57 40 C49 53 15 53 7 40Z" fill="#3E9B5A" />
      <g strokeWidth="2">
        <circle cx="19" cy="38" r="5" fill="#9ED27A" />
        <circle cx="30" cy="36" r="5.5" fill="#B7E08F" />
        <circle cx="41" cy="36" r="5.5" fill="#9ED27A" />
        <circle cx="51" cy="39" r="4.5" fill="#B7E08F" />
      </g>
    </>
  ),
  Fridge: (
    <>
      <rect x="14" y="5" width="36" height="54" rx="5" fill="#FFFFFF" />
      <path d="M14 24 H50" />
      <path d="M20 12 V18 M20 31 V43" strokeWidth="3.5" />
      <rect x="36" y="38" width="9" height="9" rx="2" fill="#F28A1E" strokeWidth="2" />
      <rect x="28" y="30" width="8" height="8" rx="4" fill="#E2412C" strokeWidth="2" />
    </>
  ),
}

export const CATEGORY_ART = {
  produce: 'Tomatoes', protein: 'Chicken', dairy: 'Yogurt',
  grains: 'Rice', pantry: 'Lentils', frozen: 'Peas', other: 'Lentils',
}

/** Ingredient name (case/plural tolerant) -> illustration key. */
export function produceKey(name = '') {
  const n = name.trim().toLowerCase()
  const map = [
    [/egg/, 'Eggs'], [/tomato/, 'Tomatoes'], [/onion|shallot|leek/, 'Onion'],
    [/feta|cheese|paneer|halloumi/, 'Feta'], [/spinach|kale|lettuce|salad|greens/, 'Spinach'],
    [/rice|quinoa|couscous|pasta|noodle|grain/, 'Rice'], [/chicken|beef|pork|lamb|meat|turkey|sausage/, 'Chicken'],
    [/yogh?urt|milk|cream|kefir/, 'Yogurt'], [/lemon|lime|orange/, 'Lemon'],
    [/lentil|bean|chickpea|pulse/, 'Lentils'], [/garlic/, 'Garlic'], [/pea/, 'Peas'],
  ]
  for (const [re, key] of map) if (re.test(n)) return key
  return null
}

export default function Produce({ name, size = 48, title, className = '', style }) {
  const art = ART[name]
  if (!art) return null
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      {...base}
    >
      {art}
    </svg>
  )
}
