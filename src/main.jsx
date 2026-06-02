import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import PetConnect    from './App.jsx'
import LoginScreen   from './LoginScreen.jsx'
import Onboarding    from './components/Onboarding.jsx'
import MyPetForm from './components/MyPetForm.jsx'
import { loadPets } from './lib/pets.js'
import SetupScreen   from './components/SetupScreen.jsx'

const OB_KEY = 'petconnect_onboarding_done'

/* ── Splash screen ── */
function SplashScreen({ onDone }) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const f = setTimeout(() => setVisible(false), 1500)
    const d = setTimeout(onDone, 2100)
    return () => { clearTimeout(f); clearTimeout(d) }
  }, [onDone])
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999, background:'#EEF2F7',
      display:'flex', alignItems:'center', justifyContent:'center',
      transition:'opacity 0.6s ease', opacity: visible ? 1 : 0, pointerEvents:'none',
    }}>
      <img src="/logo.jpeg" alt="PetConnect" style={{ maxWidth:260, width:'75%', borderRadius:16 }} />
    </div>
  )
}

/* ── Root ── */
function Root() {
  const [splashDone,    setSplashDone]    = useState(false)
  const [onboardingDone, setOnboardingDone] = useState(() => !!localStorage.getItem(OB_KEY))
  const [authenticated,  setAuthenticated]  = useState(false)

  // Primera vez sin mascota configurada
  const [showPetSetup,   setShowPetSetup]   = useState(false)
  // Setup completo para usuario nuevo registrado por email
  const [showOwnerSetup, setShowOwnerSetup] = useState(false)

  const [isDark,     setIsDark]     = useState(false)
  const toggleTheme = () => setIsDark(v => !v)

  const hasPet = () => loadPets().length > 0

  /* Cuando el invitado accede: si es la primera vez, mostrar form de mascota */
  const handleGuestAccess = () => {
    setAuthenticated(true)
    if (!hasPet()) setShowPetSetup(true)
  }

  /* Cuando el usuario completa el registro con email: mostrar setup completo */
  const handleNewUserRegistered = () => {
    setShowOwnerSetup(true)
  }

  /* ── Render logic ── */
  if (!splashDone) return <SplashScreen onDone={() => setSplashDone(true)} />
  if (!onboardingDone) return (
    <Onboarding onComplete={() => {
      localStorage.setItem(OB_KEY, '1')
      setOnboardingDone(true)
    }} />
  )

  /* Setup completo para nuevo usuario email */
  if (showOwnerSetup) return (
    <SetupScreen
      onComplete={() => {
        setShowOwnerSetup(false)
        setAuthenticated(true)
        setShowPetSetup(false)  // ya configuró la mascota en SetupScreen
      }}
    />
  )

  /* Formulario de bienvenida de mascota para invitados (primera vez) */
  if (authenticated && showPetSetup) return (
    <MyPetForm
      mode="welcome"
      onSave={() => setShowPetSetup(false)}
      onSkip={() => setShowPetSetup(false)}
    />
  )

  /* Pantalla de login/guest */
  if (!authenticated) return (
    <LoginScreen
      onGuestAccess={handleGuestAccess}
      onNewUserRegistered={handleNewUserRegistered}
      isDark={isDark}
      toggleTheme={toggleTheme}
    />
  )

  return <PetConnect isDark={isDark} toggleTheme={toggleTheme} />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
