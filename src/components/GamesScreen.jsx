import { useState, useEffect, useCallback } from 'react'
import { useTheme, F } from '../lib/theme'
import { usePetCoins } from '../lib/petcoins.jsx'

/* ── Utils ── */
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5)
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

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

function TriviaGame({ onBack }) {
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

  if (done) return <DoneScreen emoji="🧠" msg={`Acertaste ${score} de ${TRIVIA.length}`} coins={score*50} onBack={onBack} />
  return (
    <div style={{ padding:'0 0 24px' }}>
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

function RazasGame({ onBack }) {
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

  if (done) return <DoneScreen emoji="🦮" msg={`Acertaste ${score} de ${RAZAS.length}`} coins={score*30} onBack={onBack} />
  return (
    <div style={{ padding:'0 0 24px' }}>
      <ProgressBar pct={((rIdx)/RAZAS.length)*100} color={C.teal} />
      <div style={{ fontFamily:F.body, fontSize:12, color:C.textMuted, textAlign:'center', marginBottom:12 }}>
        Foto {rIdx+1}/{RAZAS.length} · +30 🪙 correcta
      </div>
      <div style={{ fontFamily:F.display, fontWeight:700, fontSize:16, color:C.text, marginBottom:12, textAlign:'center' }}>
        ¿Qué raza es esta mascota?
      </div>
      <div style={{ height:190, borderRadius:18, overflow:'hidden', marginBottom:18 }}>
        <img src={r.foto} alt="mascota" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center 20%' }} />
      </div>
      {r.opts.map((opt, i) => (
        <AnswerBtn key={i} label={opt} idx={i} correct={r.c} selected={selected} onPress={() => handleAnswer(i)} />
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   3. MEMORIA (Memory Match)
══════════════════════════════════════════════════════ */
const MEM_EMOJIS = ['🐕','🐈','🐰','🦜','🐟','🐹']

function makeCards() {
  return shuffle([...MEM_EMOJIS, ...MEM_EMOJIS].map((e, i) => ({ id:i, emoji:e, flipped:false, matched:false })))
}

function MemoriaGame({ onBack }) {
  const { C } = useTheme()
  const { addCoins } = usePetCoins()
  const [cards,     setCards]     = useState(makeCards)
  const [flippedIds, setFlippedIds] = useState([])
  const [matches,   setMatches]   = useState(0)
  const [moves,     setMoves]     = useState(0)
  const [lock,      setLock]      = useState(false)
  const [done,      setDone]      = useState(false)

  const handleFlip = (id) => {
    if (lock) return
    const card = cards.find(c => c.id === id)
    if (card.flipped || card.matched) return
    const newFlipped = [...flippedIds, id]
    setCards(cs => cs.map(c => c.id === id ? { ...c, flipped:true } : c))
    if (newFlipped.length < 2) { setFlippedIds(newFlipped); return }

    setMoves(m => m + 1)
    setLock(true)
    const [idA, idB] = newFlipped
    const a = cards.find(c => c.id === idA)
    const b = cards.find(c => c.id === id)

    if (a.emoji === b.emoji) {
      setTimeout(() => {
        setCards(cs => cs.map(c => newFlipped.includes(c.id) ? { ...c, matched:true } : c))
        setMatches(m => {
          const next = m + 1
          if (next === MEM_EMOJIS.length) { addCoins(40); setDone(true) }
          return next
        })
        setFlippedIds([]); setLock(false)
      }, 500)
    } else {
      setTimeout(() => {
        setCards(cs => cs.map(c => newFlipped.includes(c.id) ? { ...c, flipped:false } : c))
        setFlippedIds([]); setLock(false)
      }, 900)
    }
  }

  if (done) return <DoneScreen emoji="🧩" msg={`¡${matches} pares en ${moves} intentos!`} coins={40} onBack={onBack} />

  return (
    <div style={{ padding:'0 0 24px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14,
        fontFamily:F.body, fontSize:12, color:C.textMuted }}>
        <span>Pares: {matches}/{MEM_EMOJIS.length}</span>
        <span>Intentos: {moves}</span>
        <span>+40 🪙 al completar</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
        {cards.map(card => (
          <button key={card.id} onClick={() => handleFlip(card.id)} style={{
            height:72, borderRadius:14, border:`2px solid ${card.matched ? C.teal+'66' : C.border}`,
            background: card.matched ? C.teal+'18' : card.flipped ? C.bgCard : C.bgElevated,
            fontSize:28, cursor: card.matched ? 'default' : 'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'all 0.2s', transform: card.flipped || card.matched ? 'rotateY(0deg)' : 'rotateY(180deg)',
          }}>
            {(card.flipped || card.matched) ? card.emoji : '❓'}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   4. REACCIÓN RÁPIDA
══════════════════════════════════════════════════════ */
const REACT_EMOJIS = ['🐕','🐈','🐰','🦜','🐟','🐹','🦊','🐺']
const TOTAL_ROUNDS = 10

function ReaccionGame({ onBack }) {
  const { C } = useTheme()
  const { addCoins } = usePetCoins()
  const [phase,  setPhase]  = useState('waiting') // waiting|active|feedback
  const [round,  setRound]  = useState(1)
  const [score,  setScore]  = useState(0)
  const [done,   setDone]   = useState(false)
  const [hit,    setHit]    = useState(false)
  const [pos,    setPos]    = useState({ x:40, y:35 })
  const [emoji,  setEmoji]  = useState('🐕')

  // Fase waiting → activa después de delay aleatorio
  useEffect(() => {
    if (phase !== 'waiting') return
    const t = setTimeout(() => {
      setPos({ x: rand(10,70), y: rand(15,65) })
      setEmoji(REACT_EMOJIS[rand(0, REACT_EMOJIS.length-1)])
      setPhase('active')
    }, rand(600, 1400))
    return () => clearTimeout(t)
  }, [phase, round])

  // Fase activa → auto-miss después de 1.5s
  useEffect(() => {
    if (phase !== 'active') return
    const t = setTimeout(() => { setHit(false); setPhase('feedback') }, 1500)
    return () => clearTimeout(t)
  }, [phase])

  // Fase feedback → siguiente ronda después de 700ms
  useEffect(() => {
    if (phase !== 'feedback') return
    const t = setTimeout(() => {
      if (round >= TOTAL_ROUNDS) setDone(true)
      else { setRound(r => r + 1); setPhase('waiting') }
    }, 700)
    return () => clearTimeout(t)
  }, [phase, round])

  const handleTap = () => {
    if (phase !== 'active') return
    setHit(true); setScore(s => s + 1); addCoins(20); setPhase('feedback')
  }

  if (done) return <DoneScreen emoji="⚡" msg={`Atrapaste ${score} de ${TOTAL_ROUNDS}`} coins={score*20} onBack={onBack} />

  return (
    <div style={{ padding:'0 0 24px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14,
        fontFamily:F.body, fontSize:12, color:C.textMuted }}>
        <span>Ronda {round}/{TOTAL_ROUNDS}</span>
        <span>Atrapados: {score} · +20 🪙 c/u</span>
      </div>
      <ProgressBar pct={(round/TOTAL_ROUNDS)*100} color={C.accent} />

      {/* Área de juego */}
      <div onClick={handleTap} style={{ position:'relative', height:260, background:C.bgElevated,
        borderRadius:18, overflow:'hidden', marginTop:12, cursor:'pointer',
        border:`2px solid ${phase==='feedback' ? (hit ? C.teal : C.red)+'66' : C.border}`,
        transition:'border-color 0.3s',
      }}>
        {phase === 'waiting' && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
            justifyContent:'center', fontFamily:F.body, fontSize:13, color:C.textMuted }}>
            ¡Prepárate…
          </div>
        )}
        {phase === 'active' && (
          <div style={{ position:'absolute', left:`${pos.x}%`, top:`${pos.y}%`,
            transform:'translate(-50%,-50%)', fontSize:48, cursor:'pointer',
            transition:'none', userSelect:'none' }}>
            {emoji}
          </div>
        )}
        {phase === 'feedback' && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
            justifyContent:'center', flexDirection:'column', gap:6 }}>
            <div style={{ fontSize:48 }}>{hit ? '✅' : '❌'}</div>
            <div style={{ fontFamily:F.display, fontWeight:700, fontSize:16,
              color: hit ? C.teal : C.red }}>
              {hit ? '+20 🪙' : 'Fallaste'}
            </div>
          </div>
        )}
      </div>
      <div style={{ fontFamily:F.body, fontSize:12, color:C.textMuted, textAlign:'center', marginTop:10 }}>
        {phase === 'active' ? '¡Toca la mascota!' : 'Toca el área cuando aparezca'}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   5. COLOREA LA MASCOTA
══════════════════════════════════════════════════════ */
const COLOR_PARTS = [
  { id:'bg',     label:'🖼 Fondo'  },
  { id:'body',   label:'🐾 Pelaje' },
  { id:'head',   label:'😀 Cara'   },
  { id:'collar', label:'🎀 Collar' },
  { id:'paws',   label:'🐾 Patas'  },
  { id:'eyes',   label:'👀 Ojos'   },
]
const PALETTE = ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#C77DFF','#FF9F45','#00C9B1','#FF85A2','#1B3A6B','#FF8C00']
const DEFAULT_COLOR = '#D0D0D0'

function ColorearGame({ onBack }) {
  const { C } = useTheme()
  const { addCoins } = usePetCoins()
  const [colors,  setColors]  = useState(() => Object.fromEntries(COLOR_PARTS.map(p => [p.id, DEFAULT_COLOR])))
  const [selectedPart, setSelectedPart] = useState('body')
  const [done, setDone] = useState(false)

  const colorCount = Object.values(colors).filter(c => c !== DEFAULT_COLOR).length
  const canFinish  = colorCount >= 4

  const handleFinish = () => { addCoins(60); setDone(true) }

  if (done) return <DoneScreen emoji="🎨" msg="¡Obra maestra terminada!" coins={60} onBack={onBack} />

  return (
    <div style={{ padding:'0 0 24px' }}>
      <div style={{ fontFamily:F.body, fontSize:12, color:C.textMuted, textAlign:'center', marginBottom:14 }}>
        Colorea al menos 4 partes · +60 🪙 al terminar
      </div>

      {/* Mascota visual */}
      <div style={{ background:colors.bg, borderRadius:20, height:160, marginBottom:16,
        display:'flex', alignItems:'center', justifyContent:'center', position:'relative',
        border:`2px solid ${C.border}`, transition:'background 0.3s' }}>
        <div style={{ fontSize:80, filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}>🐕</div>
        {/* Badge de color actual */}
        <div style={{ position:'absolute', bottom:8, right:12, display:'flex', gap:6 }}>
          {COLOR_PARTS.map(p => (
            <div key={p.id} style={{ width:14, height:14, borderRadius:'50%', background:colors[p.id],
              border:`2px solid ${p.id===selectedPart ? '#333' : 'transparent'}`,
              transition:'all 0.2s', cursor:'pointer' }}
              onClick={() => setSelectedPart(p.id)} />
          ))}
        </div>
      </div>

      {/* Selector de parte */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
        {COLOR_PARTS.map(p => (
          <button key={p.id} onClick={() => setSelectedPart(p.id)} style={{
            borderRadius:20, padding:'5px 11px', cursor:'pointer',
            border:`1.5px solid ${selectedPart===p.id ? C.accent : C.border}`,
            background: colors[p.id] !== DEFAULT_COLOR ? colors[p.id]+'33' : C.bgElevated,
            fontFamily:F.body, fontSize:11, fontWeight:600,
            color: selectedPart===p.id ? C.accent : C.text, transition:'all 0.15s',
          }}>{p.label}</button>
        ))}
      </div>

      {/* Paleta de colores */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20, justifyContent:'center' }}>
        {PALETTE.map(col => (
          <button key={col} onClick={() => setColors(c => ({ ...c, [selectedPart]: col }))} style={{
            width:34, height:34, borderRadius:'50%', background:col, border:'none', cursor:'pointer',
            border: colors[selectedPart]===col ? '3px solid #333' : '2px solid transparent',
            transition:'transform 0.1s', transform: colors[selectedPart]===col ? 'scale(1.2)' : 'scale(1)',
          }} />
        ))}
        <button onClick={() => setColors(c => ({ ...c, [selectedPart]: DEFAULT_COLOR }))} style={{
          width:34, height:34, borderRadius:'50%', background:DEFAULT_COLOR,
          border:'2px solid #aaa', cursor:'pointer', fontSize:13 }}>↩</button>
      </div>

      <div style={{ fontFamily:F.body, fontSize:12, color:C.textMuted, textAlign:'center', marginBottom:12 }}>
        {colorCount}/6 partes coloreadas
      </div>
      <button onClick={handleFinish} disabled={!canFinish} style={{
        width:'100%', background: canFinish ? C.accent : C.bgElevated,
        color: canFinish ? C.bg : C.textMuted, border:'none', borderRadius:14,
        padding:'13px', fontFamily:F.display, fontSize:14, fontWeight:700,
        cursor: canFinish ? 'pointer' : 'not-allowed', opacity: canFinish ? 1 : 0.5,
        transition:'all 0.2s',
      }}>
        {canFinish ? '🎨 ¡Terminar y cobrar! (+60 🪙)' : `Colorea ${4-colorCount} parte${4-colorCount!==1?'s':''} más`}
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   6. AHORCADO DE RAZAS
══════════════════════════════════════════════════════ */
const BREEDS_HANGMAN = ['LABRADOR','BEAGLE','HUSKY','COCKER','DALMATA','CHIHUAHUA','DACHSHUND','POODLE']
const HANGMAN_FACES = ['😊','😐','😟','😰','😱','💀']

function AhorcadoGame({ onBack }) {
  const { C } = useTheme()
  const { addCoins } = usePetCoins()
  const [breed]   = useState(() => BREEDS_HANGMAN[rand(0, BREEDS_HANGMAN.length-1)])
  const [guessed, setGuessed] = useState(new Set())
  const [wrong,   setWrong]   = useState(0)
  const [result,  setResult]  = useState(null) // null | 'won' | 'lost'

  const MAX_WRONG = 5
  const uniqueLetters = [...new Set(breed.split(''))]
  const revealedAll  = uniqueLetters.every(l => guessed.has(l))

  const handleLetter = (letter) => {
    if (guessed.has(letter) || result) return
    const ng = new Set([...guessed, letter])
    setGuessed(ng)
    if (!breed.includes(letter)) {
      const nw = wrong + 1
      setWrong(nw)
      if (nw >= MAX_WRONG) setResult('lost')
    } else if (uniqueLetters.every(l => ng.has(l))) {
      setResult('won'); addCoins(50)
    }
  }

  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

  if (result) return (
    <DoneScreen
      emoji={result==='won' ? '🎉' : '💀'}
      msg={result==='won' ? `¡Correcto! La raza era ${breed}` : `Era: ${breed}`}
      coins={result==='won' ? 50 : 0}
      onBack={onBack}
    />
  )

  return (
    <div style={{ padding:'0 0 24px' }}>
      {/* Cara del ahorcado */}
      <div style={{ textAlign:'center', marginBottom:16 }}>
        <div style={{ fontSize:52 }}>{HANGMAN_FACES[Math.min(wrong, HANGMAN_FACES.length-1)]}</div>
        <div style={{ fontFamily:F.body, fontSize:12, color:C.textMuted, marginTop:6 }}>
          Errores: {wrong}/{MAX_WRONG} · +50 🪙 si aciertas
        </div>
        {/* Vidas */}
        <div style={{ display:'flex', justifyContent:'center', gap:4, marginTop:8 }}>
          {Array.from({ length: MAX_WRONG }).map((_, i) => (
            <div key={i} style={{ width:12, height:12, borderRadius:'50%',
              background: i < wrong ? C.red : C.bgElevated,
              border:`1px solid ${i < wrong ? C.red : C.border}`,
              transition:'all 0.3s' }} />
          ))}
        </div>
      </div>

      {/* Palabra */}
      <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap', marginBottom:24 }}>
        {breed.split('').map((letter, i) => (
          <div key={i} style={{ textAlign:'center', minWidth:24 }}>
            <div style={{ fontFamily:F.display, fontWeight:800, fontSize:22, color:C.text, height:28 }}>
              {guessed.has(letter) ? letter : ' '}
            </div>
            <div style={{ height:2, background:C.text, borderRadius:1, marginTop:2 }} />
          </div>
        ))}
      </div>

      {/* Letras */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center' }}>
        {LETTERS.map(l => {
          const used = guessed.has(l)
          const correct = used && breed.includes(l)
          const wrong_l  = used && !breed.includes(l)
          return (
            <button key={l} onClick={() => handleLetter(l)} disabled={used} style={{
              width:32, height:32, borderRadius:8, fontFamily:F.display,
              fontSize:12, fontWeight:700, cursor: used ? 'default' : 'pointer',
              background: correct ? C.teal+'22' : wrong_l ? C.red+'18' : C.bgElevated,
              border:`1.5px solid ${correct ? C.teal : wrong_l ? C.red : C.border}`,
              color: correct ? C.teal : wrong_l ? C.red : C.text,
              opacity: used ? 0.5 : 1, transition:'all 0.15s',
            }}>{l}</button>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   7. CARRERA DE MASCOTAS
══════════════════════════════════════════════════════ */
const RACERS = [
  { id:0, emoji:'🐕', name:'Perro'  },
  { id:1, emoji:'🐈', name:'Gato'   },
  { id:2, emoji:'🐰', name:'Conejo' },
]

function CarreraGame({ onBack }) {
  const { C } = useTheme()
  const { addCoins } = usePetCoins()
  const [bet,     setBet]     = useState(null)
  const [racing,  setRacing]  = useState(false)
  const [progress,setProgress]= useState([0,0,0])
  const [winner,  setWinner]  = useState(null)
  const [done,    setDone]    = useState(false)

  const startRace = useCallback(() => {
    if (bet === null) return
    setRacing(true)
    const speeds = [0.8 + Math.random()*1.8, 0.8 + Math.random()*1.8, 0.8 + Math.random()*1.8]
    let pos = [0,0,0]
    const iv = setInterval(() => {
      pos = pos.map((p,i) => Math.min(100, p + speeds[i]))
      setProgress([...pos])
      const fin = pos.findIndex(p => p >= 100)
      if (fin !== -1) {
        clearInterval(iv)
        setWinner(fin)
        if (fin === bet) addCoins(80)
        setTimeout(() => setDone(true), 800)
      }
    }, 50)
  }, [bet, addCoins])

  if (done) return (
    <DoneScreen
      emoji={winner === bet ? '🏆' : '😢'}
      msg={winner === bet ? `¡${RACERS[winner].emoji} ganó! Apostaste bien` : `${RACERS[winner].emoji} ganó. Mejor suerte la próxima`}
      coins={winner === bet ? 80 : 0}
      onBack={onBack}
    />
  )

  return (
    <div style={{ padding:'0 0 24px' }}>
      <div style={{ fontFamily:F.body, fontSize:12, color:C.textMuted, textAlign:'center', marginBottom:16 }}>
        {racing ? '¡En carrera!' : '¿A cuál apostas? · +80 🪙 si aciertas'}
      </div>

      {/* Pista */}
      <div style={{ background:C.bgElevated, borderRadius:16, padding:'16px', marginBottom:20 }}>
        {RACERS.map((r, i) => (
          <div key={r.id} style={{ marginBottom: i < RACERS.length-1 ? 14 : 0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
              <span style={{ fontSize:20, flexShrink:0 }}>{r.emoji}</span>
              <div style={{ flex:1, height:14, background:C.bgCard, borderRadius:7, overflow:'hidden',
                border:`1px solid ${winner===i ? C.amber : C.border}` }}>
                <div style={{ height:'100%', width:`${progress[i]}%`,
                  background: winner===i ? C.amber : bet===i ? C.accent : C.teal,
                  borderRadius:7, transition:'width 0.05s linear' }} />
              </div>
              {winner === i && <span style={{ fontSize:16 }}>🏆</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Apuestas */}
      {!racing && (
        <div style={{ display:'flex', gap:10, marginBottom:16 }}>
          {RACERS.map(r => (
            <button key={r.id} onClick={() => setBet(r.id)} style={{
              flex:1, padding:'14px 0', borderRadius:14, cursor:'pointer',
              background: bet===r.id ? C.accent+'22' : C.bgElevated,
              border:`1.5px solid ${bet===r.id ? C.accent : C.border}`,
              fontFamily:F.body, fontSize:13, fontWeight:700, transition:'all 0.15s',
              color: bet===r.id ? C.accent : C.text,
            }}>
              {r.emoji}<br/>{r.name}
            </button>
          ))}
        </div>
      )}

      {!racing && (
        <button onClick={startRace} disabled={bet===null} style={{
          width:'100%', background: bet!==null ? C.accent : C.bgElevated,
          color: bet!==null ? C.bg : C.textMuted, border:'none', borderRadius:14,
          padding:'14px', fontFamily:F.display, fontSize:15, fontWeight:700,
          cursor: bet!==null ? 'pointer' : 'not-allowed', opacity: bet!==null ? 1 : 0.5,
          transition:'all 0.2s',
        }}>
          {bet!==null ? '🏁 ¡Correr!' : 'Elige primero'}
        </button>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   SHARED UI
══════════════════════════════════════════════════════ */
function AnswerBtn({ label, idx, correct, selected, onPress }) {
  const { C } = useTheme()
  let bg = C.bgElevated, border = `1px solid ${C.border}`, color = C.text
  if (selected !== null) {
    if (idx === correct)                         { bg=C.teal+'22'; border=`2px solid ${C.teal}`; color=C.teal }
    else if (idx === selected && selected!==correct) { bg=C.red+'18'; border=`2px solid ${C.red}`;  color=C.red  }
  }
  return (
    <button onClick={onPress} style={{ width:'100%', marginBottom:9, padding:'13px 16px',
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
    <div style={{ height:4, background:C.bgElevated, borderRadius:2, overflow:'hidden', marginBottom:16 }}>
      <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:2, transition:'width 0.4s' }} />
    </div>
  )
}

function DoneScreen({ emoji, msg, coins, onBack }) {
  const { C } = useTheme()
  return (
    <div style={{ textAlign:'center', padding:'32px 24px' }}>
      <div style={{ fontSize:60 }}>{emoji}</div>
      <div style={{ fontFamily:F.display, fontWeight:800, fontSize:22, color:C.text, marginTop:12 }}>¡Terminaste!</div>
      <div style={{ fontFamily:F.body, fontSize:14, color:C.textSub, marginTop:8, lineHeight:1.5 }}>{msg}</div>
      {coins > 0 && (
        <div style={{ fontFamily:F.display, fontWeight:700, fontSize:20, color:'#FF8C00', marginTop:8 }}>
          +{coins} 🪙
        </div>
      )}
      <button onClick={onBack} style={{ marginTop:24, background:'#FF8C00', color:'#fff',
        border:'none', borderRadius:14, padding:'13px 28px', fontFamily:F.display,
        fontSize:15, fontWeight:700, cursor:'pointer' }}>
        Volver →
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   GAMES SCREEN PRINCIPAL
══════════════════════════════════════════════════════ */
const GAMES_LIST = [
  { id:'trivia',   emoji:'🧠', title:'Trivia',           desc:'6 preguntas de animales',       coins:'+50🪙/correcta', color:'#FF8C00' },
  { id:'razas',    emoji:'🦮', title:'Adivina la Raza',  desc:'Identifica razas por foto',     coins:'+30🪙/correcta', color:'#2DD4BF' },
  { id:'memoria',  emoji:'🧩', title:'Memoria Animal',   desc:'Encuentra los 6 pares',         coins:'+40🪙 al completar', color:'#9B6EF5' },
  { id:'reaccion', emoji:'⚡', title:'Reacción Rápida',  desc:'10 rondas, ¡toca a tiempo!',    coins:'+20🪙/round', color:'#FFB547'  },
  { id:'colorea',  emoji:'🎨', title:'Colorea la Mascota', desc:'Personaliza con colores',     coins:'+60🪙 al terminar', color:'#F055A3' },
  { id:'ahorcado', emoji:'📝', title:'Ahorcado de Razas', desc:'Adivina letra a letra',        coins:'+50🪙 al acertar', color:'#4A9EFF' },
  { id:'carrera',  emoji:'🏃', title:'Carrera de Mascotas', desc:'Apuesta y cruza los dedos',  coins:'+80🪙 si aciertas', color:'#2DD4BF' },
]

export default function GamesScreen({ onClose }) {
  const { C } = useTheme()
  const [game, setGame] = useState(null)

  const GAME_COMPONENTS = {
    trivia:   <TriviaGame   onBack={() => setGame(null)} />,
    razas:    <RazasGame    onBack={() => setGame(null)} />,
    memoria:  <MemoriaGame  onBack={() => setGame(null)} />,
    reaccion: <ReaccionGame onBack={() => setGame(null)} />,
    colorea:  <ColorearGame onBack={() => setGame(null)} />,
    ahorcado: <AhorcadoGame onBack={() => setGame(null)} />,
    carrera:  <CarreraGame  onBack={() => setGame(null)} />,
  }

  const currentGame = GAMES_LIST.find(g => g.id === game)

  return (
    <div style={{ position:'fixed', inset:0, zIndex:260, background:C.bg, overflowY:'auto', maxWidth:420, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'18px 18px 14px',
        background:C.bg, borderBottom:`1px solid ${C.border}`, position:'sticky', top:0, zIndex:10 }}>
        <button onClick={game ? () => setGame(null) : onClose} style={{ background:C.bgElevated,
          border:`1px solid ${C.border}`, borderRadius:10, width:34, height:34,
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', fontSize:16, color:C.text }}>←</button>
        <span style={{ fontFamily:F.display, fontWeight:800, fontSize:18, color:C.text }}>
          {currentGame ? `${currentGame.emoji} ${currentGame.title}` : 'Juegos 🎮'}
        </span>
        {currentGame && (
          <div style={{ marginLeft:'auto', background:'#FF8C00'+'22', borderRadius:10, padding:'3px 10px' }}>
            <span style={{ fontFamily:F.body, fontSize:11, fontWeight:600, color:'#FF8C00' }}>
              {currentGame.coins}
            </span>
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
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {GAMES_LIST.map(g => (
                <div key={g.id} onClick={() => setGame(g.id)} style={{
                  background:C.bgCard, borderRadius:18, padding:'16px',
                  cursor:'pointer', border:`1px solid ${C.border}`, transition:'all 0.15s',
                }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>{g.emoji}</div>
                  <div style={{ fontFamily:F.display, fontWeight:700, fontSize:14, color:C.text, marginBottom:4 }}>
                    {g.title}
                  </div>
                  <div style={{ fontFamily:F.body, fontSize:11, color:C.textSub, marginBottom:8, lineHeight:1.4 }}>
                    {g.desc}
                  </div>
                  <div style={{ fontFamily:F.body, fontSize:11, fontWeight:600, color:g.color }}>
                    {g.coins}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {game && GAME_COMPONENTS[game]}
      </div>
    </div>
  )
}
