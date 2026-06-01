import { useState } from 'react'
import { useTheme, F } from '../lib/theme'

export default function PetProfile({ post, allPosts = [], onClose }) {
  const { C } = useTheme()
  const [following, setFollowing] = useState(false)
  const [shared,    setShared]    = useState(false)

  // Reune todos los posts de esta mascota
  const petPosts = allPosts.filter(p =>
    (p.name && p.name === post.name) ||
    (!post.name && p.breed === post.breed && p.owner === post.owner)
  )
  const totalLikes = petPosts.reduce((s, p) => s + (p.likes || 0), 0)

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${post.name || post.breed} en PetConnect`,
        text: `¡Mira el perfil de ${post.name || 'esta mascota'} en PetConnect!`,
        url: window.location.href,
      }).catch(() => {})
    }
    setShared(true)
    setTimeout(() => setShared(false), 2000)
  }

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:250,
      background:C.bg, overflowY:'auto',
      maxWidth:420, margin:'0 auto',
    }}>
      {/* ── Hero foto ── */}
      <div style={{ position:'relative', height:320, flexShrink:0 }}>
        {post.photo ? (
          <img src={post.photo} alt={post.name}
            style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center 15%', display:'block' }} />
        ) : (
          <div style={{ width:'100%', height:'100%',
            background:`linear-gradient(135deg, ${C.accent}33, ${C.teal}22)`,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:90 }}>
            {post.avatar}
          </div>
        )}
        {/* Degradado doble: arriba y abajo */}
        <div style={{ position:'absolute', inset:0, background:
          'linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, transparent 35%, transparent 55%, rgba(0,0,0,0.55) 100%)',
          pointerEvents:'none' }} />

        {/* Botón volver */}
        <button onClick={onClose} style={{
          position:'absolute', top:52, left:16,
          background:'rgba(0,0,0,0.32)', backdropFilter:'blur(10px)',
          border:'1px solid rgba(255,255,255,0.2)', borderRadius:12,
          width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', color:'#fff', fontSize:18, flexShrink:0,
        }}>←</button>

        {/* Nombre sobre la foto */}
        <div style={{ position:'absolute', bottom:22, left:20, right:20 }}>
          <div style={{ fontFamily:F.display, fontWeight:800, fontSize:28,
            color:'#fff', lineHeight:1.15, textShadow:'0 2px 8px rgba(0,0,0,0.3)' }}>
            {post.name || post.breed}
          </div>
          {post.name && post.breed && (
            <div style={{ fontFamily:F.body, fontSize:14, color:'rgba(255,255,255,0.85)', marginTop:4 }}>
              {post.breed}
            </div>
          )}
        </div>
      </div>

      {/* ── Contenido ── */}
      <div style={{ padding:'20px 18px 40px' }}>

        {/* Dueño */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20,
          background:C.bgCard, borderRadius:14, padding:'12px 14px', border:`1px solid ${C.border}` }}>
          <div style={{ width:40, height:40, borderRadius:12, background:C.bgElevated,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
            {post.owner_avatar || '👤'}
          </div>
          <div>
            <div style={{ fontFamily:F.body, fontSize:11, color:C.textMuted }}>Dueño</div>
            <div style={{ fontFamily:F.body, fontWeight:600, fontSize:14, color:C.text }}>{post.owner}</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'flex', gap:10, marginBottom:20 }}>
          {[
            { label:'Me gusta',   value: totalLikes                     },
            { label:'Posts',      value: petPosts.length                },
            { label:'Seguidores', value: following ? 1 : 0             },
          ].map((stat, i) => (
            <div key={i} style={{ flex:1, background:C.bgCard, borderRadius:14,
              border:`1px solid ${C.border}`, padding:'12px 8px', textAlign:'center' }}>
              <div style={{ fontFamily:F.display, fontWeight:800, fontSize:20, color:C.accent }}>
                {stat.value}
              </div>
              <div style={{ fontFamily:F.body, fontSize:11, color:C.textSub, marginTop:3 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Botones */}
        <div style={{ display:'flex', gap:10, marginBottom:28 }}>
          <button onClick={() => setFollowing(f => !f)} style={{
            flex:2,
            background: following ? C.bgElevated : C.accent,
            color:       following ? C.text       : C.bg,
            border:`1px solid ${following ? C.border : 'transparent'}`,
            borderRadius:14, padding:'13px',
            fontFamily:F.display, fontSize:14, fontWeight:700,
            cursor:'pointer', transition:'all 0.2s',
          }}>
            {following ? '✓ Siguiendo' : '+ Seguir'}
          </button>
          <button onClick={handleShare} style={{
            flex:1, background:C.bgElevated,
            border:`1px solid ${C.border}`, borderRadius:14, padding:'13px',
            fontFamily:F.body, fontSize:13, fontWeight:600,
            color:C.text, cursor:'pointer', transition:'all 0.15s',
          }}>
            {shared ? '✓ ¡Listo!' : '📤 Compartir'}
          </button>
        </div>

        {/* Publicaciones */}
        <div style={{ fontFamily:F.body, fontSize:11, fontWeight:700, color:C.textMuted,
          textTransform:'uppercase', letterSpacing:0.8, marginBottom:14 }}>
          Publicaciones
        </div>

        {petPosts.length === 0 ? (
          <div style={{ textAlign:'center', padding:'28px 0',
            fontFamily:F.body, fontSize:13, color:C.textMuted }}>
            Sin publicaciones aún
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
            {petPosts.map(p => (
              <div key={p.id} style={{ position:'relative', paddingBottom:'100%',
                borderRadius:12, overflow:'hidden', background:C.bgElevated }}>
                {p.photo ? (
                  <img src={p.photo} alt={p.name}
                    style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
                ) : (
                  <div style={{ position:'absolute', inset:0, display:'flex',
                    alignItems:'center', justifyContent:'center', fontSize:42 }}>
                    {p.avatar}
                  </div>
                )}
                {/* Likes overlay */}
                <div style={{
                  position:'absolute', bottom:6, left:6,
                  background:'rgba(0,0,0,0.5)', borderRadius:8,
                  padding:'2px 8px', fontFamily:F.body, fontSize:11, color:'#fff',
                }}>❤️ {p.likes}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
