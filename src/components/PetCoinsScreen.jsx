import { useState } from 'react'
import { useTheme, F, makeCard } from '../lib/theme'
import { usePetCoins, LEVELS, COINS_ACTIONS } from '../lib/petcoins.jsx'

const MOCK_RANKING = [
  { name:'PetMom_CL',      avatar:'👩',    coins:12450 },
  { name:'ChihuahuaPapa',  avatar:'👨',    coins:9830  },
  { name:'GatoFeliz99',    avatar:'👩‍🦱',  coins:7660  },
  { name:'LabradorsLove',  avatar:'👦',    coins:5920  },
  { name:'MichiLover',     avatar:'👩‍🦰',  coins:4310  },
  { name:'BeagleDad',      avatar:'🧔',    coins:3850  },
  { name:'TobíasMom',      avatar:'👩',    coins:3200  },
  { name:'PulgaMaster',    avatar:'👦',    coins:2780  },
  { name:'CaneloFanatic',  avatar:'👩‍🦲',  coins:2100  },
]

const MEDALS = ['🥇','🥈','🥉']
const ACTIONS = Object.values(COINS_ACTIONS)
const MAX_COINS = LEVELS[LEVELS.length - 1].coins

export default function PetCoinsScreen({ onClose }) {
  const { C } = useTheme()
  const { coins } = usePetCoins()
  const [tab, setTab] = useState('rewards')

  /* Ranking dinámico — inserta al usuario en su posición real */
  const ranking = [...MOCK_RANKING, { name:'Tú', avatar:'🐾', coins, isUser:true }]
    .sort((a, b) => b.coins - a.coins)
    .slice(0, 10)
    .map((u, i) => ({ ...u, rank: i + 1 }))

  return (
    <div style={{ position:'fixed', inset:0, zIndex:260,
      background:C.bg, overflowY:'auto', maxWidth:420, margin:'0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'18px 18px 14px',
        background:C.bg, borderBottom:`1px solid ${C.border}`,
        position:'sticky', top:0, zIndex:10 }}>
        <button onClick={onClose} style={{ background:C.bgElevated, border:`1px solid ${C.border}`,
          borderRadius:10, width:34, height:34, display:'flex', alignItems:'center',
          justifyContent:'center', cursor:'pointer', fontSize:16, color:C.text }}>←</button>
        <span style={{ fontFamily:F.display, fontWeight:800, fontSize:18, color:C.text }}>
          PetCoins
        </span>
        {/* Saldo actual */}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6,
          background:C.amber + '22', borderRadius:12, padding:'6px 14px' }}>
          <span style={{ fontSize:20 }}>🪙</span>
          <span style={{ fontFamily:F.display, fontWeight:800, fontSize:18, color:C.amber }}>
            {coins.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:'flex', background:C.bgElevated, margin:'16px 18px 0',
        borderRadius:14, padding:4 }}>
        {[['rewards','🎁 Mis Recompensas'],['ranking','🏆 Ranking']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex:1, border:'none', borderRadius:10, padding:'10px 4px',
            fontFamily:F.body, fontSize:12, fontWeight:600, cursor:'pointer',
            background: tab===id ? C.bgCard : 'transparent',
            color: tab===id ? C.text : C.textSub,
            boxShadow: tab===id ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
            transition:'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding:'18px 18px 48px' }}>

        {/* ══════════════════════════════════ RECOMPENSAS ══ */}
        {tab === 'rewards' && (
          <>
            {/* Barra general */}
            <div style={{ ...makeCard(C), padding:'18px', marginBottom:18 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontFamily:F.body, fontSize:12, fontWeight:600, color:C.textSub }}>
                  Progreso total
                </span>
                <span style={{ fontFamily:F.display, fontSize:12, fontWeight:700, color:C.amber }}>
                  {coins.toLocaleString()} / {MAX_COINS.toLocaleString()} 🪙
                </span>
              </div>
              <div style={{ height:10, background:C.bgElevated, borderRadius:5, overflow:'hidden' }}>
                <div style={{
                  height:'100%',
                  width:`${Math.min(100, (coins / MAX_COINS) * 100)}%`,
                  background:'linear-gradient(to right, #FF8C00, #FFB547)',
                  borderRadius:5, transition:'width 0.7s ease',
                }} />
              </div>
            </div>

            {/* Niveles */}
            {LEVELS.map((level, i) => {
              const unlocked = coins >= level.coins
              const prevCoins = i > 0 ? LEVELS[i - 1].coins : 0
              const segPct = unlocked ? 100
                : Math.min(100, Math.max(0,
                    ((coins - prevCoins) / (level.coins - prevCoins)) * 100
                  ))
              return (
                <div key={i} style={{
                  ...makeCard(C, { border:`1.5px solid ${unlocked ? C.amber + '55' : C.border}` }),
                  padding:'16px', marginBottom:12, position:'relative',
                }}>
                  {/* Barra superior si desbloqueado */}
                  {unlocked && (
                    <div style={{ position:'absolute', top:0, left:0, right:0, height:3,
                      background:'linear-gradient(to right, #FF8C00, #FFB547)' }} />
                  )}
                  <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                    {/* Ícono */}
                    <div style={{
                      width:52, height:52, borderRadius:15, flexShrink:0,
                      background: unlocked ? C.amber + '22' : C.bgElevated,
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:26,
                      filter: unlocked ? 'none' : 'grayscale(0.6) opacity(0.5)',
                    }}>{level.icon}</div>

                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center',
                        justifyContent:'space-between', marginBottom:3 }}>
                        <div style={{ fontFamily:F.body, fontWeight:700, fontSize:14,
                          color: unlocked ? C.text : C.textSub }}>
                          {level.name}
                        </div>
                        {unlocked ? (
                          <span style={{ background:C.amber + '22', color:C.amber,
                            borderRadius:8, padding:'2px 8px',
                            fontFamily:F.body, fontSize:10, fontWeight:700 }}>
                            ✓ DESBLOQUEADO
                          </span>
                        ) : (
                          <span style={{ fontFamily:F.display, fontSize:11,
                            fontWeight:700, color:C.textMuted }}>
                            {level.coins.toLocaleString()} 🪙
                          </span>
                        )}
                      </div>
                      <div style={{ fontFamily:F.body, fontSize:11, color:C.textMuted,
                        marginBottom:10 }}>
                        {level.desc}
                      </div>
                      {/* Barra de progreso del nivel */}
                      <div style={{ height:6, background:C.bgElevated,
                        borderRadius:3, overflow:'hidden' }}>
                        <div style={{
                          height:'100%', width:`${segPct}%`,
                          background: unlocked
                            ? 'linear-gradient(to right, #FF8C00, #FFB547)'
                            : `linear-gradient(to right, ${C.teal}, ${C.blue})`,
                          borderRadius:3, transition:'width 0.7s ease',
                        }} />
                      </div>
                      {!unlocked && (
                        <div style={{ fontFamily:F.body, fontSize:10,
                          color:C.textMuted, marginTop:4 }}>
                          Faltan {(level.coins - coins).toLocaleString()} 🪙
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Cómo ganar */}
            <div style={{ ...makeCard(C), padding:'16px', marginTop:8 }}>
              <div style={{ fontFamily:F.display, fontWeight:700, fontSize:14,
                color:C.text, marginBottom:14 }}>Cómo ganar 🪙</div>
              {ACTIONS.map((a, i) => (
                <div key={i} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  paddingBottom:10, marginBottom: i < ACTIONS.length - 1 ? 10 : 0,
                  borderBottom: i < ACTIONS.length - 1 ? `1px solid ${C.border}` : 'none',
                }}>
                  <span style={{ fontFamily:F.body, fontSize:13, color:C.text }}>
                    {a.label}
                  </span>
                  <span style={{ fontFamily:F.display, fontWeight:700,
                    fontSize:13, color:C.amber }}>
                    +{a.amount} 🪙
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══════════════════════════════════════ RANKING ══ */}
        {tab === 'ranking' && (
          <>
            <div style={{ fontFamily:F.body, fontSize:12, color:C.textMuted,
              marginBottom:16, textAlign:'center' }}>
              Top 10 · PetCoins acumulados esta semana
            </div>

            {ranking.map((u, i) => {
              const medal = MEDALS[i]
              return (
                <div key={i} style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'12px 14px', marginBottom:8, borderRadius:16,
                  background: u.isUser ? C.amber + '14' : C.bgCard,
                  border:`1.5px solid ${u.isUser ? C.amber + '55' : C.border}`,
                }}>
                  {/* Rank / Medal */}
                  <div style={{ width:32, textAlign:'center', flexShrink:0,
                    fontFamily:F.display, fontWeight:800,
                    fontSize: medal ? 22 : 13,
                    color: u.isUser ? C.amber : C.textMuted }}>
                    {medal || `#${u.rank}`}
                  </div>

                  {/* Avatar */}
                  <div style={{ width:40, height:40, borderRadius:12,
                    background:C.bgElevated, display:'flex', alignItems:'center',
                    justifyContent:'center', fontSize:22, flexShrink:0 }}>
                    {u.avatar}
                  </div>

                  {/* Name */}
                  <div style={{ flex:1, fontFamily:F.body, fontWeight:700,
                    fontSize:13, color:C.text }}>
                    {u.name}{u.isUser ? ' (tú)' : ''}
                  </div>

                  {/* Coins */}
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontFamily:F.display, fontWeight:800, fontSize:16,
                      color: u.isUser ? C.amber : (i < 3 ? C.text : C.textSub) }}>
                      {u.coins.toLocaleString()}
                    </div>
                    <div style={{ fontFamily:F.body, fontSize:10, color:C.textMuted }}>
                      🪙
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}

      </div>
    </div>
  )
}
