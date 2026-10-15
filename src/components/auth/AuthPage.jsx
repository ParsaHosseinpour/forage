import { useState } from 'react'
import { signIn, signUp, requestPasswordReset, resendConfirmationEmail } from '../../lib/supabase'
import Button from '../ui/Button'
import { Input, Label } from '../ui/Input'
import { Sprout } from 'lucide-react'

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
    signin: 'Sign in',
    signup: 'Create your account',
    forgot: 'Reset your password',
  }

  const SAMPLE = [
    { name: 'Shakshuka',          have: 5, total: 6 },
    { name: 'Lentil soup',        have: 6, total: 6 },
    { name: 'Chicken & rice bowl', have: 3, total: 7 },
  ]

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]" style={{ background: 'var(--bg)' }}>

      {/* Left: what the app does, shown with its own meter */}
      <section
        className="hidden lg:flex flex-col justify-between p-14"
        style={{ background: 'var(--brand)', color: 'white' }}
        aria-hidden="true"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: 'var(--saffron)' }}>
            <Sprout size={19} strokeWidth={2.25} style={{ color: 'var(--ink)' }} />
          </span>
          <span className="text-2xl font-extrabold" style={{ letterSpacing: '-0.03em', fontVariationSettings: "'wdth' 85" }}>
            forage
          </span>
        </div>

        <div>
          <h2 className="text-5xl mb-10 max-w-md" style={{ lineHeight: 1.04 }}>
            Cook what is already in your fridge.
          </h2>
          <ul className="space-y-6 max-w-sm">
            {SAMPLE.map(({ name, have, total }) => (
              <li key={name}>
                <p className="text-lg font-semibold mb-2" style={{ fontVariationSettings: "'wdth' 96" }}>{name}</p>
                <div className="flex gap-[3px]">
                  {Array.from({ length: total }, (_, i) => (
                    <span
                      key={i}
                      className="meter-seg h-2.5 flex-1 rounded-[2px]"
                      style={{
                        '--i': i,
                        background: i < have ? 'var(--saffron)' : 'transparent',
                        boxShadow:  i < have ? 'none' : 'inset 0 0 0 1.5px rgba(255,255,255,0.4)',
                      }}
                    />
                  ))}
                </div>
                <p className="text-sm mt-1.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {have === total ? 'Everything is in your fridge' : `${have} of ${total} in your fridge`}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
          Log your ingredients, see what you can make, plan the week.
        </p>
      </section>

      {/* Right: the form */}
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <span className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: 'var(--brand)' }}>
              <Sprout size={19} strokeWidth={2.25} style={{ color: 'var(--saffron)' }} />
            </span>
            <span className="text-2xl font-extrabold" style={{ letterSpacing: '-0.03em', fontVariationSettings: "'wdth' 85" }}>
              forage
            </span>
          </div>

          <h1 className="text-4xl mb-8">{titles[mode]}</h1>

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
                      className="text-sm mb-1.5 font-medium"
                      style={{ color: 'var(--brand)' }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm rounded-[10px] px-4 py-3"
                 style={{ color: 'var(--danger)', background: 'var(--danger-tint)' }}>
                {error}
              </p>
            )}

            {showResend && (
              <button
                type="button"
                onClick={handleResend}
                className="w-full text-sm font-semibold rounded-[10px] px-4 py-2.5 text-center"
                style={{ color: 'var(--brand)', background: 'var(--brand-tint)' }}
              >
                Resend confirmation email
              </button>
            )}

            {success && (
              <p role="status" className="text-sm rounded-[10px] px-4 py-3"
                 style={{ color: 'var(--fresh)', background: 'var(--fresh-tint)' }}>
                {success}
              </p>
            )}

            <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
              {mode === 'signin' && 'Sign in'}
              {mode === 'signup' && 'Create account'}
              {mode === 'forgot' && 'Send reset link'}
            </Button>
          </form>

          <div className="mt-6">
            {mode === 'forgot' ? (
              <button onClick={() => switchMode('signin')} className="text-sm font-semibold" style={{ color: 'var(--brand)' }}>
                Back to sign in
              </button>
            ) : (
              <button
                onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                className="text-sm"
                style={{ color: 'var(--ink-muted)' }}
              >
                {mode === 'signin'
                  ? <>New to Forage? <span style={{ color: 'var(--brand)', fontWeight: 600 }}>Create an account</span></>
                  : <>Already have an account? <span style={{ color: 'var(--brand)', fontWeight: 600 }}>Sign in</span></>}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
