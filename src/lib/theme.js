import { createContext, useContext } from 'react'

export const F = {
  display: "'Syne', sans-serif",
  body:    "'DM Sans', sans-serif",
}

export const ThemeContext = createContext({
  C: {}, isDark: true, toggleTheme: () => {}, openModal: () => {},
})

export const useTheme = () => useContext(ThemeContext)
