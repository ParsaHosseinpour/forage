import { useState } from 'react'
import { signIn, signUp, requestPasswordReset, resendConfirmationEmail } from '../../lib/supabase'
import Button from '../ui/Button'
import { Input, Label } from '../ui/Input'

// mode: 'signin' | 'signup' | 'forgot'
export default function AuthPage() {
  const [mode, setMode]         = useState('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  // When sign-in fails because the email isn't confirmed yet, offer a resend button
  const [showResend, setShowResend] = useState(false)

  const resetMessages = () => { setError(''); setSuccess(''); setShowResend(false) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    resetMessages()
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password)
        if (error) throw error
        setSuccess('Check your email to confirm your account, then sign in.')

      } else if (mode === 'forgot') {
        const { error } = await requestPasswordReset(email)
        if (error) throw error
        setSuccess("Check your email for a password reset link.")

      } else {
        const { error } = await signIn(email, password)
        if (error) throw error
        // useAuth in App.jsx will detect the new session automatically
      }
    } catch (err) {
      setError(err.message)
      // Supabase returns this exact message when the account exists but
      // the confirmation email was never clicked
      if (mode === 'signin' && /email not confirmed/i.test(err.message)) {
        setShowResend(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setLoading(true)
    setError('')
    try {
      const { error } = await resendConfirmationEmail(email)
      if (error) throw error
      setSuccess('Confirmation email resent — check your inbox.')
      setShowResend(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (next) => { setMode(next); resetMessages() }

  const titles = {
    signin: "Welcome back. What's in your fridge?",
    signup: 'Start turning your fridge into dinner.',
    forgot: "We'll email you a reset link.",
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
            {titles[mode]}
          </p>
        </div>

        <div className="rounded-2xl border p-8"
             style={{ background: 'white', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}>

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
                autoFocus
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs mb-1.5"
                      style={{ color: 'var(--ink-muted)' }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
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
            )}

            {error && (
              <p className="text-sm rounded-xl px-4 py-3"
                 style={{ color: 'var(--red-soft)', background: '#FEF2F0' }}>
                {error}
              </p>
            )}

            {showResend && (
              <button
                type="button"
                onClick={handleResend}
                className="w-full text-sm rounded-xl px-4 py-2.5 text-center"
                style={{ color: 'var(--green)', background: 'var(--green-light)' }}
              >
                Resend confirmation email
              </button>
            )}

            {success && (
              <p className="text-sm rounded-xl px-4 py-3"
                 style={{ color: 'var(--green)', background: 'var(--green-light)' }}>
                {success}
              </p>
            )}

            <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
              {mode === 'signin' && 'Sign in'}
              {mode === 'signup' && 'Create account'}
              {mode === 'forgot' && 'Send reset link'}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {mode === 'forgot' ? (
              <button onClick={() => switchMode('signin')} className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                <span style={{ color: 'var(--green)', fontWeight: 500 }}>← Back to sign in</span>
              </button>
            ) : (
              <button
                onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                className="text-sm transition-colors"
                style={{ color: 'var(--ink-muted)' }}
              >
                {mode === 'signin'
                  ? <>No account? <span style={{ color: 'var(--green)', fontWeight: 500 }}>Sign up free</span></>
                  : <>Already have one? <span style={{ color: 'var(--green)', fontWeight: 500 }}>Sign in</span></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
