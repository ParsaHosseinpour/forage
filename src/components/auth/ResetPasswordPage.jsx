import { useState } from 'react'
import { updatePassword } from '../../lib/supabase'
import Button from '../ui/Button'
import { Input, Label } from '../ui/Input'

export default function ResetPasswordPage({ onComplete }) {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }

    setLoading(true)
    try {
      const { error } = await updatePassword(password)
      if (error) throw error
      setSuccess(true)
      // Give the user a moment to see the confirmation, then drop them into the app
      setTimeout(() => onComplete?.(), 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'var(--cream)' }}>

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20"
             style={{ background: 'var(--green-mid)' }} />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full opacity-15"
             style={{ background: 'var(--amber-light)' }} />
      </div>

      <div className="relative w-full max-w-sm slide-up">

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg font-bold"
                 style={{ background: 'var(--green)' }}>
              🌿
            </div>
            <span className="text-2xl tracking-tight"
                  style={{ fontFamily: 'Playfair Display, serif', color: 'var(--ink)' }}>
              Forage
            </span>
          </div>
          <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
            {success ? "You're all set." : 'Choose a new password.'}
          </p>
        </div>

        <div className="rounded-2xl border p-8"
             style={{ background: 'white', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}>

          {success ? (
            <div className="text-center py-2">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-sm" style={{ color: 'var(--ink)' }}>
                Password updated. Taking you to your fridge…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  autoFocus
                />
              </div>

              <div>
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Repeat your password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <p className="text-sm rounded-xl px-4 py-3"
                   style={{ color: 'var(--red-soft)', background: '#FEF2F0' }}>
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
                Update password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
