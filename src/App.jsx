import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AuthPage from './components/auth/AuthPage'
import ResetPasswordPage from './components/auth/ResetPasswordPage'
import Navbar from './components/layout/Navbar'
import FridgePage from './components/fridge/FridgePage'
import RecipesPage from './components/fridge/RecipesPage'
import SavedPage from './components/saved/SavedPage'
import HistoryPage from './components/history/HistoryPage'
import SchedulePage from './components/schedule/SchedulePage'

function ProtectedLayout({ user }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      <Navbar user={user} />
      <main>
        <Routes>
          <Route path="/fridge"   element={<FridgePage  user={user} />} />
          <Route path="/recipes"  element={<RecipesPage user={user} />} />
          <Route path="/saved"    element={<SavedPage   user={user} />} />
          <Route path="/history"  element={<HistoryPage  user={user} />} />
          <Route path="/schedule" element={<SchedulePage user={user} />} />
          <Route path="*"         element={<Navigate to="/fridge" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const { user, loading, passwordRecovery, clearPasswordRecovery } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cream)' }}>
        <span className="spinner" style={{ color: 'var(--green)', width: 28, height: 28 }} />
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
            {/* Forgot-password flow only ever needs the request form here;
                the actual reset UI is the passwordRecovery branch above. */}
            <Route path="*" element={<AuthPage />} />
          </Routes>
        )
      }
    </BrowserRouter>
  )
}
