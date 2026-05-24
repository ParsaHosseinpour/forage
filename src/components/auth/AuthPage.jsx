import { useState } from 'react'
import { signIn, signUp } from '../../lib/supabase'
import Button from '../ui/Button'
import { Input, Label } from '../ui/Input'

export default function AuthPage() {
  const [mode, setMode]       = useState('signin') // 'signin' | 'signup'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password)
        if (error) throw error
        setSuccess('Check your email to confirm your account.')
      } else {
        const { error } = await signIn(email, password)
        if (error) throw error
        // useAuth in App.jsx will detect the new session automatically
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'var(--cream)' }}>

      {/* Decorative background shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20"
             style={{ background: 'var(--green-mid)' }} />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full opacity-15"
             style={{ background: 'var(--amber-light)' }} />
      </div>

      <div className="relative w-full max-w-sm slide-up">

        {/* Logo / wordmark */}
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
            {mode === 'signin'
              ? "Welcome back. What's in your fridge?"
              : 'Start turning your fridge into dinner.'}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border p-8"
             style={{
               background: 'white',
               borderColor: 'var(--border)',
               boxShadow: 'var(--shadow-md)',
             }}>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </div>

            {error && (
              <p className="text-sm rounded-xl px-4 py-3"
                 style={{ color: 'var(--red-soft)', background: '#FEF2F0' }}>
                {error}
              </p>
            )}

            {success && (
              <p className="text-sm rounded-xl px-4 py-3"
                 style={{ color: 'var(--green)', background: 'var(--green-light)' }}>
                {success}
              </p>
            )}

            <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(''); setSuccess('') }}
              className="text-sm transition-colors"
              style={{ color: 'var(--ink-muted)' }}
            >
              {mode === 'signin'
                ? <>No account? <span style={{ color: 'var(--green)', fontWeight: 500 }}>Sign up free</span></>
                : <>Already have one? <span style={{ color: 'var(--green)', fontWeight: 500 }}>Sign in</span></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
