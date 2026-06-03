/**
 * PetProfile — perfil de mascota estable.
 * Con: foto, nombre, edición ✏️, historial médico resumido, galería ampliada.
 */
import { useState, lazy, Suspense } from 'react'
import { useTheme, F } from '../lib/theme'

// PetEdit se carga lazy para no crashear si hay algún issue de import
const PetEditLazy = lazy(() => import('./PetEdit'))

const MOCK_HEALTH = [
  { title:'Vacuna Séxtuple',   next:'Mar 2026', icon:'💉', status:'ok'      },
  { title:'Desparasitación',    next:'May 2025', icon:'💊', status:'overdue' },
  { title:'Control Anual',      next:'Ene 2026', icon:'🩺', status:'ok'      },
]
const STATUS_COLOR = { ok:'#2DD4BF', overdue:'#FF5252', soon:'#FFB547' }
const STATUS_LABEL = { ok:'Al día', overdue:'Vencido', soon:'Próximo' }

/* Importación directa con fallbacks seguros si algo falla */
import { loadFollowing as _loadFollowing, toggleFollow as _toggleFollow } from '../lib/pets.js'
const loadFollowing = (...args) => { try { return _loadFollowing(...args) } catch { return [] } }
const toggleFollow  = (...args) => { try { return _toggleFollow(...args)  } catch { return [] } }

export default function PetProfile({ post, allPosts = [], onClose }) {
  /* Guard: nunca debe recibir null */
  if (!post) {
    console.warn('[PetProfile] recibió post=null, cerrando')
    return null
  }

  const { C } = useTheme()

  /* Datos normalizados — soporta tanto mockPets como localStorage pets */
  const name     = post.name   || post.nombre || 'Mascota'
  const breed    = post.breed  || post.raza   || ''
  const photo    = post.photo  || post.foto   || null
  const avatar   = post.avatar || '🐾'
  const owner    = post.owner  || post.ownerName || ''
  const username = post.username || null
  const likes    = post.likes  || 0

  const petPosts = (allPosts || []).filter(p =>
    p && ((p.name && p.name === name) || (p.nombre && p.nombre === name))
  )
  const totalLikes = petPosts.reduce((s, p) => s + (p.likes || 0), 0)

  /* Follow state — con fallback si la lib falla */
  const followId = username || String(post.id ?? 'demo')
  const [isFollowing, setIsFollowing] = useState(() => {
    try { return loadFollowing().includes(followId) }
    catch { return false }
  })

  const [shared,   setShared]   = useState(false)
  const [editMode, setEditMode] = useState(false)

  const handleFollow = () => {
    try {
      const upd = toggleFollow(followId)
      setIsFollowing(upd.includes(followId))
    } catch { setIsFollowing(f => !f) }
  }

  const handleShare = () => {
    try {
      if (navigator.share) {
        navigator.share({ title:`${name} en PetConnect`, url: window.location.href }).catch(() => {})
      }
    } catch {}
    setShared(true)
    setTimeout(() => setShared(false), 2000)
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:250, background:C.bg,
      overflowY:'auto', maxWidth:'var(--app-max)', margin:'0 auto' }}>

      {/* ── Hero ── */}
      <div style={{ position:'relative', height:300, flexShrink:0, background:C.bgElevated }}>
        {photo ? (
          <img src={photo} alt={name}
            style={{ width:'100%', height:'100%', objectFit:'cover',
              objectPosition:'center 15%', display:'block' }} />
        ) : (
          <div style={{ width:'100%', height:'100%', display:'flex',
            alignItems:'center', justifyContent:'center', fontSize:90,
            background:`linear-gradient(135deg, ${C.accent}33, ${C.teal}22)` }}>
            {avatar}
          </div>
        )}

        {/* Degradado */}
        <div style={{ position:'absolute', inset:0, background:
          'linear-gradient(to bottom,rgba(0,0,0,0.36) 0%,transparent 35%,transparent 55%,rgba(0,0,0,0.52) 100%)',
          pointerEvents:'none' }} />

        {/* PetEdit lazy */}
        {editMode && (
          <Suspense fallback={null}>
            <PetEditLazy
              pet={{ ...post, dbId: post.id }}
              onSave={updated => setEditMode(false)}
              onClose={() => setEditMode(false)}
            />
          </Suspense>
        )}

        {/* Botón volver */}
        <button onClick={onClose} style={{
          position:'absolute', top:52, left:16,
          background:'rgba(0,0,0,0.32)', backdropFilter:'blur(10px)',
          border:'1px solid rgba(255,255,255,0.2)', borderRadius:12,
          width:40, height:40, display:'flex', alignItems:'center',
          justifyContent:'center', cursor:'pointer', color:'#fff', fontSize:18 }}>←</button>

        {/* Botón editar */}
        <button onClick={() => setEditMode(true)} style={{
          position:'absolute', top:52, right:16,
          background:'rgba(0,0,0,0.32)', backdropFilter:'blur(10px)',
          border:'1px solid rgba(255,255,255,0.2)', borderRadius:12,
          width:40, height:40, display:'flex', alignItems:'center',
          justifyContent:'center', cursor:'pointer', fontSize:16 }}>✏️</button>

        {/* Nombre en hero */}
        <div style={{ position:'absolute', bottom:20, left:20, right:80 }}>
          <div style={{ fontFamily:F.display, fontWeight:800, fontSize:26,
            color:'#fff', lineHeight:1.2, textShadow:'0 2px 8px rgba(0,0,0,0.3)' }}>
            {name}
          </div>
          {breed && (
            <div style={{ fontFamily:F.body, fontSize:13, color:'rgba(255,255,255,0.85)', marginTop:3 }}>
              {breed}
            </div>
          )}
          {username && (
            <div style={{ fontFamily:F.body, fontSize:12, fontWeight:600,
              color:'rgba(255,255,255,0.82)', marginTop:2 }}>@{username}</div>
          )}
        </div>
      </div>

      {/* ── Contenido ── */}
      <div style={{ padding:'18px 18px 40px' }}>

        {/* Dueño */}
        {owner && (
          <div style={{ background:C.bgCard, borderRadius:14, padding:'12px 14px',
            marginBottom:18, border:`1px solid ${C.border}`,
            display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:C.bgElevated,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
              {post.owner_avatar || '👤'}
            </div>
            <div>
              <div style={{ fontFamily:F.body, fontSize:11, color:C.textMuted }}>Dueño</div>
              <div style={{ fontFamily:F.body, fontWeight:600, fontSize:14, color:C.text }}>{owner}</div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display:'flex', gap:10, marginBottom:18 }}>
          {[
            { label:'Me gusta',   value: totalLikes || likes },
            { label:'Posts',      value: petPosts.length     },
            { label:'Seguidores', value: isFollowing ? 1 : 0 },
          ].map((s, i) => (
            <div key={i} style={{ flex:1, background:C.bgCard, borderRadius:12,
              border:`1px solid ${C.border}`, padding:'10px 6px', textAlign:'center' }}>
              <div style={{ fontFamily:F.display, fontWeight:800, fontSize:18, color:C.accent }}>
                {s.value}
              </div>
              <div style={{ fontFamily:F.body, fontSize:10, color:C.textSub, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Botones */}
        <div style={{ display:'flex', gap:10, marginBottom:24 }}>
          <button onClick={handleFollow} style={{
            flex:2,
            background: isFollowing ? C.bgElevated : C.accent,
            color:       isFollowing ? C.text       : C.bg,
            border:`1px solid ${isFollowing ? C.border : 'transparent'}`,
            borderRadius:14, padding:'13px',
            fontFamily:F.display, fontSize:14, fontWeight:700,
            cursor:'pointer', transition:'all 0.2s',
          }}>{isFollowing ? '✓ Siguiendo' : '+ Seguir'}</button>
          <button onClick={handleShare} style={{
            flex:1, background:C.bgElevated,
            border:`1px solid ${C.border}`, borderRadius:14, padding:'13px',
            fontFamily:F.body, fontSize:13, fontWeight:600,
            color:C.text, cursor:'pointer',
          }}>{shared ? '✓ ¡Listo!' : '📤 Compartir'}</button>
        </div>

        {/* Posts */}
        {petPosts.length > 0 && (
          <>
            <div style={{ fontFamily:F.body, fontSize:11, fontWeight:700, color:C.textMuted,
              textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 }}>
              Publicaciones
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
              {petPosts.map(p => (
                <div key={p.id} style={{ position:'relative', paddingBottom:'75%',
                  borderRadius:14, overflow:'hidden', background:C.bgElevated }}>
                  {(p.photo || p.foto) ? (
                    <img src={p.photo || p.foto} alt={p.name}
                      style={{ position:'absolute', inset:0, width:'100%', height:'100%',
                        objectFit:'cover', objectPosition:'center 20%' }} />
                  ) : (
                    <div style={{ position:'absolute', inset:0, display:'flex',
                      alignItems:'center', justifyContent:'center', fontSize:42 }}>
                      {p.avatar || '🐾'}
                    </div>
                  )}
                  <div style={{ position:'absolute', bottom:6, left:6,
                    background:'rgba(0,0,0,0.5)', borderRadius:8,
                    padding:'2px 8px', fontFamily:F.body, fontSize:11, color:'#fff' }}>
                    ❤️ {p.likes || 0}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {petPosts.length === 0 && (
          <div style={{ textAlign:'center', padding:'20px 0',
            fontFamily:F.body, fontSize:13, color:C.textMuted }}>
            Sin publicaciones aún
          </div>
        )}

        {/* ── Historial médico resumido ── */}
        <div style={{ marginTop:24 }}>
          <div style={{ fontFamily:F.body, fontSize:11, fontWeight:700, color:C.textMuted,
            textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 }}>
            Historial médico
          </div>
          {MOCK_HEALTH.map((h, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12,
              background:C.bgCard, borderRadius:12, padding:'12px 14px', marginBottom:8,
              border:`1px solid ${C.border}` }}>
              <div style={{ width:36, height:36, borderRadius:10,
                background:STATUS_COLOR[h.status]+'18',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                {h.icon}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:F.body, fontWeight:600, fontSize:13, color:C.text }}>{h.title}</div>
                <div style={{ fontFamily:F.body, fontSize:11, color:C.textSub, marginTop:1 }}>
                  Próximo: {h.next}
                </div>
              </div>
              <div style={{ background:STATUS_COLOR[h.status]+'22', borderRadius:8,
                padding:'3px 10px', fontFamily:F.body, fontSize:10, fontWeight:700,
                color:STATUS_COLOR[h.status] }}>
                {STATUS_LABEL[h.status]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
