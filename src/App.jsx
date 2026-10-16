import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LandingPage from './components/landing/LandingPage'
import AuthPage from './components/auth/AuthPage'
import ResetPasswordPage from './components/auth/ResetPasswordPage'
import Navbar from './components/layout/Navbar'
import { HeaderSlotContext } from './components/layout/PageHeader'
import { hueFor } from './lib/hues'
import FridgePage from './components/fridge/FridgePage'
import RecipesPage from './components/fridge/RecipesPage'
import SavedPage from './components/saved/SavedPage'
import HistoryPage from './components/history/HistoryPage'
import SchedulePage from './components/schedule/SchedulePage'
import ProfilePage from './components/profile/ProfilePage'
import { usePageTitle } from './hooks/usePageTitle'

function ProtectedLayout({ user }) {
  usePageTitle()
  const { pathname } = useLocation()
  const { hue, ink } = hueFor(pathname)
  const [slot, setSlot] = useState(null)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', '--hue': hue, '--hue-ink': ink }}>
      <HeaderSlotContext.Provider value={slot}>
        <Navbar user={user} />
        <div ref={setSlot} />
        <main className="pb-24 md:pb-0">
          <Routes>
            <Route path="/fridge"   element={<FridgePage  user={user} />} />
            <Route path="/recipes"  element={<RecipesPage user={user} />} />
            <Route path="/saved"    element={<SavedPage   user={user} />} />
            <Route path="/history"  element={<HistoryPage  user={user} />} />
            <Route path="/schedule" element={<SchedulePage user={user} />} />
            <Route path="/profile"  element={<ProfilePage  user={user} />} />
            <Route path="*"         element={<Navigate to="/fridge" replace />} />
          </Routes>
        </main>
      </HeaderSlotContext.Provider>
    </div>
  )
}

export default function App() {
  const { user, loading, passwordRecovery, clearPasswordRecovery } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <span className="spinner" style={{ color: 'var(--brand)', width: 28, height: 28 }} />
      </div>
    )
  }

  // Supabase establishes a temporary session the moment the user clicks the
  // password-reset email link (event: PASSWORD_RECOVERY). We intercept that
  // here — regardless of which route they land on — and force the
  // "set a new password" screen before letting them into the app normally.
  if (passwordRecovery) {
    return (
      <BrowserRouter>
        <ResetPasswordPage onComplete={clearPasswordRecovery} />
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      {user
        ? <ProtectedLayout user={user} />
        : (
          <Routes>
            <Route path="/"      element={<LandingPage />} />
            {/* Forgot-password flow only ever needs the request form here;
                the actual reset UI is the passwordRecovery branch above. */}
            <Route path="/login" element={<AuthPage />} />
            <Route path="*"      element={<Navigate to="/login" replace />} />
          </Routes>
        )
      }
    </BrowserRouter>
  )
}
