import { useState, useEffect } from 'react'
import { useTheme, F } from '../lib/theme'
import { usePetCoins } from '../lib/petcoins.jsx'

/* ── Trivia ── */
const TRIVIA = [
  { q:'¿Cuántos colores puede distinguir un perro?', opts:['Solo blanco y negro','2 colores','Varios, aunque menos que humanos','Los mismos que humanos'], c:2 },
  { q:'¿Cuántas horas duerme un gato adulto al día?', opts:['4-6h','8-10h','12-16h','18-22h'], c:2 },
  { q:'¿Cuál es el órgano más desarrollado en los perros?', opts:['Vista','Olfato','Oído','Gusto'], c:1 },
  { q:'¿A qué especie pertenece el conejillo de Indias?', opts:['Conejo','Roedor','Marsupial','Felino'], c:1 },
  { q:'¿Cuántos dientes permanentes tiene un gato adulto?', opts:['20','26','30','36'], c:2 },
  { q:'¿Qué animal tiene un corazón que late más rápido?', opts:['Perro','Gato','Hamster','Conejo'], c:2 },
]

/* ── Adivina la raza ── */
const RAZAS = [
  { foto:'/Golden_retriever.jpeg', raza:'Golden Retriever',
    opts:['Labrador','Golden Retriever','Border Collie','Irish Setter'], c:1 },
  { foto:'/Labrador.jpeg', raza:'Labrador',
    opts:['Labrador','Beagle','Braco Alemán','Cocker Spaniel'], c:0 },
  { foto:'/Beagle.jpeg', raza:'Beagle',
    opts:['Foxhound','Basset Hound','Beagle','Dachshund'], c:2 },
  { foto:'/Gato_persa.jpeg', raza:'Gato Persa',
    opts:['Angora','Maine Coon','Gato Persa','Siamés'], c:2 },
]

/* ── TriviaGame ── */
function TriviaGame({ onBack }) {
  const { C } = useTheme()
  const { addCoins } = usePetCoins()
  const [qIdx, setQIdx]       = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore]     = useState(0)
  const [done, setDone]       = useState(false)

  const q = TRIVIA[qIdx]

  // ── Avance a la siguiente pregunta ──────────────────────────────────────────
  // useEffect garantiza que qIdx siempre tiene el valor actual cuando el timer
  // dispara, sin el problema de closure que tiene un setTimeout inline.
  useEffect(() => {
    if (selected === null) return          // solo actuar cuando hay respuesta
    const timer = setTimeout(() => {
      if (qIdx + 1 >= TRIVIA.length) {
        setDone(true)
      } else {
        setQIdx(qIdx + 1)
        setSelected(null)
      }
    }, 1200)
    return () => clearTimeout(timer)       // limpiar si el componente re-renderiza
  }, [selected, qIdx])

  const handleAnswer = (i) => {
    if (selected !== null) return          // ignorar doble-clic
    setSelected(i)
    if (i === q.c) {
      setScore(s => s + 1)
      addCoins(50)
    }
  }

  if (done) return (
    <div style={{ textAlign:'center', padding:'40px 24px' }}>
      <div style={{ fontSize:64 }}>🧠</div>
      <div style={{ fontFamily:F.display, fontWeight:800, fontSize:24, color:C.text, marginTop:14 }}>
        ¡Terminaste!
      </div>
      <div style={{ fontFamily:F.body, fontSize:15, color:C.textSub, marginTop:8 }}>
        Acertaste {score} de {TRIVIA.length} preguntas
      </div>
      <div style={{ fontFamily:F.display, fontWeight:700, fontSize:18, color:C.amber, marginTop:8 }}>
        +{score * 50} 🪙 ganados
      </div>
      <button onClick={onBack} style={{ marginTop:28, background:C.accent, color:C.bg,
        border:'none', borderRadius:14, padding:'13px 28px', fontFamily:F.display,
        fontSize:15, fontWeight:700, cursor:'pointer' }}>
        Volver →
      </button>
    </div>
  )

  return (
    <div style={{ padding:'0 0 24px' }}>
      {/* Progreso */}
      <div style={{ height:4, background:C.bgElevated, borderRadius:2, overflow:'hidden', marginBottom:20 }}>
        <div style={{ height:'100%', width:`${((qIdx+1)/TRIVIA.length)*100}%`,
          background:C.accent, borderRadius:2, transition:'width 0.4s' }} />
      </div>
      <div style={{ fontFamily:F.body, fontSize:12, color:C.textMuted, marginBottom:16, textAlign:'center' }}>
        Pregunta {qIdx+1} de {TRIVIA.length} · +50 🪙 por correcta
      </div>
      <div style={{ fontFamily:F.display, fontWeight:700, fontSize:17, color:C.text,
        lineHeight:1.4, marginBottom:24, textAlign:'center', padding:'0 4px' }}>
        {q.q}
      </div>
      {q.opts.map((opt, i) => {
        let bg = C.bgElevated
        let border = `1px solid ${C.border}`
        let color = C.text
        if (selected !== null) {
          if (i === q.c) { bg = C.teal + '22'; border = `2px solid ${C.teal}`; color = C.teal }
          else if (i === selected && selected !== q.c) { bg = C.red + '18'; border = `2px solid ${C.red}`; color = C.red }
        }
        return (
          <button key={i} onClick={() => handleAnswer(i)} style={{
            width:'100%', marginBottom:10, padding:'14px 16px', textAlign:'left',
            background:bg, border, borderRadius:14, fontFamily:F.body, fontSize:14,
            fontWeight:selected === i ? 700 : 500, color, cursor:'pointer',
            transition:'all 0.2s',
          }}>
            {selected !== null && i === q.c && '✓ '}
            {selected !== null && i === selected && selected !== q.c && '✕ '}
            {opt}
          </button>
        )
      })}
    </div>
  )
}

/* ── RazasGame ── */
function RazasGame({ onBack }) {
  const { C } = useTheme()
  const { addCoins } = usePetCoins()
  const [rIdx, setRIdx]       = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore]     = useState(0)
  const [done, setDone]       = useState(false)

  const r = RAZAS[rIdx]

  // ── Avance a la siguiente foto ─────────────────────────────────────────────
  useEffect(() => {
    if (selected === null) return
    const timer = setTimeout(() => {
      if (rIdx + 1 >= RAZAS.length) {
        setDone(true)
      } else {
        setRIdx(rIdx + 1)
        setSelected(null)
      }
    }, 1200)
    return () => clearTimeout(timer)
  }, [selected, rIdx])

  const handleAnswer = (i) => {
    if (selected !== null) return
    setSelected(i)
    if (i === r.c) {
      setScore(s => s + 1)
      addCoins(30)
    }
  }

  if (done) return (
    <div style={{ textAlign:'center', padding:'40px 24px' }}>
      <div style={{ fontSize:64 }}>🦮</div>
      <div style={{ fontFamily:F.display, fontWeight:800, fontSize:24, color:C.text, marginTop:14 }}>¡Terminaste!</div>
      <div style={{ fontFamily:F.body, fontSize:15, color:C.textSub, marginTop:8 }}>
        Acertaste {score} de {RAZAS.length}
      </div>
      <div style={{ fontFamily:F.display, fontWeight:700, fontSize:18, color:C.amber, marginTop:8 }}>
        +{score * 30} 🪙 ganados
      </div>
      <button onClick={onBack} style={{ marginTop:28, background:C.teal, color:'#fff',
        border:'none', borderRadius:14, padding:'13px 28px', fontFamily:F.display,
        fontSize:15, fontWeight:700, cursor:'pointer' }}>Volver →</button>
    </div>
  )

  return (
    <div style={{ padding:'0 0 24px' }}>
      <div style={{ height:4, background:C.bgElevated, borderRadius:2, overflow:'hidden', marginBottom:16 }}>
        <div style={{ height:'100%', width:`${((rIdx+1)/RAZAS.length)*100}%`,
          background:C.teal, borderRadius:2, transition:'width 0.4s' }} />
      </div>
      <div style={{ fontFamily:F.body, fontSize:12, color:C.textMuted, marginBottom:14, textAlign:'center' }}>
        Foto {rIdx+1} de {RAZAS.length} · +30 🪙 por correcta
      </div>
      <div style={{ fontFamily:F.display, fontWeight:700, fontSize:16, color:C.text,
        marginBottom:14, textAlign:'center' }}>¿Qué raza es esta mascota?</div>
      <div style={{ height:200, borderRadius:18, overflow:'hidden', marginBottom:20 }}>
        <img src={r.foto} alt="mascota" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center 20%' }} />
      </div>
      {r.opts.map((opt, i) => {
        let bg = C.bgElevated; let border = `1px solid ${C.border}`; let color = C.text
        if (selected !== null) {
          if (i === r.c) { bg = C.teal+'22'; border=`2px solid ${C.teal}`; color=C.teal }
          else if (i === selected && selected !== r.c) { bg=C.red+'18'; border=`2px solid ${C.red}`; color=C.red }
        }
        return (
          <button key={i} onClick={() => handleAnswer(i)} style={{
            width:'100%', marginBottom:8, padding:'12px 16px', textAlign:'left',
            background:bg, border, borderRadius:12, fontFamily:F.body, fontSize:13,
            fontWeight:selected===i ? 700 : 500, color, cursor:'pointer', transition:'all 0.2s',
          }}>
            {selected !== null && i === r.c && '✓ '}
            {selected !== null && i === selected && selected !== r.c && '✕ '}
            {opt}
          </button>
        )
      })}
    </div>
  )
}

/* ── GamesScreen principal ── */
export default function GamesScreen({ onClose }) {
  const { C } = useTheme()
  const [game, setGame] = useState(null)

  const GAMES = [
    { id:'trivia', emoji:'🧠', title:'Trivia de Mascotas', desc:`${TRIVIA.length} preguntas de cultura animal`, coins:'+50 🪙 por correcta', color:C.accent },
    { id:'razas',  emoji:'🦮', title:'Adivina la Raza',   desc:`${RAZAS.length} fotos de mascotas para identificar`, coins:'+30 🪙 por correcta', color:C.teal   },
  ]

  return (
    <div style={{ position:'fixed', inset:0, zIndex:260, background:C.bg, overflowY:'auto', maxWidth:420, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'18px 18px 14px',
        background:C.bg, borderBottom:`1px solid ${C.border}`, position:'sticky', top:0, zIndex:10 }}>
        <button onClick={game ? () => setGame(null) : onClose} style={{ background:C.bgElevated,
          border:`1px solid ${C.border}`, borderRadius:10, width:34, height:34,
          display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:16, color:C.text }}>←</button>
        <span style={{ fontFamily:F.display, fontWeight:800, fontSize:18, color:C.text }}>
          {game ? (game === 'trivia' ? '🧠 Trivia' : '🦮 Adivina la Raza') : 'Juegos 🎮'}
        </span>
      </div>

      <div style={{ padding:'18px 18px 48px' }}>
        {!game && (
          <>
            <div style={{ fontFamily:F.body, fontSize:13, color:C.textSub, marginBottom:18, textAlign:'center', lineHeight:1.5 }}>
              Juega y gana 🪙 PetCoins que puedes usar en recompensas
            </div>
            {GAMES.map(g => (
              <div key={g.id} onClick={() => setGame(g.id)} style={{
                display:'flex', alignItems:'center', gap:14, padding:'18px',
                background:C.bgCard, borderRadius:18, marginBottom:12, cursor:'pointer',
                border:`1px solid ${C.border}`, transition:'all 0.15s',
              }}>
                <div style={{ width:60, height:60, borderRadius:18, background:g.color+'22',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, flexShrink:0 }}>
                  {g.emoji}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:F.display, fontWeight:700, fontSize:16, color:C.text }}>{g.title}</div>
                  <div style={{ fontFamily:F.body, fontSize:12, color:C.textSub, marginTop:3 }}>{g.desc}</div>
                  <div style={{ fontFamily:F.body, fontSize:11, fontWeight:600, color:g.color, marginTop:5 }}>{g.coins}</div>
                </div>
                <span style={{ color:C.textMuted, fontSize:18 }}>›</span>
              </div>
            ))}
          </>
        )}
        {game === 'trivia' && <TriviaGame onBack={() => setGame(null)} />}
        {game === 'razas'  && <RazasGame  onBack={() => setGame(null)} />}
      </div>
    </div>
  )
}
