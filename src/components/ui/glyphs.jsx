import {
  Sunrise, Sun, Moon, Apple, Laugh, ThumbsUp, Meh, Flame, Hourglass,
} from 'lucide-react'

import Produce from './Produce'

/** Empty-state art: an illustrated sticker (or, for legacy callers, a line icon). */
export function IconTile({ art, Icon, tone = 'brand', size = 26 }) {
  if (art) {
    return (
      <div
        className="w-28 h-28 rounded-full grid place-items-center mx-auto mb-5"
        style={{ background: 'var(--saffron-tint)', border: '2.5px solid var(--ink)', transform: 'rotate(-5deg)' }}
        aria-hidden="true"
      >
        <Produce name={art} size={74} />
      </div>
    )
  }
  const tones = {
    brand: ['var(--brand-tint)', 'var(--brand)'],
    fresh: ['var(--fresh-tint)', 'var(--fresh)'],
    carrot: ['var(--carrot-tint)', 'var(--carrot)'],
  }
  const [bg, fg] = tones[tone]
  return (
    <div
      className="w-14 h-14 rounded-[14px] flex items-center justify-center mx-auto mb-5"
      style={{ background: bg }}
    >
      <Icon size={size} strokeWidth={1.75} style={{ color: fg }} />
    </div>
  )
}

const SLOT_ICONS = { breakfast: Sunrise, lunch: Sun, dinner: Moon, snack: Apple }

export function SlotIcon({ slot, size = 14, ...props }) {
  const Icon = SLOT_ICONS[slot] ?? Apple
  return <Icon size={size} strokeWidth={1.75} {...props} />
}

const MOOD_ICONS = { 5: Laugh, 4: ThumbsUp, 3: Meh, 2: Flame, 1: Hourglass }

export function MoodIcon({ value, size = 16, ...props }) {
  const Icon = MOOD_ICONS[value]
  return Icon ? <Icon size={size} strokeWidth={1.75} {...props} /> : null
}
