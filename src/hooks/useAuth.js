import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser]               = useState(null)
  const [loading, setLoading]         = useState(true)
  // True for the brief window between clicking a password-reset email link
  // and the user successfully setting a new password. While true, the app
  // shows the "set new password" screen instead of the normal logged-in view,
  // even though Supabase has technically created a session for them.
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    // Resolve initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Keep in sync with auth state changes (login / logout / token refresh /
    // password recovery link clicked)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  /** Call once the user has successfully set a new password */
  const clearPasswordRecovery = () => setPasswordRecovery(false)

  return { user, loading, passwordRecovery, clearPasswordRecovery }
}
