import { useState } from 'react'
import { X } from 'lucide-react'
import { Input, Select, Label } from '../ui/Input'
import Button from '../ui/Button'
import { useDialog } from '../../hooks/useDialog'
import { CATEGORIES, UNITS } from '../../lib/fridgeConstants'

/** Edit or remove one ingredient. Bottom sheet on phones, dialog on desktop. */
export default function IngredientSheet({ item, onClose, onSave, onRemove }) {
  const dialogRef = useDialog(onClose)
  const [name, setName]         = useState(item.name)
  const [quantity, setQuantity] = useState(item.quantity ?? '')
  const [unit, setUnit]         = useState(item.unit ?? '')
  const [category, setCategory] = useState(item.category ?? 'other')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const save = async (e) => {
    e?.preventDefault()
    if (!name.trim()) { setError('Give the ingredient a name.'); return }
    setSaving(true); setError('')
    try {
      await onSave(item.id, { name: name.trim(), quantity: quantity === '' ? null : quantity, unit: unit || null, category })
      onClose()
    } catch {
      setError('Could not save. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${item.name}`}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(43,33,24,0.55)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={save}
        className="w-full max-w-md rounded-[14px] p-5 sm:p-6 fade-in"
        style={{ background: 'var(--bg)', border: '2.5px solid var(--ink)', boxShadow: '0 6px 0 var(--ink)' }}
      >
        <div className="flex items-start gap-3 mb-5">
          <h2 className="text-[28px] flex-1 min-w-0 break-words">{item.name}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 -mr-2 -mt-1 rounded-full hover:bg-[var(--bg-sunk)]">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="sheet-name">Name</Label>
            <Input id="sheet-name" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sheet-qty">Quantity</Label>
              <Input id="sheet-qty" type="number" inputMode="decimal" min="0" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="sheet-unit">Unit</Label>
              <Select id="sheet-unit" value={unit} onChange={e => setUnit(e.target.value)}>
                {UNITS.map(u => <option key={u} value={u}>{u || 'none'}</option>)}
                {unit && !UNITS.includes(unit) && <option value={unit}>{unit}</option>}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="sheet-cat">Category</Label>
            <Select id="sheet-cat" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </div>
        </div>

        {error && <p role="alert" className="text-sm mt-4" style={{ color: 'var(--danger)' }}>{error}</p>}

        <div className="flex items-center gap-3 mt-6">
          <Button type="submit" loading={saving} className="flex-1">Save</Button>
          <Button type="button" variant="danger" onClick={() => onRemove(item)}>Remove</Button>
        </div>
      </form>
    </div>
  )
}
