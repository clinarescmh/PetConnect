import { useState, useEffect, useCallback, useRef } from 'react'
import { useTheme, F } from '../lib/theme'
import { usePetCoins } from '../lib/petcoins.jsx'

/* ── Utils ── */
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5)
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const lsGet = (k, d = 0) => { try { return parseInt(localStorage.getItem(k) || '', 10) || d } catch { return d } }
const lsSet = (k, v) => { try { localStorage.setItem(k, String(v)) } catch {} }

/* ══════════════════════════════════════════════════════
   ESTILOS / KEYFRAMES GLOBALES DE JUEGOS
══════════════════════════════════════════════════════ */
function GameStyles() {
  return (
    <style>{`
      @keyframes g-popIn   { 0%{opacity:0;transform:scale(.4)} 60%{transform:scale(1.12)} 100%{opacity:1;transform:scale(1)} }
      @keyframes g-slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      @keyframes g-matchPop{ 0%{transform:scale(1)} 40%{transform:scale(1.18)} 100%{transform:scale(1)} }
      @keyframes g-glow    { 0%,100%{box-shadow:0 0 0 0 rgba(45,212,191,0)} 50%{box-shadow:0 0 20px 5px rgba(45,212,191,.7)} }
      @keyframes g-shake   { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-7px)} 40%{transform:translateX(7px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
      @keyframes g-float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
      @keyframes g-burst   { to { transform: translate(var(--tx), var(--ty)) scale(0); opacity:0 } }
      @keyframes g-spin    { to { transform: rotate(360deg) } }
      @keyframes g-confetti{ 0%{transform:translateY(-10px) rotate(0);opacity:1} 100%{transform:translateY(220px) rotate(540deg);opacity:0} }
      @keyframes g-run     { 0%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-6px) rotate(3deg)} 100%{transform:translateY(0) rotate(-3deg)} }
      @keyframes g-speed   { 0%{opacity:.7;transform:scaleX(1)} 100%{opacity:0;transform:scaleX(.3) translateX(-14px)} }
      @keyframes g-pulse   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
      @keyframes g-draw    { from{stroke-dashoffset:var(--len)} to{stroke-dashoffset:0} }
      @keyframes g-fall    { to { transform: translateY(var(--fall)) } }
      @keyframes g-padFlash{ 0%{filter:brightness(1)} 50%{filter:brightness(1.9)} 100%{filter:brightness(1)} }
      @keyframes g-ring    { from{transform:scale(.4);opacity:.85} to{transform:scale(2.6);opacity:0} }

      .g-card { transition: transform .15s, box-shadow .15s; }
      .g-card:hover  { transform: translateY(-3px); }
      .g-card:active { transform: scale(.97); }
      .g-tap:active  { transform: scale(.9); }
    `}</style>
  )
}

/* Explosión de partículas en una posición (porcentajes dentro del contenedor) */
function Burst({ x, y, color = '#FFB547' }) {
  const parts = Array.from({ length: 9 })
  return (
    <div style={{ position:'absolute', left:`${x}%`, top:`${y}%`, transform:'translate(-50%,-50%)', pointerEvents:'none', zIndex:5 }}>
      <div style={{ position:'absolute', inset:-20, borderRadius:'50%', border:`3px solid ${color}`, animation:'g-ring .5s ease-out forwards' }} />
      <div style={{ fontSize:44, animation:'g-popIn .35s ease-out' }}>💥</div>
      {parts.map((_, i) => {
        const ang = (i / parts.length) * Math.PI * 2
        const d = 46
        return (
          <span key={i} style={{
            position:'absolute', left:0, top:0, width:8, height:8, borderRadius:'50%',
            background: color, '--tx': `${Math.cos(ang)*d}px`, '--ty': `${Math.sin(ang)*d}px`,
            animation:'g-burst .55s ease-out forwards',
          }} />
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   1. TRIVIA
══════════════════════════════════════════════════════ */
const TRIVIA = [
  { q:'¿Cuántos colores puede distinguir un perro?', opts:['Solo 2','Varios, menos que humanos','Los mismos que humanos','Ninguno'], c:1 },
  { q:'¿Cuántas horas duerme un gato adulto al día?', opts:['4-6h','8-10h','12-16h','18-22h'], c:2 },
  { q:'¿Cuál es el órgano más desarrollado en los perros?', opts:['Vista','Olfato','Oído','Gusto'], c:1 },
  { q:'¿A qué especie pertenece el conejillo de Indias?', opts:['Conejo','Roedor','Marsupial','Felino'], c:1 },
  { q:'¿Cuántos dientes permanentes tiene un gato?', opts:['20','26','30','36'], c:2 },
  { q:'¿Qué raza de perro es famosa por salvar alpinistas?', opts:['Labrador','San Bernardo','Husky','Dálmata'], c:1 },
]

function TriviaGame({ onBack, onReplay }) {
  const { C } = useTheme()
  const { addCoins } = usePetCoins()
  const [qIdx,     setQIdx]     = useState(0)
  const [selected, setSelected] = useState(null)
  const [score,    setScore]    = useState(0)
  const [done,     setDone]     = useState(false)
  const q = TRIVIA[qIdx]

  useEffect(() => {
    if (selected === null) return
    const timer = setTimeout(() => {
      if (qIdx + 1 >= TRIVIA.length) setDone(true)
      else { setQIdx(qIdx + 1); setSelected(null) }
    }, 1200)
    return () => clearTimeout(timer)
  }, [selected, qIdx])

  const handleAnswer = (i) => {
    if (selected !== null) return
    setSelected(i)
    if (i === q.c) { setScore(s => s + 1); addCoins(50) }
  }

  if (done) return <DoneScreen emoji="🧠" msg={`Acertaste ${score} de ${TRIVIA.length}`} coins={score*50} onBack={onBack} onReplay={onReplay} />
  return (
    <div style={{ padding:'0 0 24px', animation:'g-slideUp .3s ease' }}>
      <ProgressBar pct={((qIdx)/TRIVIA.length)*100} color={C.accent} />
      <div style={{ fontFamily:F.body, fontSize:12, color:C.textMuted, textAlign:'center', marginBottom:16 }}>
        Pregunta {qIdx+1}/{TRIVIA.length} · +50 🪙 correcta
      </div>
      <div style={{ fontFamily:F.display, fontWeight:700, fontSize:17, color:C.text,
        lineHeight:1.4, marginBottom:22, textAlign:'center', padding:'0 4px' }}>{q.q}</div>
      {q.opts.map((opt, i) => (
        <AnswerBtn key={i} label={opt} idx={i} correct={q.c} selected={selected} onPress={() => handleAnswer(i)} />
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   2. ADIVINA LA RAZA
══════════════════════════════════════════════════════ */
const RAZAS = [
  { foto:'/Golden_retriever.jpeg', raza:'Golden Retriever', opts:['Labrador','Golden Retriever','Border Collie','Irish Setter'], c:1 },
  { foto:'/Labrador.jpeg', raza:'Labrador', opts:['Labrador','Beagle','Braco Alemán','Cocker Spaniel'], c:0 },
  { foto:'/Beagle.jpeg', raza:'Beagle', opts:['Foxhound','Basset Hound','Beagle','Dachshund'], c:2 },
  { foto:'/Gato_persa.jpeg', raza:'Gato Persa', opts:['Angora','Maine Coon','Gato Persa','Siamés'], c:2 },
]

function RazasGame({ onBack, onReplay }) {
  const { C } = useTheme()
  const { addCoins } = usePetCoins()
  const [rIdx, setRIdx]       = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore]     = useState(0)
  const [done, setDone]       = useState(false)
  const r = RAZAS[rIdx]

  useEffect(() => {
    if (selected === null) return
    const timer = setTimeout(() => {
      if (rIdx + 1 >= RAZAS.length) setDone(true)
      else { setRIdx(rIdx + 1); setSelected(null) }
    }, 1200)
    return () => clearTimeout(timer)
  }, [selected, rIdx])

  const handleAnswer = (i) => {
    if (selected !== null) return
    setSelected(i)
    if (i === r.c) { setScore(s => s + 1); addCoins(30) }
  }

  if (done) return <DoneScreen emoji="🦮" msg={`Acertaste ${score} de ${RAZAS.length}`} coins={score*30} onBack={onBack} onReplay={onReplay} />
  return (
    <div style={{ padding:'0 0 24px', animation:'g-slideUp .3s ease' }}>
      <ProgressBar pct={((rIdx)/RAZAS.length)*100} color={C.teal} />
      <div style={{ fontFamily:F.body, fontSize:12, color:C.textMuted, textAlign:'center', marginBottom:12 }}>
        Foto {rIdx+1}/{RAZAS.length} · +30 🪙 correcta
      </div>
      <div style={{ fontFamily:F.display, fontWeight:700, fontSize:16, color:C.text, marginBottom:12, textAlign:'center' }}>
        ¿Qué raza es esta mascota?
      </div>
      <div style={{ height:190, borderRadius:18, overflow:'hidden', marginBottom:18, boxShadow:'0 6px 20px rgba(0,0,0,.18)' }}>
        <img src={r.foto} alt="mascota" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center 20%' }} />
      </div>
      {r.opts.map((opt, i) => (
        <AnswerBtn key={i} label={opt} idx={i} correct={r.c} selected={selected} onPress={() => handleAnswer(i)} />
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   3. MEMORIA 4x4 (8 pares, flip 3D, glow al emparejar)
══════════════════════════════════════════════════════ */
const MEM_EMOJIS = ['🐕','🐈','🐰','🦜','🐟','🐹','🦊','🐢']

function makeCards() {
  return shuffle([...MEM_EMOJIS, ...MEM_EMOJIS].map((e, i) => ({ id:i, emoji:e, flipped:false, matched:false })))
}

function MemoriaGame({ onBack, onReplay }) {
  const { C } = useTheme()
  const { addCoins } = usePetCoins()
  const [cards,      setCards]      = useState(makeCards)
  const [flippedIds, setFlippedIds] = useState([])
  const [matches,    setMatches]    = useState(0)
  const [moves,      setMoves]      = useState(0)
  const [lock,       setLock]       = useState(false)
  const [done,       setDone]       = useState(false)
  const COINS = 120
  const wonRef = useRef(false)

  // Victoria robusta: cuando TODAS las cartas quedan emparejadas (deriva del
  // estado real, sin depender de contadores en closures).
  useEffect(() => {
    if (!wonRef.current && cards.length > 0 && cards.every(c => c.matched)) {
      wonRef.current = true
      addCoins(COINS)
      const t = setTimeout(() => setDone(true), 700)
      return () => clearTimeout(t)
    }
  }, [cards]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFlip = (id) => {
    if (lock) return
    const card = cards.find(c => c.id === id)
    if (card.flipped || card.matched) return
    const newFlipped = [...flippedIds, id]
    setCards(cs => cs.map(c => c.id === id ? { ...c, flipped:true } : c))
    if (newFlipped.length < 2) { setFlippedIds(newFlipped); return }

    setMoves(m => m + 1)
    setLock(true)
    const [idA] = newFlipped
    const a = cards.find(c => c.id === idA)
    const b = cards.find(c => c.id === id)

    if (a.emoji === b.emoji) {
      setTimeout(() => {
        setCards(cs => cs.map(c => newFlipped.includes(c.id) ? { ...c, matched:true } : c))
        setMatches(m => m + 1)
        setFlippedIds([]); setLock(false)
      }, 450)
    } else {
      setTimeout(() => {
        setCards(cs => cs.map(c => newFlipped.includes(c.id) ? { ...c, flipped:false } : c))
        setFlippedIds([]); setLock(false)
      }, 850)
    }
  }

  if (done) return <DoneScreen emoji="🧩" msg={`¡8 pares en ${moves} intentos!`} coins={COINS} onBack={onBack} onReplay={onReplay} />

  return (
    <div style={{ padding:'0 0 24px', animation:'g-slideUp .3s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14, gap:8 }}>
        <StatChip label="Pares" value={`${matches}/8`} color={C.teal} />
        <StatChip label="Intentos" value={moves} color={C.accent} />
        <StatChip label="Premio" value="120 🪙" color={C.amber} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:9 }}>
        {cards.map(card => {
          const up = card.flipped || card.matched
          return (
            <div key={card.id} onClick={() => handleFlip(card.id)}
              style={{ perspective:600, height:74, cursor: card.matched ? 'default' : 'pointer',
                animation: card.matched ? 'g-matchPop .5s ease' : undefined }}>
              <div style={{ position:'relative', width:'100%', height:'100%',
                transition:'transform .45s cubic-bezier(.4,.2,.2,1)', transformStyle:'preserve-3d',
                transform: up ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                {/* Reverso (cubierta) */}
                <div style={{ position:'absolute', inset:0, backfaceVisibility:'hidden',
                  borderRadius:14, border:`1.5px solid ${C.border}`,
                  background:`linear-gradient(135deg, ${C.bgElevated}, ${C.bgCard})`,
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, color:C.textMuted }}>
                  🐾
                </div>
                {/* Frente (emoji) */}
                <div style={{ position:'absolute', inset:0, backfaceVisibility:'hidden',
                  transform:'rotateY(180deg)', borderRadius:14,
                  border:`2px solid ${card.matched ? C.teal : C.borderHi}`,
                  background: card.matched ? C.teal+'22' : C.bgCard,
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:34,
                  animation: card.matched ? 'g-glow 1s ease' : undefined }}>
                  {card.emoji}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   4. REACCIÓN RÁPIDA (posición aleatoria real, explosión, récord)
══════════════════════════════════════════════════════ */
const REACT_EMOJIS = ['🐕','🐈','🐰','🦜','🐟','🐹','🦊','🐺']
const REACT_ROUNDS = 10
const BEST_KEY = 'pc_react_best_ms'

function ReaccionGame({ onBack, onReplay }) {
  const { C } = useTheme()
  const { addCoins } = usePetCoins()
  const [phase,  setPhase]  = useState('waiting') // waiting|active|feedback
  const [round,  setRound]  = useState(1)
  const [score,  setScore]  = useState(0)
  const [done,   setDone]   = useState(false)
  const [hit,    setHit]    = useState(false)
  const [pos,    setPos]    = useState({ x:50, y:50 })
  const [emoji,  setEmoji]  = useState('🐕')
  const [rt,     setRt]     = useState(0)
  const [best,   setBest]   = useState(() => lsGet(BEST_KEY, 0))
  const shownAt = useRef(0)
  const reactedRef = useRef(false)   // evita doble conteo dentro de una ronda

  useEffect(() => {
    if (phase !== 'waiting') return
    const t = setTimeout(() => {
      setPos({ x: rand(12, 88), y: rand(14, 86) })
      setEmoji(REACT_EMOJIS[rand(0, REACT_EMOJIS.length-1)])
      shownAt.current = Date.now()
      reactedRef.current = false
      setPhase('active')
    }, rand(700, 1800))
    return () => clearTimeout(t)
  }, [phase, round])

  useEffect(() => {
    if (phase !== 'active') return
    const t = setTimeout(() => { setHit(false); setRt(0); setPhase('feedback') }, 1400)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (phase !== 'feedback') return
    const t = setTimeout(() => {
      if (round >= REACT_ROUNDS) setDone(true)
      else { setRound(r => r + 1); setPhase('waiting') }
    }, 750)
    return () => clearTimeout(t)
  }, [phase, round])

  const handleTap = () => {
    if (phase !== 'active' || reactedRef.current) return
    reactedRef.current = true
    const ms = Date.now() - shownAt.current
    setRt(ms)
    if (best === 0 || ms < best) { setBest(ms); lsSet(BEST_KEY, ms) }
    setHit(true); setScore(s => s + 1); addCoins(25); setPhase('feedback')
  }

  if (done) return <DoneScreen emoji="⚡" msg={`Atrapaste ${score}/${REACT_ROUNDS}${best ? ` · récord ${best}ms` : ''}`} coins={score*25} onBack={onBack} onReplay={onReplay} />

  return (
    <div style={{ padding:'0 0 24px', animation:'g-slideUp .3s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12, gap:8 }}>
        <StatChip label="Ronda" value={`${round}/${REACT_ROUNDS}`} color={C.accent} />
        <StatChip label="Atrapados" value={score} color={C.teal} />
        <StatChip label="Récord" value={best ? `${best}ms` : '—'} color={C.amber} />
      </div>
      <ProgressBar pct={(round/REACT_ROUNDS)*100} color={C.accent} />

      <div onClick={handleTap} style={{ position:'relative', height:320, overflow:'hidden', marginTop:8,
        borderRadius:20, cursor:'pointer',
        background:`radial-gradient(circle at 50% 0%, ${C.accent}14, ${C.bgElevated} 70%)`,
        border:`2px solid ${phase==='feedback' ? (hit ? C.teal : C.red)+'88' : C.border}`,
        transition:'border-color .3s' }}>
        {phase === 'waiting' && (
          <Centered><span style={{ fontFamily:F.body, fontSize:14, color:C.textMuted, animation:'g-pulse 1s infinite' }}>¡Prepárate…</span></Centered>
        )}
        {phase === 'active' && (
          <div style={{ position:'absolute', left:`${pos.x}%`, top:`${pos.y}%`,
            transform:'translate(-50%,-50%)', fontSize:52, userSelect:'none', pointerEvents:'none',
            animation:'g-popIn .18s ease-out' }}>
            {emoji}
          </div>
        )}
        {phase === 'feedback' && hit && <Burst x={pos.x} y={pos.y} color={C.teal} />}
        {phase === 'feedback' && (
          <Centered>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:46 }}>{hit ? '✅' : '❌'}</div>
              <div style={{ fontFamily:F.display, fontWeight:800, fontSize:16, color: hit ? C.teal : C.red, marginTop:4 }}>
                {hit ? `${rt}ms · +25 🪙` : '¡Muy lento!'}
              </div>
            </div>
          </Centered>
        )}
      </div>
      <div style={{ fontFamily:F.body, fontSize:12, color:C.textMuted, textAlign:'center', marginTop:10 }}>
        {phase === 'active' ? '¡Tócalo YA!' : 'Aparecerá en cualquier parte del recuadro'}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   5. COLOREA LA MASCOTA (silueta SVG real, pintar tocando)
══════════════════════════════════════════════════════ */
const PAINT_PALETTE = ['#FF8C00','#FFB547','#F9D923','#6BCB77','#2DD4BF','#4D96FF','#9B6EF5','#F055A3','#FF6B6B','#8D6E63','#FFFFFF','#3A3A3A']
const PAINT_DEFAULT = '#E2E2E2'

const DOG_ZONES = [
  { id:'bg', label:'🖼 Fondo' }, { id:'ears', label:'👂 Orejas' }, { id:'head', label:'🐶 Cabeza' },
  { id:'snout', label:'👃 Hocico' }, { id:'body', label:'🧥 Cuerpo' }, { id:'chest', label:'🤍 Pecho' },
  { id:'legs', label:'🐾 Patas' }, { id:'tail', label:'〰️ Cola' }, { id:'collar', label:'🎀 Collar' },
]
const CAT_ZONES = DOG_ZONES

function DogSVG({ colors, paint }) {
  const z = (id) => ({ fill: colors[id] || PAINT_DEFAULT, stroke:'#00000022', strokeWidth:1.5, cursor:'pointer', onClick:() => paint(id) })
  return (
    <svg viewBox="0 0 240 230" style={{ width:'100%', height:'100%' }}>
      <rect x="3" y="3" width="234" height="224" rx="20" {...z('bg')} />
      <path d="M44 170 Q8 150 26 108 Q42 132 64 156 Z" {...z('tail')} />
      <g {...z('legs')}><rect x="92" y="180" width="20" height="40" rx="10" /><rect x="128" y="180" width="20" height="40" rx="10" /></g>
      <ellipse cx="120" cy="160" rx="64" ry="46" {...z('body')} />
      <ellipse cx="120" cy="176" rx="34" ry="30" {...z('chest')} />
      <rect x="82" y="128" width="76" height="13" rx="6" {...z('collar')} />
      <g {...z('ears')}>
        <ellipse cx="74" cy="74" rx="22" ry="36" transform="rotate(-20 74 74)" />
        <ellipse cx="166" cy="74" rx="22" ry="36" transform="rotate(20 166 74)" />
      </g>
      <circle cx="120" cy="92" r="50" {...z('head')} />
      <ellipse cx="120" cy="112" rx="30" ry="23" {...z('snout')} />
      {/* detalles fijos */}
      <ellipse cx="120" cy="100" rx="10" ry="7" fill="#2A2A2A" />
      <circle cx="103" cy="84" r="6" fill="#2A2A2A" /><circle cx="137" cy="84" r="6" fill="#2A2A2A" />
      <circle cx="105" cy="82" r="2" fill="#fff" /><circle cx="139" cy="82" r="2" fill="#fff" />
      <path d="M120 107 Q120 122 110 124 M120 107 Q120 122 130 124" stroke="#2A2A2A" strokeWidth="2" fill="none" />
    </svg>
  )
}

function CatSVG({ colors, paint }) {
  const z = (id) => ({ fill: colors[id] || PAINT_DEFAULT, stroke:'#00000022', strokeWidth:1.5, cursor:'pointer', onClick:() => paint(id) })
  return (
    <svg viewBox="0 0 240 230" style={{ width:'100%', height:'100%' }}>
      <rect x="3" y="3" width="234" height="224" rx="20" {...z('bg')} />
      <path d="M186 176 Q232 168 220 120 Q214 152 174 162 Z" {...z('tail')} />
      <g {...z('legs')}><rect x="92" y="184" width="20" height="36" rx="10" /><rect x="128" y="184" width="20" height="36" rx="10" /></g>
      <ellipse cx="120" cy="166" rx="60" ry="44" {...z('body')} />
      <ellipse cx="120" cy="180" rx="32" ry="28" {...z('chest')} />
      <rect x="86" y="124" width="68" height="12" rx="6" {...z('collar')} />
      <g {...z('ears')}>
        <polygon points="82,42 70,92 116,76" /><polygon points="158,42 170,92 124,76" />
      </g>
      <circle cx="120" cy="92" r="48" {...z('head')} />
      <ellipse cx="120" cy="108" rx="26" ry="20" {...z('snout')} />
      {/* detalles fijos */}
      <polygon points="120,100 113,94 127,94" fill="#F06595" />
      <ellipse cx="102" cy="86" rx="6" ry="8" fill="#2A2A2A" /><ellipse cx="138" cy="86" rx="6" ry="8" fill="#2A2A2A" />
      <path d="M120 104 Q113 112 106 110 M120 104 Q127 112 134 110" stroke="#2A2A2A" strokeWidth="2" fill="none" />
      <g stroke="#2A2A2A" strokeWidth="1.4">
        <line x1="96" y1="106" x2="64" y2="100" /><line x1="96" y1="112" x2="66" y2="114" />
        <line x1="144" y1="106" x2="176" y2="100" /><line x1="144" y1="112" x2="174" y2="114" />
      </g>
    </svg>
  )
}

function ColorearGame({ onBack, onReplay }) {
  const { C } = useTheme()
  const { addCoins } = usePetCoins()
  const [animal, setAnimal] = useState('dog')
  const [colors, setColors] = useState({})
  const [active, setActive] = useState(PAINT_PALETTE[0])
  const [done, setDone]     = useState(false)

  const zones = animal === 'dog' ? DOG_ZONES : CAT_ZONES
  const painted = zones.filter(zn => colors[zn.id] && colors[zn.id] !== PAINT_DEFAULT).length
  const canFinish = painted >= 4

  const paint = (id) => setColors(c => ({ ...c, [id]: active }))
  const switchAnimal = (a) => { setAnimal(a); setColors({}) }

  if (done) return <DoneScreen emoji="🎨" msg="¡Tu obra maestra está lista!" coins={70} onBack={onBack} onReplay={onReplay} />

  return (
    <div style={{ padding:'0 0 24px', animation:'g-slideUp .3s ease' }}>
      {/* Selector perro/gato */}
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        {[['dog','🐶 Perro'],['cat','🐱 Gato']].map(([a,l]) => (
          <button key={a} onClick={() => switchAnimal(a)} style={{
            flex:1, padding:'9px 0', borderRadius:12, cursor:'pointer', fontFamily:F.body, fontSize:13, fontWeight:700,
            background: animal===a ? C.accent+'22' : C.bgElevated,
            border:`1.5px solid ${animal===a ? C.accent : C.border}`, color: animal===a ? C.accent : C.text,
            transition:'all .15s' }}>{l}</button>
        ))}
      </div>

      {/* Lienzo */}
      <div style={{ height:230, marginBottom:12, borderRadius:20, overflow:'hidden', border:`1.5px solid ${C.border}`,
        boxShadow:'0 6px 18px rgba(0,0,0,.12)' }}>
        {animal === 'dog' ? <DogSVG colors={colors} paint={paint} /> : <CatSVG colors={colors} paint={paint} />}
      </div>
      <div style={{ fontFamily:F.body, fontSize:12, color:C.textMuted, textAlign:'center', marginBottom:12 }}>
        Elige un color y toca cada parte · {painted}/9 pintadas
      </div>

      {/* Paleta */}
      <div style={{ display:'flex', gap:9, flexWrap:'wrap', marginBottom:18, justifyContent:'center' }}>
        {PAINT_PALETTE.map(col => (
          <button key={col} onClick={() => setActive(col)} className="g-tap" style={{
            width:36, height:36, borderRadius:'50%', background:col, cursor:'pointer',
            border: active===col ? '3px solid '+C.text : '2px solid '+C.border,
            transform: active===col ? 'scale(1.18)' : 'scale(1)', transition:'transform .12s',
            boxShadow: active===col ? '0 3px 10px rgba(0,0,0,.25)' : 'none' }} />
        ))}
        <button onClick={() => setColors({})} title="Borrar todo" style={{
          width:36, height:36, borderRadius:'50%', background:C.bgElevated, border:`2px solid ${C.border}`,
          cursor:'pointer', fontSize:15, color:C.textSub }}>🧽</button>
      </div>

      <button onClick={() => { addCoins(70); setDone(true) }} disabled={!canFinish} style={{
        width:'100%', background: canFinish ? `linear-gradient(135deg, ${C.accent}, ${C.amber})` : C.bgElevated,
        color: canFinish ? '#fff' : C.textMuted, border:'none', borderRadius:14, padding:'14px',
        fontFamily:F.display, fontSize:14, fontWeight:800, cursor: canFinish ? 'pointer' : 'not-allowed',
        opacity: canFinish ? 1 : 0.6, transition:'all .2s' }}>
        {canFinish ? '🎨 ¡Terminar y cobrar! (+70 🪙)' : `Pinta ${4-painted} parte${4-painted!==1?'s':''} más`}
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   6. AHORCADO DE RAZAS (horca dibujándose + pistas)
══════════════════════════════════════════════════════ */
const BREEDS_HANGMAN = [
  { w:'LABRADOR',   hint:'Raza muy familiar, excelente nadador y guía.' },
  { w:'BEAGLE',     hint:'Sabueso pequeño de orejas largas y gran olfato.' },
  { w:'HUSKY',      hint:'Originario de Siberia, tira de trineos en la nieve.' },
  { w:'CHIHUAHUA',  hint:'La raza más pequeña del mundo, de México.' },
  { w:'DALMATA',    hint:'Blanco con manchas negras, mascota de bomberos.' },
  { w:'POODLE',     hint:'También llamado Caniche, pelo rizado.' },
  { w:'DACHSHUND',  hint:'Cuerpo largo y patas cortas, "perro salchicha".' },
  { w:'BULLDOG',    hint:'Cara arrugada y cuerpo robusto, muy tranquilo.' },
]

/* Partes de la figura, en orden de aparición por error (0..5) */
function HangmanSVG({ wrong, C }) {
  const stroke = C.text
  const part = (n, el) => wrong >= n ? el : null
  const draw = { stroke: C.red, strokeWidth:4, fill:'none', strokeLinecap:'round',
    style:{ '--len':100, strokeDasharray:100, animation:'g-draw .4s ease forwards' } }
  return (
    <svg viewBox="0 0 140 160" style={{ width:130, height:150 }}>
      {/* horca (siempre visible) */}
      <g stroke={stroke} strokeWidth="4" strokeLinecap="round" fill="none">
        <line x1="14" y1="152" x2="96" y2="152" />
        <line x1="40" y1="152" x2="40" y2="14" />
        <line x1="40" y1="14" x2="96" y2="14" />
        <line x1="96" y1="14" x2="96" y2="32" />
      </g>
      {/* partes del muñeco */}
      {part(1, <circle cx="96" cy="46" r="13" {...draw} />)}
      {part(2, <line x1="96" y1="59" x2="96" y2="100" {...draw} />)}
      {part(3, <line x1="96" y1="70" x2="78" y2="88" {...draw} />)}
      {part(4, <line x1="96" y1="70" x2="114" y2="88" {...draw} />)}
      {part(5, <line x1="96" y1="100" x2="80" y2="124" {...draw} />)}
      {part(6, <line x1="96" y1="100" x2="112" y2="124" {...draw} />)}
    </svg>
  )
}

function AhorcadoGame({ onBack, onReplay }) {
  const { C } = useTheme()
  const { addCoins } = usePetCoins()
  const [item] = useState(() => BREEDS_HANGMAN[rand(0, BREEDS_HANGMAN.length-1)])
  const breed = item.w
  const [guessed, setGuessed] = useState(new Set())
  const [wrong,   setWrong]   = useState(0)
  const [result,  setResult]  = useState(null)
  const MAX_WRONG = 6
  const uniqueLetters = [...new Set(breed.split(''))]
  // Refs sincrónicas para evitar subcontar errores en clics rápidos.
  const guessedRef = useRef(new Set())
  const wrongRef   = useRef(0)
  const resultRef  = useRef(null)

  const handleLetter = (letter) => {
    if (resultRef.current || guessedRef.current.has(letter)) return
    guessedRef.current.add(letter)
    setGuessed(new Set(guessedRef.current))
    if (!breed.includes(letter)) {
      wrongRef.current += 1
      setWrong(wrongRef.current)
      if (wrongRef.current >= MAX_WRONG) { resultRef.current = 'lost'; setResult('lost') }
    } else if (uniqueLetters.every(l => guessedRef.current.has(l))) {
      resultRef.current = 'won'; setResult('won'); addCoins(60)
    }
  }

  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

  if (result) return (
    <DoneScreen emoji={result==='won' ? '🎉' : '💀'}
      msg={result==='won' ? `¡Correcto! La raza era ${breed}` : `Era: ${breed}`}
      coins={result==='won' ? 60 : 0} onBack={onBack} onReplay={onReplay} />
  )

  return (
    <div style={{ padding:'0 0 24px', animation:'g-slideUp .3s ease' }}>
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:12 }}>
        <div style={{ flexShrink:0 }}><HangmanSVG wrong={wrong} C={C} /></div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:F.body, fontSize:12, color:C.textMuted, marginBottom:6 }}>
            Errores {wrong}/{MAX_WRONG} · +60 🪙 si aciertas
          </div>
          <div style={{ display:'flex', gap:4, marginBottom:12 }}>
            {Array.from({ length: MAX_WRONG }).map((_, i) => (
              <div key={i} style={{ width:11, height:11, borderRadius:'50%',
                background: i < wrong ? C.red : C.bgElevated,
                border:`1px solid ${i < wrong ? C.red : C.border}`, transition:'all .3s' }} />
            ))}
          </div>
          <div style={{ background:C.amber+'18', border:`1px solid ${C.amber}44`, borderRadius:12,
            padding:'10px 12px', fontFamily:F.body, fontSize:12, color:C.text, lineHeight:1.4 }}>
            💡 <b style={{ color:C.amber }}>Pista:</b> {item.hint}
          </div>
        </div>
      </div>

      {/* Palabra */}
      <div style={{ display:'flex', gap:7, justifyContent:'center', flexWrap:'wrap', margin:'18px 0 22px' }}>
        {breed.split('').map((letter, i) => (
          <div key={i} style={{ textAlign:'center', minWidth:22 }}>
            <div style={{ fontFamily:F.display, fontWeight:800, fontSize:22, color:C.accent, height:28,
              animation: guessed.has(letter) ? 'g-popIn .3s ease' : undefined }}>
              {guessed.has(letter) ? letter : ' '}
            </div>
            <div style={{ height:3, background:C.borderHi, borderRadius:2, marginTop:2 }} />
          </div>
        ))}
      </div>

      {/* Teclado */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center' }}>
        {LETTERS.map(l => {
          const used = guessed.has(l)
          const ok = used && breed.includes(l)
          const no = used && !breed.includes(l)
          return (
            <button key={l} onClick={() => handleLetter(l)} disabled={used} className="g-tap" style={{
              width:32, height:36, borderRadius:9, fontFamily:F.display, fontSize:13, fontWeight:700,
              cursor: used ? 'default' : 'pointer',
              background: ok ? C.teal+'22' : no ? C.red+'18' : C.bgElevated,
              border:`1.5px solid ${ok ? C.teal : no ? C.red : C.border}`,
              color: ok ? C.teal : no ? C.red : C.text, opacity: used ? 0.55 : 1, transition:'all .15s' }}>{l}</button>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   7. CARRERA DE MASCOTAS (fotos reales + efectos de velocidad)
══════════════════════════════════════════════════════ */
const RACERS = [
  { id:0, foto:'/Golden_retriever.jpeg', name:'Golden' },
  { id:1, foto:'/Labrador.jpeg',         name:'Labrador' },
  { id:2, foto:'/Beagle.jpeg',           name:'Beagle' },
]

function CarreraGame({ onBack, onReplay }) {
  const { C } = useTheme()
  const { addCoins } = usePetCoins()
  const [bet,      setBet]      = useState(null)
  const [racing,   setRacing]   = useState(false)
  const [progress, setProgress] = useState([0,0,0])
  const [winner,   setWinner]   = useState(null)
  const [done,     setDone]     = useState(false)
  const ivRef = useRef(null)

  const lead = progress.indexOf(Math.max(...progress))

  const startRace = useCallback(() => {
    if (bet === null) return
    setRacing(true)
    const base = [0.7 + Math.random()*1.4, 0.7 + Math.random()*1.4, 0.7 + Math.random()*1.4]
    let pos = [0,0,0]
    ivRef.current = setInterval(() => {
      pos = pos.map((p, i) => Math.min(100, p + base[i] + Math.random()*1.2))
      setProgress([...pos])
      const fin = pos.findIndex(p => p >= 100)
      if (fin !== -1) {
        clearInterval(ivRef.current)
        setWinner(fin)
        if (fin === bet) addCoins(100)
        setTimeout(() => setDone(true), 1000)
      }
    }, 50)
  }, [bet, addCoins])

  useEffect(() => () => clearInterval(ivRef.current), [])

  if (done) return (
    <DoneScreen emoji={winner === bet ? '🏆' : '😢'}
      msg={winner === bet ? `¡${RACERS[winner].name} ganó! Apostaste bien 🎉` : `${RACERS[winner].name} ganó. ¡Suerte la próxima!`}
      coins={winner === bet ? 100 : 0} onBack={onBack} onReplay={onReplay} />
  )

  return (
    <div style={{ padding:'0 0 24px', animation:'g-slideUp .3s ease' }}>
      <div style={{ fontFamily:F.body, fontSize:12, color:C.textMuted, textAlign:'center', marginBottom:16 }}>
        {racing ? '🏁 ¡La carrera está en marcha!' : '¿A quién le apuestas? · +100 🪙 si ganas'}
      </div>

      {/* Pista */}
      <div style={{ background:`linear-gradient(180deg, ${C.bgElevated}, ${C.bgCard})`, borderRadius:18,
        padding:'16px 14px', marginBottom:20, border:`1px solid ${C.border}` }}>
        {RACERS.map((r, i) => {
          const left = 1 + progress[i] * 0.80   // 1%..81%
          const isLead = racing && i === lead && progress[i] > 2
          return (
            <div key={r.id} style={{ position:'relative', height:50, marginBottom: i < RACERS.length-1 ? 12 : 0,
              borderBottom:`2px dashed ${C.border}`, display:'flex', alignItems:'center' }}>
              {/* meta */}
              <div style={{ position:'absolute', right:0, top:0, bottom:0, fontSize:18, display:'flex', alignItems:'center' }}>🏁</div>
              {/* líneas de velocidad */}
              {isLead && (
                <div style={{ position:'absolute', left:`${left-6}%`, top:'50%', transform:'translateY(-50%)',
                  display:'flex', flexDirection:'column', gap:4 }}>
                  {[0,1,2].map(k => (
                    <div key={k} style={{ width:18, height:3, borderRadius:2, background:C.amber,
                      animation:`g-speed .35s ${k*0.08}s infinite` }} />
                  ))}
                </div>
              )}
              {/* corredor */}
              <div style={{ position:'absolute', left:`${left}%`, transition:'left .05s linear',
                transformOrigin:'center bottom' }}>
                <div style={{ width:42, height:42, borderRadius:'50%', overflow:'hidden',
                  border:`3px solid ${winner===i ? C.amber : bet===i ? C.accent : C.teal}`,
                  boxShadow: bet===i ? `0 0 0 3px ${C.accent}33` : 'none',
                  animation: racing && winner===null ? 'g-run .25s infinite' : undefined }}>
                  <img src={r.foto} alt={r.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                </div>
                {winner===i && <div style={{ position:'absolute', top:-16, left:12, fontSize:18 }}>🏆</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Apuestas */}
      {!racing && (
        <>
          <div style={{ display:'flex', gap:10, marginBottom:16 }}>
            {RACERS.map(r => (
              <button key={r.id} onClick={() => setBet(r.id)} className="g-card" style={{
                flex:1, padding:'12px 6px', borderRadius:14, cursor:'pointer',
                background: bet===r.id ? C.accent+'18' : C.bgElevated,
                border:`2px solid ${bet===r.id ? C.accent : C.border}`,
                display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                <div style={{ width:40, height:40, borderRadius:'50%', overflow:'hidden', border:`2px solid ${C.border}` }}>
                  <img src={r.foto} alt={r.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                </div>
                <span style={{ fontFamily:F.body, fontSize:12, fontWeight:700, color: bet===r.id ? C.accent : C.text }}>{r.name}</span>
              </button>
            ))}
          </div>
          <button onClick={startRace} disabled={bet===null} style={{
            width:'100%', background: bet!==null ? `linear-gradient(135deg, ${C.accent}, ${C.amber})` : C.bgElevated,
            color: bet!==null ? '#fff' : C.textMuted, border:'none', borderRadius:14, padding:'14px',
            fontFamily:F.display, fontSize:15, fontWeight:800, cursor: bet!==null ? 'pointer' : 'not-allowed',
            opacity: bet!==null ? 1 : 0.6, transition:'all .2s' }}>
            {bet!==null ? '🏁 ¡Que empiece la carrera!' : 'Elige un corredor primero'}
          </button>
        </>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   8. SIMÓN DICE (memoria de secuencia animal) ── NUEVO
══════════════════════════════════════════════════════ */
const SIMON_PADS = [
  { emoji:'🐶', color:'#FF8C00' },
  { emoji:'🐱', color:'#2DD4BF' },
  { emoji:'🐰', color:'#F055A3' },
  { emoji:'🐦', color:'#4D96FF' },
]

function SimonGame({ onBack, onReplay }) {
  const { C } = useTheme()
  const { addCoins } = usePetCoins()
  const [seq,    setSeq]    = useState([])
  const [phase,  setPhase]  = useState('idle')   // idle|show|input|over
  const [active, setActive] = useState(-1)
  const [uIdx,   setUIdx]   = useState(0)
  const [round,  setRound]  = useState(0)
  const [coins,  setCoins]  = useState(0)
  const timers = useRef([])
  // Refs sincrónicas: los toques rápidos leen el valor actual, no el del closure.
  const seqRef   = useRef([])
  const uIdxRef  = useRef(0)
  const phaseRef = useRef('idle')

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  useEffect(() => () => clearTimers(), [])

  const goPhase = (p) => { phaseRef.current = p; setPhase(p) }

  const startRound = useCallback((prevSeq) => {
    const next = [...prevSeq, rand(0, 3)]
    seqRef.current = next; uIdxRef.current = 0
    setSeq(next); setRound(next.length); setUIdx(0); goPhase('show')
    clearTimers()
    next.forEach((pad, i) => {
      timers.current.push(setTimeout(() => setActive(pad), 600 * i + 400))
      timers.current.push(setTimeout(() => setActive(-1), 600 * i + 780))
    })
    timers.current.push(setTimeout(() => goPhase('input'), 600 * next.length + 480))
  }, [])

  const handlePad = (i) => {
    if (phaseRef.current !== 'input') return
    setActive(i); setTimeout(() => setActive(-1), 180)
    const s = seqRef.current
    const idx = uIdxRef.current
    if (i !== s[idx]) { goPhase('over'); return }
    if (idx + 1 === s.length) {
      goPhase('show')                       // bloquea más toques de inmediato
      addCoins(20); setCoins(c => c + 20)
      timers.current.push(setTimeout(() => startRound(s), 750))
    } else {
      uIdxRef.current = idx + 1
      setUIdx(idx + 1)
    }
  }

  if (phase === 'over') return <DoneScreen emoji="🧠" msg={`Llegaste a la ronda ${round}`} coins={coins} onBack={onBack} onReplay={onReplay} />

  return (
    <div style={{ padding:'0 0 24px', animation:'g-slideUp .3s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14, gap:8 }}>
        <StatChip label="Ronda" value={round || '—'} color={C.purple} />
        <StatChip label="Ganado" value={`${coins} 🪙`} color={C.amber} />
        <StatChip label="+20" value="por ronda" color={C.teal} />
      </div>

      <div style={{ textAlign:'center', fontFamily:F.body, fontSize:13, color:C.textSub, marginBottom:16,
        height:20, fontWeight:600 }}>
        {phase === 'idle'  && '👀 Memoriza la secuencia de animales'}
        {phase === 'show'  && '🔵 Observa con atención…'}
        {phase === 'input' && `✋ Repite la secuencia (${uIdx}/${seq.length})`}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, maxWidth:280, margin:'0 auto' }}>
        {SIMON_PADS.map((p, i) => (
          <button key={i} onClick={() => handlePad(i)} disabled={phase !== 'input'} style={{
            aspectRatio:'1', borderRadius:20, border:`3px solid ${p.color}`,
            background: active===i ? p.color : p.color+'22',
            fontSize:46, cursor: phase==='input' ? 'pointer' : 'default',
            transition:'background .12s', animation: active===i ? 'g-padFlash .3s ease' : undefined,
            boxShadow: active===i ? `0 0 24px ${p.color}` : 'none' }}>
            {p.emoji}
          </button>
        ))}
      </div>

      {phase === 'idle' && (
        <button onClick={() => startRound([])} style={{
          width:'100%', marginTop:20, background:`linear-gradient(135deg, ${C.purple}, ${C.blue})`,
          color:'#fff', border:'none', borderRadius:14, padding:'14px', fontFamily:F.display,
          fontSize:15, fontWeight:800, cursor:'pointer' }}>
          ▶️ ¡Empezar!
        </button>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   9. ATRAPA HUESOS (arcade de reflejos) ── NUEVO
══════════════════════════════════════════════════════ */
const CATCH_TIME = 30

function AtrapaGame({ onBack, onReplay }) {
  const { C } = useTheme()
  const { addCoins } = usePetCoins()
  const [phase, setPhase]   = useState('idle')   // idle|playing|over
  const [basket, setBasket] = useState(50)        // % horizontal
  const [items, setItems]   = useState([])        // {id,x,y,type}
  const [score, setScore]   = useState(0)
  const [time,  setTime]    = useState(CATCH_TIME)
  const [pop,   setPop]     = useState(null)       // {x,y,color,k}
  const loop = useRef(null), spawn = useRef(null), clock = useRef(null)
  const nextId = useRef(0)
  const itemsRef = useRef([])
  const AREA_H = 320, CATCH_Y = 268

  const stopAll = () => { clearInterval(loop.current); clearInterval(spawn.current); clearInterval(clock.current) }
  useEffect(() => () => stopAll(), [])

  const basketRef = useRef(50); basketRef.current = basket
  const timeRef   = useRef(CATCH_TIME); timeRef.current = time

  const start = () => {
    setPhase('playing'); setScore(0); setTime(CATCH_TIME); setItems([]); itemsRef.current = []; nextId.current = 0

    // caída + colisión (itemsRef es la fuente de verdad → sin efectos en updaters)
    loop.current = setInterval(() => {
      const basketX = basketRef.current
      let gained = 0, lost = 0, popData = null
      const out = []
      for (const it of itemsRef.current) {
        const y = it.y + it.speed
        if (y >= CATCH_Y && y <= CATCH_Y + 40 && Math.abs(it.x - basketX) <= 13) {
          if (it.type === 'bone') { gained++; popData = { x: it.x, y: 86, color: C.amber, k: nextId.current++ } }
          else                    { lost++;   popData = { x: it.x, y: 86, color: C.red,   k: nextId.current++ } }
          continue // atrapado → desaparece
        }
        if (y < AREA_H + 30) out.push({ ...it, y })
      }
      itemsRef.current = out
      setItems(out)
      if (gained) { setScore(s => s + gained); addCoins(gained * 5) }
      if (lost)    setScore(s => Math.max(0, s - lost * 2))
      if (popData) setPop(popData)
    }, 40)

    // generador
    spawn.current = setInterval(() => {
      const item = { id: nextId.current++, x: rand(8, 92), y: -20,
        type: Math.random() < 0.78 ? 'bone' : 'bomb',
        speed: 4 + Math.random()*3 + (CATCH_TIME - timeRef.current) * 0.12 }
      itemsRef.current = [...itemsRef.current, item]
      setItems(itemsRef.current)
    }, 750)

    // reloj
    clock.current = setInterval(() => {
      setTime(t => {
        if (t <= 1) { stopAll(); setPhase('over'); return 0 }
        return t - 1
      })
    }, 1000)
  }

  const move = (e) => {
    if (phase !== 'playing') return
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    setBasket(Math.max(6, Math.min(94, (cx / rect.width) * 100)))
  }

  if (phase === 'over') return <DoneScreen emoji="🦴" msg={`Atrapaste ${score} huesos`} coins={score*5} onBack={onBack} onReplay={onReplay} />

  return (
    <div style={{ padding:'0 0 24px', animation:'g-slideUp .3s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12, gap:8 }}>
        <StatChip label="Huesos" value={score} color={C.amber} />
        <StatChip label="Tiempo" value={`${time}s`} color={time<=5 ? C.red : C.teal} />
        <StatChip label="+5" value="por hueso" color={C.accent} />
      </div>

      <div onPointerMove={move} onTouchMove={move}
        style={{ position:'relative', height:AREA_H, borderRadius:20, overflow:'hidden', touchAction:'none',
          background:`linear-gradient(180deg, ${C.blueDim}, ${C.bgElevated})`, border:`2px solid ${C.border}`,
          cursor: phase==='playing' ? 'none' : 'default' }}>

        {phase === 'idle' && (
          <Centered>
            <div style={{ textAlign:'center', padding:'0 20px' }}>
              <div style={{ fontSize:48, animation:'g-float 1.6s infinite' }}>🦴</div>
              <div style={{ fontFamily:F.body, fontSize:13, color:C.textSub, margin:'10px 0 16px', lineHeight:1.5 }}>
                Mueve el dedo para atrapar 🦴 huesos.<br/>¡Esquiva las 💣 bombas!
              </div>
              <button onClick={start} style={{ background:`linear-gradient(135deg, ${C.accent}, ${C.amber})`,
                color:'#fff', border:'none', borderRadius:14, padding:'12px 26px', fontFamily:F.display,
                fontSize:15, fontWeight:800, cursor:'pointer' }}>▶️ ¡Jugar!</button>
            </div>
          </Centered>
        )}

        {/* items cayendo */}
        {items.map(it => (
          <div key={it.id} style={{ position:'absolute', left:`${it.x}%`, top:it.y,
            transform:'translateX(-50%)', fontSize:30, userSelect:'none', pointerEvents:'none' }}>
            {it.type === 'bone' ? '🦴' : '💣'}
          </div>
        ))}

        {/* explosión al atrapar */}
        {pop && <Burst key={pop.k} x={pop.x} y={pop.y} color={pop.color} />}

        {/* canasta / perro */}
        {phase === 'playing' && (
          <div style={{ position:'absolute', left:`${basket}%`, bottom:8, transform:'translateX(-50%)',
            fontSize:44, filter:'drop-shadow(0 2px 4px rgba(0,0,0,.3))', pointerEvents:'none' }}>🧺</div>
        )}
      </div>
      {phase === 'playing' && (
        <div style={{ fontFamily:F.body, fontSize:12, color:C.textMuted, textAlign:'center', marginTop:10 }}>
          Desliza el dedo para mover la canasta 🧺
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   SHARED UI
══════════════════════════════════════════════════════ */
function Centered({ children }) {
  return <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>{children}</div>
}

function StatChip({ label, value, color }) {
  const { C } = useTheme()
  return (
    <div style={{ flex:1, background:C.bgElevated, borderRadius:12, padding:'7px 4px', textAlign:'center',
      border:`1px solid ${C.border}` }}>
      <div style={{ fontFamily:F.display, fontWeight:800, fontSize:15, color }}>{value}</div>
      <div style={{ fontFamily:F.body, fontSize:9, color:C.textMuted, marginTop:1, textTransform:'uppercase', letterSpacing:.3 }}>{label}</div>
    </div>
  )
}

function AnswerBtn({ label, idx, correct, selected, onPress }) {
  const { C } = useTheme()
  let bg = C.bgElevated, border = `1px solid ${C.border}`, color = C.text
  if (selected !== null) {
    if (idx === correct)                             { bg=C.teal+'22'; border=`2px solid ${C.teal}`; color=C.teal }
    else if (idx === selected && selected!==correct) { bg=C.red+'18';  border=`2px solid ${C.red}`;  color=C.red  }
  }
  return (
    <button onClick={onPress} className="g-tap" style={{ width:'100%', marginBottom:9, padding:'13px 16px',
      textAlign:'left', background:bg, border, borderRadius:12, fontFamily:F.body,
      fontSize:13, fontWeight: selected===idx ? 700 : 500, color, cursor:'pointer', transition:'all 0.2s' }}>
      {selected!==null && idx===correct && '✓ '}
      {selected!==null && idx===selected && selected!==correct && '✕ '}
      {label}
    </button>
  )
}

function ProgressBar({ pct, color }) {
  const { C } = useTheme()
  return (
    <div style={{ height:6, background:C.bgElevated, borderRadius:3, overflow:'hidden', marginBottom:16 }}>
      <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg, ${color}, ${color}aa)`,
        borderRadius:3, transition:'width 0.4s' }} />
    </div>
  )
}

const CONFETTI_COLORS = ['#FF8C00','#FFB547','#2DD4BF','#F055A3','#4D96FF','#9B6EF5']
function DoneScreen({ emoji, msg, coins, onBack, onReplay }) {
  const { C } = useTheme()
  return (
    <div style={{ position:'relative', textAlign:'center', padding:'32px 24px', overflow:'hidden', animation:'g-slideUp .35s ease' }}>
      {/* confeti */}
      {coins > 0 && Array.from({ length: 16 }).map((_, i) => (
        <span key={i} style={{ position:'absolute', top:0, left:`${rand(4,96)}%`, width:8, height:12, borderRadius:2,
          background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          animation:`g-confetti ${1.4 + Math.random()}s ${Math.random()*0.5}s ease-in forwards` }} />
      ))}
      <div style={{ fontSize:64, animation:'g-popIn .5s ease' }}>{emoji}</div>
      <div style={{ fontFamily:F.display, fontWeight:800, fontSize:22, color:C.text, marginTop:12 }}>
        {coins > 0 ? '¡Lo lograste!' : '¡Fin del juego!'}
      </div>
      <div style={{ fontFamily:F.body, fontSize:14, color:C.textSub, marginTop:8, lineHeight:1.5 }}>{msg}</div>
      {coins > 0 && (
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:14,
          background:`linear-gradient(135deg, ${C.accent}, ${C.amber})`, color:'#fff',
          borderRadius:24, padding:'8px 20px', fontFamily:F.display, fontWeight:800, fontSize:20,
          boxShadow:'0 6px 20px rgba(255,140,0,.4)' }}>
          +{coins} <span style={{ fontSize:22 }}>🪙</span>
        </div>
      )}
      <div style={{ display:'flex', gap:10, marginTop:26, justifyContent:'center' }}>
        {onReplay && (
          <button onClick={onReplay} style={{ background:C.bgElevated, color:C.text, border:`1.5px solid ${C.border}`,
            borderRadius:14, padding:'13px 22px', fontFamily:F.display, fontSize:14, fontWeight:700, cursor:'pointer' }}>
            🔄 Otra vez
          </button>
        )}
        <button onClick={onBack} style={{ background:'#FF8C00', color:'#fff', border:'none',
          borderRadius:14, padding:'13px 28px', fontFamily:F.display, fontSize:14, fontWeight:700, cursor:'pointer' }}>
          Volver →
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   GAMES SCREEN PRINCIPAL
══════════════════════════════════════════════════════ */
const GAMES_LIST = [
  { id:'trivia',   emoji:'🧠', title:'Trivia',             desc:'6 preguntas de animales',      coins:'+50🪙/correcta',     color:'#FF8C00', Comp:TriviaGame },
  { id:'razas',    emoji:'🦮', title:'Adivina la Raza',    desc:'Identifica razas por foto',    coins:'+30🪙/correcta',     color:'#2DD4BF', Comp:RazasGame },
  { id:'memoria',  emoji:'🧩', title:'Memoria 4×4',        desc:'Encuentra los 8 pares',        coins:'+120🪙 al completar', color:'#9B6EF5', Comp:MemoriaGame },
  { id:'reaccion', emoji:'⚡', title:'Reacción Rápida',    desc:'¡Toca antes que escape!',      coins:'+25🪙/acierto',      color:'#FFB547', Comp:ReaccionGame },
  { id:'colorea',  emoji:'🎨', title:'Colorea la Mascota', desc:'Pinta un perro o gato',        coins:'+70🪙 al terminar',  color:'#F055A3', Comp:ColorearGame },
  { id:'ahorcado', emoji:'📝', title:'Ahorcado de Razas',  desc:'Adivina con pistas',           coins:'+60🪙 al acertar',   color:'#4A9EFF', Comp:AhorcadoGame },
  { id:'carrera',  emoji:'🏁', title:'Carrera de Mascotas', desc:'Apuesta y gana la carrera',   coins:'+100🪙 si ganas',    color:'#2DD4BF', Comp:CarreraGame },
  { id:'simon',    emoji:'🎵', title:'Simón Dice',         desc:'Repite la secuencia animal',   coins:'+20🪙/ronda',        color:'#9B6EF5', Comp:SimonGame },
  { id:'atrapa',   emoji:'🦴', title:'Atrapa Huesos',      desc:'Atrapa y esquiva bombas',      coins:'+5🪙/hueso',         color:'#FFB547', Comp:AtrapaGame },
]

export default function GamesScreen({ onClose }) {
  const { C } = useTheme()
  const [game, setGame]     = useState(null)
  const [replay, setReplay] = useState(0)

  const currentGame = GAMES_LIST.find(g => g.id === game)
  const Comp = currentGame?.Comp

  return (
    <div style={{ position:'fixed', inset:0, zIndex:260, background:C.bg, overflowY:'auto', maxWidth:'var(--app-max)', margin:'0 auto' }}>
      <GameStyles />
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'18px 18px 14px',
        background:C.bg, borderBottom:`1px solid ${C.border}`, position:'sticky', top:0, zIndex:10 }}>
        <button onClick={game ? () => setGame(null) : onClose} style={{ background:C.bgElevated,
          border:`1px solid ${C.border}`, borderRadius:10, width:34, height:34,
          display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:16, color:C.text }}>←</button>
        <span style={{ fontFamily:F.display, fontWeight:800, fontSize:18, color:C.text }}>
          {currentGame ? `${currentGame.emoji} ${currentGame.title}` : 'Juegos 🎮'}
        </span>
        {currentGame && (
          <div style={{ marginLeft:'auto', background:'#FF8C0022', borderRadius:10, padding:'3px 10px' }}>
            <span style={{ fontFamily:F.body, fontSize:11, fontWeight:600, color:'#FF8C00' }}>{currentGame.coins}</span>
          </div>
        )}
      </div>

      <div style={{ padding:'16px 18px 48px' }}>
        {!game && (
          <>
            <div style={{ fontFamily:F.body, fontSize:13, color:C.textSub, textAlign:'center',
              marginBottom:18, lineHeight:1.5 }}>
              Juega y gana 🪙 PetCoins para desbloquear recompensas
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:11 }}>
              {GAMES_LIST.map((g, i) => (
                <div key={g.id} onClick={() => { setReplay(0); setGame(g.id) }} className="g-card" style={{
                  background:C.bgCard, borderRadius:18, padding:'16px', cursor:'pointer',
                  border:`1px solid ${C.border}`, borderTop:`3px solid ${g.color}`,
                  animation:`g-slideUp .35s ${i*0.04}s ease both` }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>{g.emoji}</div>
                  <div style={{ fontFamily:F.display, fontWeight:700, fontSize:14, color:C.text, marginBottom:4 }}>{g.title}</div>
                  <div style={{ fontFamily:F.body, fontSize:11, color:C.textSub, marginBottom:8, lineHeight:1.4 }}>{g.desc}</div>
                  <div style={{ fontFamily:F.body, fontSize:11, fontWeight:700, color:g.color }}>{g.coins}</div>
                </div>
              ))}
            </div>
          </>
        )}
        {game && Comp && (
          <Comp key={`${game}-${replay}`} onBack={() => setGame(null)} onReplay={() => setReplay(r => r + 1)} />
        )}
      </div>
    </div>
  )
}
