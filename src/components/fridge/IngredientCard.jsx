import { useState } from 'react'
import { Trash2, Pencil, Check, X } from 'lucide-react'
import Button from '../ui/Button'
import { Input } from '../ui/Input'
import { CATEGORIES } from './AddIngredientForm'

const categoryEmoji = Object.fromEntries(
  CATEGORIES.map(c => [c.value, c.label.split(' ')[0]])
)

export default function IngredientCard({ item, onDelete, onUpdate }) {
  const [deleting, setDeleting]   = useState(false)
  const [editing, setEditing]     = useState(false)
  const [name, setName]           = useState(item.name)
  const [quantity, setQuantity]   = useState(item.quantity ?? '')
  const [unit, setUnit]           = useState(item.unit ?? '')
  const [saving, setSaving]       = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try { await onDelete(item.id) }
    catch { setDeleting(false) }
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onUpdate(item.id, {
        name: name.trim(),
        quantity: quantity || null,
        unit: unit || null,
      })
      setEditing(false)
    } catch { /* keep form open */ }
    finally { setSaving(false) }
  }

  const emoji = categoryEmoji[item.category] ?? '📦'

  return (
    <div
      className="group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200"
      style={{
        background: deleting ? '#FEF2F0' : 'white',
        borderColor: deleting ? '#FECACA' : 'var(--border)',
        opacity: deleting ? 0.6 : 1,
      }}
    >
      {/* Category emoji */}
      <span className="text-xl select-none flex-shrink-0">{emoji}</span>

      {editing ? (
        /* ── Inline edit mode ── */
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            className="flex-1 min-w-0 py-1.5"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
          <Input
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="qty"
            type="number"
            className="w-20 py-1.5"
          />
          <Input
            value={unit}
            onChange={e => setUnit(e.target.value)}
            placeholder="unit"
            className="w-20 py-1.5"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--green)' }}
            title="Save"
          >
            {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Check size={15} />}
          </button>
          <button
            onClick={() => { setEditing(false); setName(item.name); setQuantity(item.quantity ?? ''); setUnit(item.unit ?? '') }}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--ink-muted)' }}
            title="Cancel"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        /* ── Display mode ── */
        <div className="flex items-center justify-between flex-1 min-w-0">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
              {item.name}
            </p>
            {(item.quantity || item.unit) && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                {[item.quantity, item.unit].filter(Boolean).join(' ')}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: 'var(--ink-muted)' }}
              title="Edit"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--red-soft)' }}
              title="Remove"
            >
              {deleting
                ? <span className="spinner" style={{ width: 14, height: 14, color: 'var(--red-soft)' }} />
                : <Trash2 size={14} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
