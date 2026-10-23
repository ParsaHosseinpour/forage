import { useState } from 'react'
import { LogOut, TriangleAlert } from 'lucide-react'
import Button from '../ui/Button'
import { Input, Label } from '../ui/Input'
import { useToast } from '../ui/Toast'
import {
  signOut, updateUserMeta, updatePassword, deleteMyAccount,
} from '../../lib/supabase'
import { DIETS, SERVING_CHOICES, getPrefs, shownName } from '../../lib/preferences'
import PageHeader from '../layout/PageHeader'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'

function Section({ title, description, children, tone = 'default' }) {
  const danger = tone === 'danger'
  return (
    <section
      className="rounded-[14px] border p-6"
      style={{
        background:  'var(--surface)',
        borderColor: danger ? 'var(--danger-soft)' : 'var(--border)',
      }}
    >
      <h2 className="text-xl mb-1" style={danger ? { color: 'var(--danger)' } : undefined}>
        {title}
      </h2>
      {description && (
        <p className="text-[15px] mb-5" style={{ color: 'var(--ink-muted)' }}>{description}</p>
      )}
      {children}
    </section>
  )
}

function Choice({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="px-3.5 py-1.5 rounded-[8px] text-sm border transition-colors duration-150 whitespace-nowrap"
      style={{
        background:  active ? 'var(--brand)' : 'var(--surface)',
        color:       active ? 'white'        : 'var(--ink)',
        borderColor: active ? 'var(--brand)' : 'var(--border)',
        fontWeight:  active ? 600            : 500,
      }}
    >
      {children}
    </button>
  )
}

function Message({ kind, children }) {
  const ok = kind === 'ok'
  return (
    <p
      role={ok ? 'status' : 'alert'}
      className="text-sm rounded-[10px] px-4 py-3"
      style={{
        color:      ok ? 'var(--fresh)'       : 'var(--danger)',
        background: ok ? 'var(--fresh-tint)'  : 'var(--danger-tint)',
      }}
    >
      {children}
    </p>
  )
}

export default function ProfilePage({ user }) {
  const install = useInstallPrompt()
  const toast = useToast()
  const saved = getPrefs(user)

  // ── Profile + recipe defaults ──────────────────────────────────────────
  const [name, setName]         = useState(saved.displayName)
  const [servings, setServings] = useState(saved.defaultServings)
  const [diet, setDiet]         = useState(saved.defaultDiet)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [prefsError, setPrefsError]   = useState('')

  const prefsDirty =
    name.trim() !== saved.displayName ||
    servings !== saved.defaultServings ||
    diet !== saved.defaultDiet

  async function handleSavePrefs(e) {
    e.preventDefault()
    setSavingPrefs(true)
    setPrefsError('')
    const { error } = await updateUserMeta({
      display_name:     name.trim(),
      default_servings: servings,
      default_diet:     diet,
    })
    setSavingPrefs(false)
    if (error) { setPrefsError(error.message); return }
    toast({ type: 'success', message: 'Preferences saved.', duration: 3000 })
  }

  // ── Password ───────────────────────────────────────────────────────────
  const [pw, setPw]           = useState('')
  const [pw2, setPw2]         = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwError('')
    if (pw.length < 6)  { setPwError('Use at least 6 characters.'); return }
    if (pw !== pw2)     { setPwError('The two passwords do not match.'); return }
    setPwLoading(true)
    const { error } = await updatePassword(pw)
    setPwLoading(false)
    if (error) { setPwError(error.message); return }
    setPw(''); setPw2('')
    toast({ type: 'success', message: 'Password updated.', duration: 3000 })
  }

  // ── Delete account ─────────────────────────────────────────────────────
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [typed, setTyped]             = useState('')
  const [deleting, setDeleting]       = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const emailMatches = typed.trim().toLowerCase() === (user.email ?? '').toLowerCase()

  async function handleDelete() {
    setDeleting(true)
    setDeleteError('')
    const { error } = await deleteMyAccount()
    if (error) {
      setDeleting(false)
      console.error('Delete account failed:', error)
      // PGRST202 = the delete_my_account() SQL function has not been installed
      setDeleteError(
        error.code === 'PGRST202'
          ? 'Account deletion is not set up on this server yet.'
          : 'We could not delete your account. Please try again.'
      )
    }
    // On success the auth listener signs the user out and the app returns to
    // the sign-in screen, so there is nothing more to do here.
  }

  return (
    <div className="max-w-2xl mx-auto px-5 pt-8 pb-16">
      <PageHeader
        width="max-w-2xl"
        title="Profile"
        art="Onion"
        subtitle={`Signed in as ${shownName(user)}, ${user.email}`}
      />

      <div className="space-y-6">

        {/* Install */}
        {(install.state !== 'none' || install.isIos) && (
          <Section
            title="Install Forage"
            description={
              install.state === 'installed'
                ? 'Forage is installed on this device.'
                : install.state === 'available'
                  ? 'Add Forage to your home screen or desktop. It opens in its own window, even with a weak connection.'
                  : 'On iPhone or iPad: tap the Share button in Safari, then choose Add to Home Screen.'
            }
          >
            {install.state === 'available' && <Button onClick={install.install}>Install Forage</Button>}
          </Section>
        )}

        {/* Preferences */}
        <Section
          title="Preferences"
          description="Your name and what Forage starts with when you look for recipes."
        >
          <form onSubmit={handleSavePrefs} className="space-y-5">
            <div>
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="What should we call you?"
                maxLength={40}
                autoComplete="nickname"
              />
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Default servings</p>
              <div className="flex flex-wrap gap-2">
                {SERVING_CHOICES.map(c => (
                  <Choice key={String(c.value)} active={servings === c.value} onClick={() => setServings(c.value)}>
                    {c.label}
                  </Choice>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Default diet</p>
              <div className="flex flex-wrap gap-2">
                {DIETS.map(d => (
                  <Choice key={d.value} active={diet === d.value} onClick={() => setDiet(d.value)}>
                    {d.value === '' ? 'No default' : d.label}
                  </Choice>
                ))}
              </div>
            </div>

            {prefsError && <Message kind="error">{prefsError}</Message>}

            <Button type="submit" loading={savingPrefs} disabled={!prefsDirty}>
              Save preferences
            </Button>
          </form>
        </Section>

        {/* Password */}
        <Section title="Password" description="Choose a new password for signing in.">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={pw}
                onChange={e => setPw(e.target.value)}
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={pw2}
                onChange={e => setPw2(e.target.value)}
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            {pwError && <Message kind="error">{pwError}</Message>}
            <Button type="submit" variant="secondary" loading={pwLoading} disabled={!pw || !pw2}>
              Update password
            </Button>
          </form>
        </Section>

        {/* Session */}
        <Section title="Sign out" description="End your session on this device.">
          <Button variant="secondary" onClick={() => signOut()}>
            <LogOut size={16} strokeWidth={1.75} />
            Sign out
          </Button>
        </Section>

        {/* Danger zone */}
        <Section
          tone="danger"
          title="Delete account"
          description="Permanently deletes your account and everything in it: your fridge, saved recipes, meal plan, shopping list and cook history. This cannot be undone."
        >
          {!confirmOpen ? (
            <Button variant="danger" className="!border-[var(--danger-soft)]" onClick={() => setConfirmOpen(true)}>
              <TriangleAlert size={16} strokeWidth={1.75} />
              Delete my account…
            </Button>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="confirm-email">
                  Type <span style={{ color: 'var(--danger)' }}>{user.email}</span> to confirm
                </Label>
                <Input
                  id="confirm-email"
                  value={typed}
                  onChange={e => setTyped(e.target.value)}
                  autoComplete="off"
                  autoFocus
                />
              </div>

              {deleteError && <Message kind="error">{deleteError}</Message>}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={!emailMatches || deleting}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'var(--danger)' }}
                >
                  {deleting ? <span className="spinner" /> : 'Permanently delete account'}
                </button>
                <Button
                  variant="ghost"
                  disabled={deleting}
                  onClick={() => { setConfirmOpen(false); setTyped(''); setDeleteError('') }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
