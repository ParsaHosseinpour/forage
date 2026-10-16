/**
 * Each section of the app owns one produce hue (like a product line).
 * `ink` is the readable text colour on that hue.
 */
export const HUES = {
  '/fridge':   { hue: '#FFD23F', ink: '#2B2118' },   // butter
  '/recipes':  { hue: '#D8321F', ink: '#FFFFFF' },   // tomato
  '/saved':    { hue: '#F28A1E', ink: '#2B2118' },   // carrot
  '/schedule': { hue: '#1E6B3E', ink: '#FFFFFF' },   // spinach
  '/history':  { hue: '#EA6A8E', ink: '#2B2118' },   // radish
  '/profile':  { hue: '#FFD23F', ink: '#2B2118' },
}

export function hueFor(pathname) {
  return HUES[pathname] ?? HUES['/fridge']
}
