import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import PetConnect   from './App.jsx'
import LoginScreen  from './LoginScreen.jsx'
import Onboarding   from './components/Onboarding.jsx'

const LS_KEY = 'petconnect_onboarding_done'

/* ── Splash screen ── */
function SplashScreen({ onDone }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setVisible(false), 1500)
    const doneTimer = setTimeout(onDone, 2100)
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer) }
  }, [onDone])

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      background:'#EEF2F7',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      transition:'opacity 0.6s ease',
      opacity: visible ? 1 : 0,
      pointerEvents:'none',
    }}>
      <img
        src="/logo.jpeg"
        alt="PetConnect"
        style={{ maxWidth:260, width:'75%', borderRadius:16 }}
      />
    </div>
  )
}

/* ── Root ── */
function Root() {
  const [splashDone,    setSplashDone]    = useState(false)
  const [onboardingDone, setOnboardingDone] = useState(
    () => !!localStorage.getItem(LS_KEY)   // ya vio el onboarding → saltar
  )
  const [authenticated, setAuthenticated] = useState(false)
  const [isDark, setIsDark]               = useState(false)
  const toggleTheme = () => setIsDark(v => !v)

  const completeOnboarding = () => {
    localStorage.setItem(LS_KEY, '1')
    setOnboardingDone(true)
  }

  /* Splash siempre */
  if (!splashDone) {
    return <SplashScreen onDone={() => setSplashDone(true)} />
  }

  /* Onboarding solo la primera vez */
  if (!onboardingDone) {
    return <Onboarding onComplete={completeOnboarding} />
  }

  /* App normal */
  return authenticated
    ? <PetConnect isDark={isDark} toggleTheme={toggleTheme} />
    : <LoginScreen
        onGuestAccess={() => setAuthenticated(true)}
        isDark={isDark}
        toggleTheme={toggleTheme}
      />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
