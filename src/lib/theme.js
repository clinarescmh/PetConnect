import { createContext, useContext } from 'react'

export const F = {
  display: "'Syne', sans-serif",
  body:    "'DM Sans', sans-serif",
}

export const ThemeContext = createContext({
  C: {}, isDark: true, toggleTheme: () => {}, openModal: () => {}, openPetProfile: () => {},
})

export const useTheme = () => useContext(ThemeContext)

/* ── Sistema de diseño compartido ─────────────────────────────────────────────
   Radio uniforme (16px) y estilo de card premium con sombra en capas.
   Usar `makeCard(C)` en cualquier componente para cards consistentes en toda
   la app. C.cardShadow / C.cardBorder vienen del tema (claro/oscuro).
─────────────────────────────────────────────────────────────────────────── */
export const RADIUS = 16

export const makeCard = (C, extra = {}) => ({
  background: C.bgCard,
  borderRadius: RADIUS,
  border:     C.cardBorder !== undefined ? C.cardBorder : `1px solid ${C.border}`,
  boxShadow:  C.cardShadow,
  overflow: 'hidden',
  ...extra,
})
