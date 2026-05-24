import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AuthPage from './components/auth/AuthPage'
import Navbar from './components/layout/Navbar'
import FridgePage from './components/fridge/FridgePage'
import RecipesPage from './components/fridge/RecipesPage'
import SavedPage from './components/saved/SavedPage'

function ProtectedLayout({ user }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      <Navbar user={user} />
      <main>
        <Routes>
          <Route path="/fridge"  element={<FridgePage  user={user} />} />
          <Route path="/recipes" element={<RecipesPage user={user} />} />
          <Route path="/saved"   element={<SavedPage   user={user} />} />
          <Route path="*"        element={<Navigate to="/fridge" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cream)' }}>
        <span className="spinner" style={{ color: 'var(--green)', width: 28, height: 28 }} />
      </div>
    )
  }

  return (
    <BrowserRouter>
      {user
        ? <ProtectedLayout user={user} />
        : <Routes><Route path="*" element={<AuthPage />} /></Routes>
      }
    </BrowserRouter>
  )
}
