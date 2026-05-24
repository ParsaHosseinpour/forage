import { useState } from 'react'
import Button from '../ui/Button'
import { Input, Label, Select } from '../ui/Input'
import { X } from 'lucide-react'

const CATEGORIES = [
  { value: 'produce',   label: '🥦 Produce'   },
  { value: 'protein',   label: '🥩 Protein'   },
  { value: 'dairy',     label: '🧀 Dairy'     },
  { value: 'grains',    label: '🌾 Grains'    },
  { value: 'pantry',    label: '🫙 Pantry'    },
  { value: 'frozen',    label: '🧊 Frozen'    },
  { value: 'other',     label: '📦 Other'     },
]

const UNITS = ['', 'g', 'kg', 'ml', 'L', 'oz', 'lb', 'cup', 'tbsp', 'tsp', 'piece', 'bunch', 'clove', 'slice']

const DEFAULT = { name: '', quantity: '', unit: '', category: 'produce' }

export default function AddIngredientForm({ onAdd, onClose }) {
  const [form, setForm]       = useState(DEFAULT)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setLoading(true)
    setError('')
    try {
      await onAdd(form)
      setForm(DEFAULT)
      onClose?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border p-6 slide-up"
         style={{ background: 'white', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}>

      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg" style={{ fontFamily: 'Playfair Display, serif' }}>
          Add to fridge
        </h3>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} style={{ color: 'var(--ink-muted)' }} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Ingredient name */}
        <div>
          <Label htmlFor="ing-name">Ingredient *</Label>
          <Input
            id="ing-name"
            placeholder="e.g. Cherry tomatoes"
            value={form.name}
            onChange={set('name')}
            required
            autoFocus
          />
        </div>

        {/* Quantity + unit side by side */}
        <div className="flex gap-3">
          <div className="flex-1">
            <Label htmlFor="ing-qty">Quantity</Label>
            <Input
              id="ing-qty"
              type="number"
              min="0"
              step="any"
              placeholder="e.g. 200"
              value={form.quantity}
              onChange={set('quantity')}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="ing-unit">Unit</Label>
            <Select id="ing-unit" value={form.unit} onChange={set('unit')}>
              {UNITS.map(u => (
                <option key={u} value={u}>{u || '—'}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* Category */}
        <div>
          <Label htmlFor="ing-cat">Category</Label>
          <Select id="ing-cat" value={form.category} onChange={set('category')}>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
        </div>

        {error && (
          <p className="text-sm" style={{ color: 'var(--red-soft)' }}>{error}</p>
        )}

        <div className="flex gap-3 pt-1">
          {onClose && (
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={loading} className="flex-1">
            Add ingredient
          </Button>
        </div>
      </form>
    </div>
  )
}

export { CATEGORIES }
