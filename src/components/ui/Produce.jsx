/**
 * Hand-drawn style produce illustrations. Flat fills, one ink outline weight.
 * They are the app's personality: landing stickers, category art, empty states.
 */
import { produceKey } from '../../lib/produceMap'

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
  Carrot: (
    <>
      <path d="M44 19 C50 25 48 32 41 39 L16 57 C11 58 8 55 9 50 L25 25 C29 18 38 15 44 19Z" fill="#F28A1E" />
      <path d="M22 36 l5 3 M28 29 l5 3 M33 43 l-5 -3" stroke="#B85408" strokeWidth="2" />
      <path d="M44 19 C43 10 49 5 55 7 C53 13 51 18 44 19Z" fill="#3E9B5A" />
      <path d="M44 19 C50 14 58 16 59 21 C55 24 48 24 44 19Z" fill="#3E9B5A" />
    </>
  ),
  Potato: (
    <>
      <path d="M9 36 C7 22 24 14 38 16 C54 18 59 32 52 44 C46 56 17 56 9 36Z" fill="#CF9F5E" />
      <g fill="#8A6232" strokeWidth="1.6"><circle cx="24" cy="30" r="1.8" /><circle cx="38" cy="26" r="1.8" /><circle cx="45" cy="40" r="1.8" /><circle cx="28" cy="44" r="1.8" /></g>
    </>
  ),
  Mushroom: (
    <>
      <path d="M24 34 H40 L38 55 H26Z" fill="#FFF3DC" />
      <path d="M7 35 C7 16 57 16 57 35Z" fill="#D98A6B" />
      <g fill="#fff" strokeWidth="1.6"><circle cx="20" cy="28" r="3" /><circle cx="33" cy="23" r="3.4" /><circle cx="45" cy="29" r="2.8" /></g>
    </>
  ),
  Apple: (
    <>
      <path d="M32 20 C20 12 5 22 10 39 C13 51 22 57 32 52 C42 57 51 51 54 39 C59 22 44 12 32 20Z" fill="#E2412C" />
      <path d="M18 28 C20 24 24 22 27 23" stroke="#F7A092" strokeWidth="3" />
      <path d="M32 20 L32 10" />
      <path d="M33 14 C37 7 45 8 47 10 C43 16 37 17 33 14Z" fill="#3E9B5A" />
    </>
  ),
  Pepper: (
    <>
      <path d="M32 18 C17 14 7 27 11 42 C14 54 26 59 32 52 C38 59 50 54 53 42 C57 27 47 14 32 18Z" fill="#F4B72A" />
      <path d="M32 21 C28 32 28 44 32 52" stroke="#C98A0C" strokeWidth="2" />
      <path d="M32 18 L30 9 H37 L35 18Z" fill="#3E9B5A" />
    </>
  ),
  Broccoli: (
    <>
      <path d="M26 38 H38 L36 57 H28Z" fill="#A9D987" />
      <circle cx="21" cy="30" r="10" fill="#3E9B5A" />
      <circle cx="43" cy="30" r="10" fill="#3E9B5A" />
      <circle cx="32" cy="22" r="11" fill="#4DAF69" />
      <circle cx="32" cy="34" r="9" fill="#3E9B5A" />
    </>
  ),
  Cucumber: (
    <>
      <rect x="6" y="24" width="52" height="17" rx="8.5" fill="#3E9B5A" transform="rotate(-28 32 32)" />
      <path d="M17 40 l3 -2 M26 34 l3 -2 M35 28 l3 -2 M44 22 l3 -2" stroke="#A9D987" strokeWidth="2" />
    </>
  ),
  Milk: (
    <>
      <path d="M18 24 H46 V56 H18Z" fill="#FFFFFF" />
      <path d="M18 24 L32 10 L46 24Z" fill="#FFD23F" />
      <circle cx="32" cy="41" r="6.5" fill="#E2412C" />
    </>
  ),
  Butter: (
    <>
      <path d="M10 28 L32 18 L54 28 L32 38Z" fill="#FFEFA0" />
      <path d="M10 28 L32 38 L32 54 L10 44Z" fill="#FFD23F" />
      <path d="M54 28 L32 38 L32 54 L54 44Z" fill="#FFDF5E" />
      <path d="M32 38 L32 54" />
    </>
  ),
  Bread: (
    <>
      <path d="M9 40 C5 27 16 17 32 17 C48 17 59 27 55 40 C55 47 52 51 48 51 H16 C12 51 9 47 9 40Z" fill="#D9A45B" />
      <path d="M21 26 l6 8 M31 23 l6 9 M42 26 l5 7" stroke="#A8742E" strokeWidth="2.2" />
    </>
  ),
  Fish: (
    <>
      <path d="M49 32 L60 21 V43Z" fill="#7FA6C4" />
      <path d="M7 32 C17 17 40 17 50 32 C40 47 17 47 7 32Z" fill="#A9C7DD" />
      <path d="M23 24 C27 30 27 34 23 40" stroke="#7FA6C4" />
      <circle cx="17" cy="30" r="2" fill="#2B2118" />
    </>
  ),
  Steak: (
    <>
      <path d="M11 30 C11 17 30 11 44 15 C57 19 59 34 51 44 C43 55 22 55 14 45 C10 41 11 35 11 30Z" fill="#C4574B" />
      <path d="M21 27 C27 25 33 30 41 25" stroke="#F3B1A7" strokeWidth="2.2" />
      <circle cx="31" cy="39" r="4.5" fill="#FFF3DC" />
    </>
  ),
  Bottle: (
    <>
      <path d="M24 24 H40 V54 C40 56 38 58 36 58 H28 C26 58 24 56 24 54Z" fill="#8FBF4A" />
      <path d="M28 12 H36 V24 H28Z" fill="#8FBF4A" />
      <rect x="27" y="6" width="10" height="7" rx="1.5" fill="#FFD23F" />
      <rect x="24" y="35" width="16" height="12" fill="#FFF8E7" />
    </>
  ),
  Can: (
    <>
      <path d="M16 19 H48 V53 C48 56 40 58 32 58 C24 58 16 56 16 53Z" fill="#E2412C" />
      <rect x="16" y="30" width="32" height="14" fill="#FFF3DC" strokeWidth="2" />
      <ellipse cx="32" cy="19" rx="16" ry="5" fill="#C9CED4" />
    </>
  ),
  Honey: (
    <>
      <rect x="17" y="11" width="30" height="9" rx="3" fill="#8A5A2B" />
      <path d="M16 20 H48 V52 C48 55 46 57 43 57 H21 C18 57 16 55 16 52Z" fill="#F4B72A" />
      <rect x="22" y="31" width="20" height="15" rx="2" fill="#FFF8E7" strokeWidth="2" />
      <path d="M21 25 C21 24 23 24 23 25" strokeWidth="2" />
    </>
  ),
  Shaker: (
    <>
      <path d="M22 24 H42 L44 55 H20Z" fill="#FFFFFF" />
      <path d="M22 24 L26 11 H38 L42 24Z" fill="#C9CED4" />
      <g fill="#2B2118" stroke="none"><circle cx="29" cy="17" r="1.3" /><circle cx="35" cy="17" r="1.3" /><circle cx="32" cy="21" r="1.3" /></g>
      <rect x="21.5" y="35" width="21" height="11" fill="#FFD23F" strokeWidth="2" />
    </>
  ),
  Bag: (
    <>
      <path d="M16 15 H48 V56 H16Z" fill="#F1E3C4" />
      <path d="M16 15 L20 8 H44 L48 15Z" fill="#E3CFA2" />
      <circle cx="32" cy="35" r="9" fill="#FFF8E7" strokeWidth="2" />
      <path d="M27 36 C29 31 35 31 37 36" strokeWidth="2" />
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

const LETTER_TINTS = ['#FDE8D2', '#E3F1E3', '#FFF4C2', '#FBE3DE', '#F8DCE6']

/** Illustration when we have one; otherwise a lettered sticker, never a wrong picture. */
export function IngredientArt({ name = '', size = 44, className = '' }) {
  const key = produceKey(name)
  if (key) return <Produce name={key} size={size} className={className} />
  const letter = (name.trim()[0] ?? '?').toUpperCase()
  const tint = LETTER_TINTS[(letter.charCodeAt(0) || 0) % LETTER_TINTS.length]
  return (
    <span
      className={`inline-grid place-items-center rounded-full flex-shrink-0 ${className}`}
      style={{ width: size, height: size, background: tint, border: '2.5px solid var(--ink)', fontFamily: 'var(--font-display)', fontSize: size * 0.5, lineHeight: 1 }}
      aria-hidden="true"
    >
      {letter}
    </span>
  )
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
