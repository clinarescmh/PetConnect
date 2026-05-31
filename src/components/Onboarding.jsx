import { useState, useRef, useEffect } from 'react'
import { F } from '../lib/theme'

/* ── Slides ── */
const SLIDES = [
  {
    photo:  '/Golden_retriever.jpeg',
    accent: '#FF8C00',
    title:  'Bienvenido a PetConnect',
    desc:   'La red social diseñada para dueños de mascotas. Todo lo que tu peludo necesita, en un solo lugar.',
    icon:   '🐾',
  },
  {
    photo:  '/Gato_persa.jpeg',
    accent: '#2DD4BF',
    title:  'Todo lo que necesitas',
    desc:   'Veterinarios, paseadores, tiendas y alojamiento cerca de ti — con un solo toque.',
    icon:   '🏥',
  },
  {
    photo:  '/Beagle.jpeg',
    accent: '#FF8C00',
    title:  'Tu comunidad te espera',
    desc:   'Conecta con otros dueños, reporta mascotas perdidas y encuentra hogares para quienes lo necesitan.',
    icon:   '🤝',
  },
  {
    photo:  '/Conejo.jpeg',
    accent: '#2DD4BF',
    title:  '¡Listo para comenzar!',
    desc:   'Únete a miles de dueños de mascotas en Chile y dale a tu mascota la atención que merece.',
    icon:   '🚀',
  },
]

/* ── Preload helper ── */
function preload(src) {
  const img = new window.Image()
  img.src = src
}

export default function Onboarding({ onComplete }) {
  const [idx, setIdx]   = useState(0)
  const [vis, setVis]   = useState(true)
  const touchX          = useRef(null)

  const slide  = SLIDES[idx]
  const isLast = idx === SLIDES.length - 1

  /* Precargar todas las imágenes al montar */
  useEffect(() => {
    SLIDES.forEach(s => preload(s.photo))
  }, [])

  /* Restaurar visibilidad después de cambio de slide */
  useEffect(() => { setVis(true) }, [idx])

  const goTo = (next) => {
    if (next < 0 || next >= SLIDES.length) return
    setVis(false)
    setTimeout(() => setIdx(next), 220)
  }

  /* Swipe táctil */
  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX }
  const onTouchEnd   = (e) => {
    if (touchX.current === null) return
    const delta = touchX.current - e.changedTouches[0].clientX
    if (delta >  50) goTo(idx + 1)
    if (delta < -50) goTo(idx - 1)
    touchX.current = null
  }

  const transition = 'opacity 0.22s ease'

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:500,
      background:'#0D1B2E',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <style>{`
        @keyframes ob-dot-grow { from { width:8px } to { width:26px } }
        @keyframes ob-slide-up { from { transform:translateY(16px); opacity:0 } to { transform:translateY(0); opacity:1 } }
      `}</style>

      <div
        style={{ width:'100%', maxWidth:420, height:'100%',
          display:'flex', flexDirection:'column', overflow:'hidden' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >

        {/* ── Foto ── */}
        <div style={{ flex:1, position:'relative', overflow:'hidden', minHeight:220 }}>
          <img
            src={slide.photo}
            alt={slide.title}
            style={{
              width:'100%', height:'100%',
              objectFit:'cover', objectPosition:'center 15%',
              display:'block',
              opacity: vis ? 1 : 0,
              transition,
            }}
          />

          {/* Degradado inferior hacia blanco */}
          <div style={{
            position:'absolute', bottom:0, left:0, right:0, height:'48%',
            background:'linear-gradient(to bottom, transparent, #ffffff)',
            pointerEvents:'none',
          }} />

          {/* Barra de color en la parte inferior */}
          <div style={{
            position:'absolute', bottom:0, left:0, right:0, height:4,
            background:`linear-gradient(to right, ${slide.accent}, ${slide.accent}88)`,
            transition:'background 0.3s',
          }} />

          {/* Botón Saltar */}
          {!isLast && (
            <button onClick={onComplete} style={{
              position:'absolute', top:52, right:16,
              background:'rgba(0,0,0,0.30)',
              backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
              border:'1px solid rgba(255,255,255,0.2)',
              borderRadius:20, padding:'6px 16px',
              color:'#fff', fontFamily:F.body, fontSize:13, fontWeight:600,
              cursor:'pointer',
            }}>
              Saltar
            </button>
          )}
        </div>

        {/* ── Contenido ── */}
        <div style={{
          background:'#ffffff',
          padding:'22px 28px 44px',
          flexShrink:0,
        }}>

          {/* Línea de acento */}
          <div style={{
            width:44, height:5, borderRadius:3,
            background: slide.accent,
            marginBottom:14,
            transition:'background 0.3s',
          }} />

          {/* Título */}
          <div style={{
            fontFamily:F.display, fontWeight:800, fontSize:26,
            color:'#1B3A6B', lineHeight:1.2, marginBottom:10,
            opacity: vis ? 1 : 0, transition,
          }}>
            {slide.title}
          </div>

          {/* Descripción */}
          <div style={{
            fontFamily:F.body, fontSize:14, color:'#4A6A8A',
            lineHeight:1.65, marginBottom:28,
            opacity: vis ? 1 : 0, transition,
          }}>
            {slide.desc}
          </div>

          {/* Dots + botón */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>

            {/* Dots */}
            <div style={{ display:'flex', gap:7, alignItems:'center' }}>
              {SLIDES.map((_, i) => (
                <div
                  key={i}
                  onClick={() => goTo(i)}
                  style={{
                    height:8, borderRadius:4, cursor:'pointer',
                    width: i === idx ? 26 : 8,
                    background: i === idx ? slide.accent : '#D4DBE8',
                    transition:'width 0.3s ease, background 0.3s ease',
                  }}
                />
              ))}
            </div>

            {/* Botón siguiente o Comenzar */}
            {isLast ? (
              <button onClick={onComplete} style={{
                background: `linear-gradient(135deg, ${slide.accent} 0%, ${slide.accent}bb 100%)`,
                color:'#fff', border:'none', borderRadius:14,
                padding:'14px 28px',
                fontFamily:F.display, fontSize:15, fontWeight:700,
                cursor:'pointer',
                boxShadow:`0 6px 20px ${slide.accent}55`,
                transition:'transform 0.15s, box-shadow 0.15s',
              }}>
                Comenzar →
              </button>
            ) : (
              <button
                onClick={() => goTo(idx + 1)}
                style={{
                  width:52, height:52, borderRadius:16,
                  background: slide.accent,
                  border:'none', cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow:`0 6px 20px ${slide.accent}55`,
                  transition:'transform 0.15s',
                }}
              >
                <span style={{ color:'#fff', fontSize:22, lineHeight:1 }}>→</span>
              </button>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}
