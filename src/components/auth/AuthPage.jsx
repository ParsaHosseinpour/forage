import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { signIn, signUp, requestPasswordReset, resendConfirmationEmail } from '../../lib/supabase'
import Button from '../ui/Button'
import { Input, Label } from '../ui/Input'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import Produce from '../ui/Produce'

// mode: 'signin' | 'signup' | 'forgot'
export default function AuthPage() {
  const [params]                  = useSearchParams()
  const [mode, setMode]         = useState(params.get('mode') === 'signup' ? 'signup' : 'signin')
  useEffect(() => { document.title = 'Sign in · Forage' }, [])
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
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

  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1fr]" style={{ background: 'var(--bg)' }}>

      {/* Left: a little of the product's world */}
      <section
        className="hidden lg:flex flex-col justify-between p-14"
        style={{ background: 'var(--butter)', borderRight: '2.5px solid var(--ink)' }}
        aria-hidden="true"
      >
        <div className="flex items-center gap-2">
          <Produce name="Tomatoes" size={34} />
          <span className="text-[32px] leading-none" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>forage</span>
        </div>

        <div>
          <div className="flex flex-wrap gap-4 mb-10 max-w-md">
            {['Eggs', 'Tomatoes', 'Lemon', 'Garlic', 'Spinach', 'Feta'].map((n, i) => (
              <span key={n} className="grid place-items-center w-[84px] h-[84px] rounded-full"
                    style={{ background: '#fff', border: '2.5px solid var(--ink)', boxShadow: '0 3px 0 var(--ink)', transform: `rotate(${[-5, 4, -3, 5, -4, 3][i]}deg)` }}>
                <Produce name={n} size={56} />
              </span>
            ))}
          </div>
          <p className="text-[56px] max-w-md" style={{ fontFamily: 'var(--font-display)', lineHeight: 1, letterSpacing: '-0.02em' }}>
            Cook what is already in your fridge.
          </p>
        </div>

        <p className="text-[17px] max-w-sm">Log your ingredients, see what you can make, plan the week.</p>
      </section>

      {/* Right: the form */}
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          <Link to="/" className="lg:hidden flex items-center gap-2 mb-10" aria-label="Back to Forage home">
            <Produce name="Tomatoes" size={32} />
            <span className="text-[30px] leading-none" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>forage</span>
          </Link>

          <Link to="/" className="hidden lg:inline-flex items-center gap-1.5 text-sm font-medium mb-8 hover:underline"
                style={{ color: 'var(--ink-muted)' }}>
            <ArrowLeft size={15} strokeWidth={2} /> Back to home
          </Link>

          <h1 className="text-5xl mb-8">{titles[mode]}</h1>

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
                <div className="relative">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pr-12"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    aria-pressed={showPw}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-[8px]"
                    style={{ color: 'var(--ink-muted)' }}
                  >
                    {showPw ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
                  </button>
                </div>
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
