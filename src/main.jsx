import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ConfigMissing from './components/ui/ConfigMissing.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import PwaUpdater from './components/ui/PwaUpdater.jsx'
import { isSupabaseConfigured } from './lib/supabaseConfig'
import './lib/installPrompt'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isSupabaseConfigured ? (
      <ToastProvider>
        <App />
        <PwaUpdater />
      </ToastProvider>
    ) : (
      <ConfigMissing />
    )}
  </StrictMode>,
)
