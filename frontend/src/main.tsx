import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { installGlobalTraceHandlers } from './services/trace'
import { initializeRuntime } from './services/runtime'

const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter
installGlobalTraceHandlers()

async function mountApp() {
  await initializeRuntime()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Router>
        <App />
      </Router>
    </StrictMode>,
  )
}

void mountApp()
