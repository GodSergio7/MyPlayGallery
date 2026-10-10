// Poppins servida desde la propia web (T-36): sin Google Fonts, que bloqueaba el primer
// pintado y enviaba la IP de cada visitante a Google. Solo los grosores que se usan.
import '@fontsource/poppins/latin-400.css'
import '@fontsource/poppins/latin-500.css'
import '@fontsource/poppins/latin-600.css'
import '@fontsource/poppins/latin-700.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './shared/styles/global.css'
import { App } from './app/App'
import { QueryProvider } from './app/providers/QueryProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </StrictMode>,
)
