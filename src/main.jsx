import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import PetConnect from './App.jsx'
import LoginScreen from './LoginScreen.jsx'

function Root() {
  const [authenticated, setAuthenticated] = useState(false)
  const [isDark, setIsDark] = useState(true)
  const toggleTheme = () => setIsDark(v => !v)

  if (!authenticated) {
    return <LoginScreen onGuestAccess={() => setAuthenticated(true)} isDark={isDark} toggleTheme={toggleTheme} />
  }

  return <PetConnect isDark={isDark} toggleTheme={toggleTheme} />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
