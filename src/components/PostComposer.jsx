/**
 * PostComposer — modal para crear publicaciones en el feed.
 * Soporta: Foto (URL + file picker) | Video (URL) | Solo texto
 * Al publicar → agrega al feed local + +100 PetCoins
 */
import { useState, useRef } from 'react'
import { useTheme, F } from '../lib/theme'
import { loadPets } from '../lib/pets'

const DEMO_PETS = [
  { id:1,   nombre:'Tobías', foto:'/Golden_retriever.jpeg', username:'tobias_golden' },
  { id:2,   nombre:'Luna',   foto:'/Gato_persa.jpeg',       username:'luna_persa'    },
  { id:3,   nombre:'Max',    foto:'/Labrador.jpeg',         username:'max_labrador'  },
]

function getPets() {
  try {
    const stored = loadPets()
    if (stored.length > 0) return stored.map(p => ({ ...p, nombre: p.nombre || p.name }))
  } catch {}
  return DEMO_PETS
}

export default function PostComposer({ onClose, onPublish }) {
  const { C } = useTheme()
  const pets = getPets()

  const [mediaType,    setMediaType]    = useState(null) // null | 'photo' | 'video' | 'text'
  const [mediaUrl,     setMediaUrl]     = useState('')
  const [previewUrl,   setPreviewUrl]   = useState(null)
  const [caption,      setCaption]      = useState('')
  const [tag,          setTag]          = useState('')
  const [selectedPet,  setSelectedPet]  = useState(pets[0]?.id || pets[0]?.nombre || null)
  const [publishing,   setPublishing]   = useState(false)
  const [done,         setDone]         = useState(false)
  const fileRef = useRef()

  const activePet = pets.find(p => (p.id || p.nombre) === selectedPet) || pets[0]

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setMediaUrl(url)
  }

  const canPublish = caption.trim().length > 0

  const handlePublish = () => {
    if (!canPublish) return
    setPublishing(true)
    const pet = activePet
    const newPost = {
      id:           Date.now(),
      name:         pet?.nombre || pet?.name || 'Mi mascota',
      username:     pet?.username || null,
      breed:        pet?.raza || pet?.breed || '',
      owner:        'Tú',
      avatar:       '🐾',
      owner_avatar: '👤',
      photo:        mediaType === 'photo' ? (previewUrl || mediaUrl || pet?.foto || pet?.photo || null) : null,
      video:        mediaType === 'video' ? mediaUrl || null : null,
      likes:        0,
      comments:     0,
      caption:      caption.trim(),
      time_ago:     'ahora',
      tag:          tag.trim() ? (tag.startsWith('#') ? tag.trim() : `#${tag.trim()}`) : '#petconnect',
    }
    setTimeout(() => {
      setPublishing(false)
      setDone(true)
      onPublish?.(newPost)
      setTimeout(onClose, 700)
    }, 300)
  }

  const inp = {
    width:'100%', background:C.bgElevated, border:`1px solid ${C.borderHi}`,
    borderRadius:12, padding:'11px 14px', fontFamily:F.body, fontSize:14,
    color:C.text, outline:'none', boxSizing:'border-box',
  }

  if (done) return (
    <div style={{ position:'fixed', inset:0, zIndex:400, background:C.bg, maxWidth:420, margin:'0 auto',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
      <div style={{ fontSize:64 }}>✅</div>
      <div style={{ fontFamily:F.display, fontWeight:800, fontSize:20, color:C.text }}>¡Publicado!</div>
      <div style={{ fontFamily:F.body, fontSize:14, color:C.teal, fontWeight:600 }}>+100 🪙</div>
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, zIndex:400, background:C.bg,
      overflowY:'auto', maxWidth:420, margin:'0 auto' }}>
      <style>{`* { box-sizing: border-box; }`}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 18px',
        background:C.bg, borderBottom:`1px solid ${C.border}`,
        position:'sticky', top:0, zIndex:10 }}>
        <button onClick={onClose} style={{ background:C.bgElevated, border:`1px solid ${C.border}`,
          borderRadius:10, width:34, height:34, display:'flex', alignItems:'center',
          justifyContent:'center', cursor:'pointer', fontSize:16, color:C.text }}>←</button>
        <span style={{ fontFamily:F.display, fontWeight:800, fontSize:18, color:C.text, flex:1 }}>
          Nueva publicación
        </span>
        <button onClick={handlePublish} disabled={!canPublish || publishing} style={{
          background: canPublish ? C.accent : C.bgElevated,
          color: canPublish ? C.bg : C.textMuted,
          border:'none', borderRadius:12, padding:'8px 16px',
          fontFamily:F.display, fontSize:13, fontWeight:700,
          cursor: canPublish ? 'pointer' : 'not-allowed', transition:'all 0.2s',
        }}>
          {publishing ? '…' : 'Publicar'}
        </button>
      </div>

      <div style={{ padding:'16px 18px 48px' }}>

        {/* Selecciona mascota */}
        {pets.length > 0 && (
          <>
            <div style={{ fontFamily:F.body, fontSize:11, fontWeight:700, color:C.textMuted,
              textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 }}>
              ¿Con qué mascota?
            </div>
            <div style={{ display:'flex', gap:8, overflowX:'auto', scrollbarWidth:'none',
              marginBottom:18, paddingBottom:4 }}>
              {pets.map(pet => {
                const petId = pet.id || pet.nombre
                const isActive = selectedPet === petId
                return (
                  <button key={petId} onClick={() => setSelectedPet(petId)} style={{
                    flexShrink:0, display:'flex', alignItems:'center', gap:6,
                    background: isActive ? C.accent+'18' : C.bgElevated,
                    border:`1.5px solid ${isActive ? C.accent : C.border}`,
                    borderRadius:20, padding:'6px 12px 6px 8px', cursor:'pointer',
                    transition:'all 0.15s',
                  }}>
                    {(pet.foto || pet.photo)
                      ? <img src={pet.foto || pet.photo} style={{ width:22, height:22, borderRadius:'50%', objectFit:'cover' }} alt="" />
                      : <span style={{ fontSize:18 }}>🐾</span>
                    }
                    <span style={{ fontFamily:F.body, fontSize:12, fontWeight:600,
                      color: isActive ? C.accent : C.text }}>
                      {pet.nombre || pet.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Tipo de contenido */}
        <div style={{ fontFamily:F.body, fontSize:11, fontWeight:700, color:C.textMuted,
          textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 }}>
          Tipo de contenido
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:18 }}>
          {[['photo','📷 Foto'],['video','🎥 Video'],['text','📝 Solo texto']].map(([type, lbl]) => (
            <button key={type} onClick={() => { setMediaType(type); setPreviewUrl(null); setMediaUrl(''); }}
              style={{ flex:1, borderRadius:12, padding:'10px 4px', cursor:'pointer',
                border:`1.5px solid ${mediaType===type ? C.accent : C.border}`,
                background: mediaType===type ? C.accent+'18' : C.bgElevated,
                fontFamily:F.body, fontSize:12, fontWeight:600,
                color: mediaType===type ? C.accent : C.text, transition:'all 0.15s' }}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Foto */}
        {mediaType === 'photo' && (
          <div style={{ marginBottom:16 }}>
            {/* Preview */}
            {previewUrl && (
              <div style={{ borderRadius:14, overflow:'hidden', height:200, marginBottom:10, background:C.bgElevated }}>
                <img src={previewUrl} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center 20%' }} alt="preview" />
              </div>
            )}
            {/* File picker */}
            <input ref={fileRef} type="file" accept="image/*" capture="environment"
              style={{ display:'none' }} onChange={handleFile} />
            <button onClick={() => fileRef.current?.click()} style={{
              width:'100%', background:C.bgElevated, border:`1px dashed ${C.border}`,
              borderRadius:12, padding:'12px', fontFamily:F.body, fontSize:13,
              color:C.textSub, cursor:'pointer', marginBottom:10 }}>
              📷 Tomar foto / Elegir de galería
            </button>
            {/* URL alternativa */}
            <div style={{ fontFamily:F.body, fontSize:11, color:C.textMuted, marginBottom:6 }}>
              O pega la URL de una imagen:
            </div>
            <input type="url" value={mediaUrl} onChange={e => { setMediaUrl(e.target.value); setPreviewUrl(e.target.value || null) }}
              placeholder="https://…" style={inp} />
          </div>
        )}

        {/* Video */}
        {mediaType === 'video' && (
          <div style={{ marginBottom:16 }}>
            <input type="url" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)}
              placeholder="URL del video (mp4)…" style={{ ...inp, marginBottom:8 }} />
            {mediaUrl && (
              <video src={mediaUrl} controls style={{ width:'100%', borderRadius:12, maxHeight:200 }} />
            )}
          </div>
        )}

        {/* Caption */}
        <div style={{ fontFamily:F.body, fontSize:11, fontWeight:700, color:C.textMuted,
          textTransform:'uppercase', letterSpacing:0.8, marginBottom:8 }}>
          Descripción <span style={{ color:C.accent }}>*</span>
        </div>
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="¿Qué está pasando? Cuéntanos..."
          rows={3}
          style={{ ...inp, resize:'vertical', lineHeight:1.55, marginBottom:14 }}
        />

        {/* Tag */}
        <div style={{ fontFamily:F.body, fontSize:11, fontWeight:700, color:C.textMuted,
          textTransform:'uppercase', letterSpacing:0.8, marginBottom:8 }}>
          Hashtag
        </div>
        <input value={tag} onChange={e => setTag(e.target.value)}
          placeholder="#lavidacanina" style={{ ...inp, marginBottom:20 }} />

        {/* Publish button */}
        <button onClick={handlePublish} disabled={!canPublish || publishing} style={{
          width:'100%', background: canPublish ? C.accent : C.bgElevated,
          color: canPublish ? C.bg : C.textMuted, border:'none', borderRadius:14,
          padding:'14px', fontFamily:F.display, fontSize:15, fontWeight:700,
          cursor: canPublish ? 'pointer' : 'not-allowed',
          opacity: publishing ? 0.7 : 1, transition:'all 0.2s',
        }}>
          {publishing ? 'Publicando…' : '📢 Publicar (+100 🪙 PetCoins)'}
        </button>

        {!canPublish && (
          <div style={{ fontFamily:F.body, fontSize:12, color:C.textMuted,
            textAlign:'center', marginTop:8 }}>
            Escribe una descripción para publicar
          </div>
        )}
      </div>
    </div>
  )
}
