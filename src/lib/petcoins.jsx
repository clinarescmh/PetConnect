/**
 * PetCoins — sistema de gamificación de PetConnect.
 * Estado persistido en localStorage + sincroniza con Supabase.
 */
import { createContext, useContext, useState, useCallback } from 'react'
import { supabase } from './supabase'

const LS_KEY = 'petconnect_petcoins'

/* ── Acciones y sus recompensas ── */
export const COINS_ACTIONS = {
  POST_PHOTO:        { key:'post_photo',        amount:100, label:'Postear foto'                },
  GIVE_LIKE:         { key:'give_like',          amount:10,  label:'Dar like'                    },
  HEALTH_RECORD:     { key:'health_record',      amount:100, label:'Completar historial médico'  },
  BOOK_WALK:         { key:'book_walk',           amount:100, label:'Reservar paseo'              },
  DAILY_CHECKIN:     { key:'daily_checkin',       amount:50,  label:'Check-in diario'             },
  WEEKLY_CHALLENGE:  { key:'weekly_challenge',    amount:200, label:'Participar en reto semanal'  },
}

/* ── Niveles y recompensas ── */
export const LEVELS = [
  { coins: 500,  icon:'📸', name:'Filtros de fotos',            desc:'Desbloquea filtros especiales en stories'         },
  { coins: 1000, icon:'✅', name:'Perfil verificado',           desc:'Badge de verificación en tu perfil público'       },
  { coins: 2000, icon:'⭐', name:'Badge especial en posts',     desc:'Distinción dorada en todas tus publicaciones'     },
  { coins: 5000, icon:'🎁', name:'Descuentos con patrocinantes', desc:'Próximamente: descuentos exclusivos con partners' },
]

/* ── Context ── */
const PetCoinsCtx = createContext({ coins: 0, addCoins: () => {} })
export const usePetCoins = () => useContext(PetCoinsCtx)

/* ── Toast UI (sin dependencia de ThemeContext) ── */
function CoinToastUI({ amount }) {
  return (
    <div style={{
      position:'fixed', top:92, left:'50%', pointerEvents:'none',
      animation:'petcoin-toast 2.4s ease forwards',
      zIndex:9500, whiteSpace:'nowrap',
    }}>
      <div style={{
        transform:'translateX(-50%)',
        background:'linear-gradient(135deg, #FF8C00, #FFB547)',
        color:'#fff', borderRadius:26, padding:'10px 22px',
        fontFamily:"'Syne', sans-serif", fontSize:18, fontWeight:800,
        boxShadow:'0 6px 24px rgba(255,140,0,0.45)',
        display:'flex', alignItems:'center', gap:8,
      }}>
        <span>+{amount}</span>
        <span style={{ fontSize:20 }}>🪙</span>
      </div>
    </div>
  )
}

/* ── Provider ── */
export function PetCoinsProvider({ children }) {
  const [coins, setCoins] = useState(() => {
    try { return Math.max(0, parseInt(localStorage.getItem(LS_KEY) || '0', 10)) || 0 }
    catch { return 0 }
  })
  const [toasts, setToasts] = useState([])

  const addCoins = useCallback((actionKeyOrAmount) => {
    const amount = typeof actionKeyOrAmount === 'number'
      ? actionKeyOrAmount
      : (COINS_ACTIONS[actionKeyOrAmount]?.amount ?? 0)
    if (amount <= 0) return

    setCoins(prev => {
      const next = prev + amount
      try { localStorage.setItem(LS_KEY, String(next)) } catch {}
      return next
    })

    // Toast animado
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, amount }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2500)

    // Supabase — fire-and-forget
    const key = typeof actionKeyOrAmount === 'string' ? actionKeyOrAmount : 'custom'
    supabase.from('petcoins').insert({ action: key, amount }).catch(() => {})
  }, [])

  return (
    <PetCoinsCtx.Provider value={{ coins, addCoins }}>
      <style>{`
        @keyframes petcoin-toast {
          0%   { opacity:0; transform:translateX(-50%) translateY(14px) scale(0.72); }
          12%  { opacity:1; transform:translateX(-50%) translateY(0)     scale(1.07); }
          20%  { opacity:1; transform:translateX(-50%) translateY(0)     scale(1);    }
          75%  { opacity:1; transform:translateX(-50%) translateY(0)     scale(1);    }
          100% { opacity:0; transform:translateX(-50%) translateY(-18px) scale(0.88); }
        }
      `}</style>
      {children}
      {toasts.map(t => <CoinToastUI key={t.id} amount={t.amount} />)}
    </PetCoinsCtx.Provider>
  )
}
