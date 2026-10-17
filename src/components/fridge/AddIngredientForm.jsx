import { useState } from 'react'
import { X, Sparkles, Plus } from 'lucide-react'
import Button from '../ui/Button'
import { Input, Label, Select } from '../ui/Input'
import IngredientAutocomplete from '../ui/IngredientAutocomplete'
import { parseBulkIngredients, detectCategory } from '../../lib/ingredientParser'
import { getIngredientDefaults } from '../../lib/ingredientSuggestions'
import { CATEGORIES, UNITS } from '../../lib/fridgeConstants'

const DEFAULT = { name: '', quantity: '', unit: '', category: 'produce' }

// ── Single ingredient form ───────────────────────────────────────────────────

function SingleForm({ onAdd, onClose, initialName = '' }) {
  const [form, setForm]       = useState({ ...DEFAULT, name: initialName })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [lastAdded, setLastAdded] = useState('')

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setLoading(true)
    setError('')
    try {
      await onAdd({ ...form, category: form.category || detectCategory(form.name) })
      setLastAdded(form.name.trim())
      setForm(DEFAULT)
      // Stay open so several ingredients can be added in a row.
      document.getElementById('ing-name')?.focus()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="ing-name">Ingredient *</Label>
        <IngredientAutocomplete
          id="ing-name"
          value={form.name}
          onChange={set('name')}
          onSelect={(name) => {
            const defaults = getIngredientDefaults(name)
            setForm(f => ({
              ...f,
              name,
              category: defaults?.category ?? detectCategory(name),
              unit:     defaults?.default_unit ?? f.unit,
            }))
          }}
          autoFocus
        />
      </div>

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

      <div>
        <Label htmlFor="ing-cat">Category</Label>
        <Select id="ing-cat" value={form.category} onChange={set('category')}>
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </Select>
      </div>

      {error && <p role="alert" className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
      {lastAdded && !error && (
        <p role="status" className="text-sm" style={{ color: 'var(--fresh)' }}>
          Added {lastAdded}. Add another, or press Done.
        </p>
      )}

      <div className="flex gap-3 pt-1">
        {onClose && (
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            {lastAdded ? 'Done' : 'Cancel'}
          </Button>
        )}
        <Button type="submit" loading={loading} className="flex-1">
          Add ingredient
        </Button>
      </div>
    </form>
  )
}

// ── Bulk / smart paste form ──────────────────────────────────────────────────

function BulkForm({ onAdd, onClose }) {
  const [text, setText]         = useState('')
  const [parsed, setParsed]     = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [previewed, setPreviewed] = useState(false)

  const handleParse = () => {
    if (!text.trim()) return
    const items = parseBulkIngredients(text)
    // Auto-detect categories
    const withCats = items.map(item => ({
      ...item,
      category: detectCategory(item.name),
    }))
    setParsed(withCats)
    setPreviewed(true)
    setError('')
  }

  const handleAdd = async () => {
    setLoading(true)
    setError('')
    let failed = 0
    for (const item of parsed) {
      try {
        await onAdd({
          name:     item.name,
          quantity: item.quantity ?? '',
          unit:     item.unit     ?? '',
          category: item.category ?? 'produce',
        })
      } catch {
        failed++
      }
    }
    setLoading(false)
    if (failed > 0) {
      setError(`${failed} item${failed !== 1 ? 's' : ''} failed to add.`)
    } else {
      onClose?.()
    }
  }

  const updateParsed = (idx, key, val) => {
    setParsed(prev => prev.map((p, i) => i === idx ? { ...p, [key]: val } : p))
  }

  const removeParsed = (idx) => {
    setParsed(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-4">
      {!previewed ? (
        <>
          <div>
            <Label htmlFor="bulk-input">Paste your ingredient list</Label>
            <textarea
              id="bulk-input"
              rows={5}
              placeholder={`Type or paste naturally, e.g.:\n500g chicken breast\n2 tomatoes\n1L whole milk, 3 eggs\nhandful of fresh basil`}
              value={text}
              onChange={e => setText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm resize-none"
              style={{
                borderColor: 'var(--border)',
                background:  'white',
                color:       'var(--ink)',
                lineHeight:  1.6,
              }}
              onFocus={e => e.target.style.borderColor = 'var(--brand)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
              autoFocus
            />
            <p className="text-xs mt-1.5" style={{ color: 'var(--ink-muted)' }}>
              Separate items by comma, newline, or semicolon. Quantities and units are auto-detected.
            </p>
          </div>

          <div className="flex gap-3">
            {onClose && (
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button
              className="flex-1"
              onClick={handleParse}
              disabled={!text.trim()}
            >
              <Sparkles size={15} /> Parse ingredients
            </Button>
          </div>
        </>
      ) : (
        <>
          <div>
            <p className="text-[13px] font-medium mb-3"
               style={{ color: 'var(--ink-muted)' }}>
              Review {parsed.length} ingredient{parsed.length !== 1 ? 's' : ''} — edit anything before adding
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {parsed.map((item, idx) => (
                <div key={idx}
                     className="flex items-center gap-2 p-3 rounded-xl border"
                     style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
                  {/* Name */}
                  <input
                    className="flex-1 min-w-0 text-sm bg-white border rounded-lg px-2.5 py-1.5"
                    style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
                    value={item.name}
                    onChange={e => updateParsed(idx, 'name', e.target.value)}
                  />
                  {/* Qty */}
                  <input
                    type="number"
                    className="w-16 text-sm bg-white border rounded-lg px-2 py-1.5 text-center"
                    style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
                    placeholder="qty"
                    value={item.quantity ?? ''}
                    onChange={e => updateParsed(idx, 'quantity', e.target.value)}
                  />
                  {/* Unit */}
                  <select
                    className="w-20 text-sm bg-white border rounded-lg px-1.5 py-1.5"
                    style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
                    value={item.unit ?? ''}
                    onChange={e => updateParsed(idx, 'unit', e.target.value)}
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u || '—'}</option>)}
                  </select>
                  {/* Remove */}
                  <button
                    onClick={() => removeParsed(idx)}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                    style={{ color: 'var(--danger)' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1"
                    onClick={() => { setPreviewed(false); setParsed([]) }}>
              ← Back
            </Button>
            <Button
              className="flex-1"
              loading={loading}
              disabled={parsed.length === 0}
              onClick={handleAdd}
            >
              <Plus size={15} /> Add {parsed.length} item{parsed.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function AddIngredientForm({ onAdd, onClose, initialName = '' }) {
  const [tab, setTab] = useState('single')

  const tabStyle = (t) => ({
    flex: 1,
    padding: '0.5rem 0',
    fontSize: '0.8125rem',
    fontWeight: tab === t ? 500 : 400,
    borderBottom: `2px solid ${tab === t ? 'var(--brand)' : 'transparent'}`,
    color: tab === t ? 'var(--brand)' : 'var(--ink-muted)',
    transition: 'all 0.15s',
    background: 'transparent',
    cursor: 'pointer',
  })

  return (
    <div className="rounded-[14px] p-6 slide-up"
         style={{ background: 'var(--surface)', border: '2.5px solid var(--ink)', boxShadow: '0 4px 0 var(--ink)' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg" style={{ fontFamily: 'var(--font-display)' }}>
          Add to fridge
        </h3>
        {onClose && (
          <button onClick={onClose} aria-label="Close" className="p-1 rounded-lg hover:bg-[var(--bg-sunk)] transition-colors">
            <X size={18} style={{ color: 'var(--ink-muted)' }} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-5" style={{ borderColor: 'var(--border)' }}>
        <button style={tabStyle('single')} onClick={() => setTab('single')}>
          Single item
        </button>
        <button style={tabStyle('bulk')} onClick={() => setTab('bulk')}>
          Smart paste
        </button>
      </div>

      {tab === 'single'
        ? <SingleForm onAdd={onAdd} onClose={onClose} initialName={initialName} />
        : <BulkForm  onAdd={onAdd} onClose={onClose} />}
    </div>
  )
}
