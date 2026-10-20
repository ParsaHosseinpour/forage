import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ConfigMissing from './components/ui/ConfigMissing.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import { isSupabaseConfigured } from './lib/supabaseConfig'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isSupabaseConfigured ? (
      <ToastProvider>
        <App />
      </ToastProvider>
    ) : (
      <ConfigMissing />
    )}
  </StrictMode>,
)
