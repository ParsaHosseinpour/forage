import { useState } from 'react'
import { Trash2, Pencil, Check, X } from 'lucide-react'
import { Input } from '../ui/Input'

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

  return (
    <div
      className="group flex items-center gap-3 px-4 py-3 transition-colors"
      style={{
        background: deleting ? 'var(--danger-tint)' : 'transparent',
        opacity: deleting ? 0.6 : 1,
      }}
    >

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
            style={{ color: 'var(--brand)' }}
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
          <p className="text-[15px] font-medium truncate flex-1 min-w-0" style={{ color: 'var(--ink)' }}>
            {item.name}
          </p>
          {(item.quantity || item.unit) && (
            <p className="text-sm ml-3 flex-shrink-0 tabular-nums" style={{ color: 'var(--ink-muted)' }}>
              {[item.quantity, item.unit].filter(Boolean).join(' ')}
            </p>
          )}

          <div className="flex items-center gap-1 ml-2 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-sunk)] transition-colors"
              style={{ color: 'var(--ink-muted)' }}
              title="Edit"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--danger)' }}
              title="Remove"
            >
              {deleting
                ? <span className="spinner" style={{ width: 14, height: 14, color: 'var(--danger)' }} />
                : <Trash2 size={14} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
