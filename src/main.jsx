import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import PetConnect from './App.jsx'
import LoginScreen from './LoginScreen.jsx'

function SplashScreen({ onDone }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setVisible(false), 1500) // empieza fade-out
    const doneTimer = setTimeout(onDone, 2100)                  // desmonta
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer) }
  }, [onDone])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#EEF2F7',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 24,
      transition: 'opacity 0.6s ease',
      opacity: visible ? 1 : 0,
      pointerEvents: 'none',
    }}>
      <img
        src="/logo.jpeg"
        alt="PetConnect"
        style={{ maxWidth: 260, width: '75%', borderRadius: 16 }}
      />
    </div>
  )
}

function Root() {
  const [splashDone, setSplashDone]     = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [isDark, setIsDark]             = useState(false)
  const toggleTheme = () => setIsDark(v => !v)

  return (
    <>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
      {splashDone && (
        authenticated
          ? <PetConnect isDark={isDark} toggleTheme={toggleTheme} />
          : <LoginScreen onGuestAccess={() => setAuthenticated(true)} isDark={isDark} toggleTheme={toggleTheme} />
      )}
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
