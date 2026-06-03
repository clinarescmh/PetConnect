import { useState } from 'react'
import { useTheme, F, makeCard } from '../lib/theme'
import { loadOwner, saveOwner, loadPets, loadFollowing } from '../lib/pets'

export default function OwnerProfile({ onClose, onOpenPet, onAddPet }) {
  const { C } = useTheme()
  const [owner, setOwner] = useState(() => loadOwner() || { nombre:'', fotoPerfil:'', bio:'', username:'' })
  const [pets]  = useState(() => loadPets())
  const [editing, setEditing] = useState(!owner.nombre)
  const [form,    setForm]    = useState({ ...owner })
  const [saved,   setSaved]   = useState(false)

  const following = loadFollowing()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    const updated = { ...form, nombre: form.nombre.trim() }
    saveOwner(updated)
    setOwner(updated)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const inp = {
    width:'100%', background:C.bgElevated, border:`1px solid ${C.borderHi}`,
    borderRadius:12, padding:'11px 14px', fontFamily:F.body, fontSize:14,
    color:C.text, outline:'none', boxSizing:'border-box',
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:270, background:C.bg,
      overflowY:'auto', maxWidth:420, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'18px 18px 14px',
        background:C.bg, borderBottom:`1px solid ${C.border}`,
        position:'sticky', top:0, zIndex:10 }}>
        <button onClick={onClose} style={{ background:C.bgElevated, border:`1px solid ${C.border}`,
          borderRadius:10, width:34, height:34, display:'flex', alignItems:'center',
          justifyContent:'center', cursor:'pointer', fontSize:16, color:C.text }}>←</button>
        <span style={{ fontFamily:F.display, fontWeight:800, fontSize:18, color:C.text, flex:1 }}>
          Mi Perfil
        </span>
        <button onClick={() => setEditing(e => !e)} style={{ background:C.bgElevated,
          border:`1px solid ${C.border}`, borderRadius:10, width:34, height:34,
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', fontSize:15 }}>✏️</button>
      </div>

      <div style={{ padding:'20px 18px 48px' }}>

        {/* Avatar + info */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:24 }}>
          <div style={{ width:90, height:90, borderRadius:28, overflow:'hidden',
            background:C.bgElevated, border:`2px solid ${C.accent}44`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:44, marginBottom:12 }}>
            {owner.fotoPerfil
              ? <img src={owner.fotoPerfil} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" />
              : '👤'}
          </div>
          <div style={{ fontFamily:F.display, fontWeight:800, fontSize:20, color:C.text }}>
            {owner.nombre || 'Tu nombre'}
          </div>
          {owner.username && (
            <div style={{ fontFamily:F.body, fontSize:13, color:C.teal, marginTop:2 }}>
              @{owner.username}
            </div>
          )}
          {owner.bio && (
            <div style={{ fontFamily:F.body, fontSize:13, color:C.textSub, marginTop:8,
              textAlign:'center', lineHeight:1.5, maxWidth:280 }}>
              {owner.bio}
            </div>
          )}
          {/* Stats */}
          <div style={{ display:'flex', gap:20, marginTop:14 }}>
            {[['Mascotas', pets.length], ['Siguiendo', following.length]].map(([lbl, val]) => (
              <div key={lbl} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:F.display, fontWeight:800, fontSize:18, color:C.accent }}>{val}</div>
                <div style={{ fontFamily:F.body, fontSize:11, color:C.textSub }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Edit form */}
        {editing && (
          <div style={{ ...makeCard(C), padding:'16px', marginBottom:20 }}>
            <div style={{ fontFamily:F.body, fontSize:11, fontWeight:700, color:C.textMuted,
              textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 }}>Editar perfil</div>

            {[['nombre','Tu nombre','text'],['username','username (sin @)','text'],
              ['fotoPerfil','URL de foto de perfil','url']].map(([k, ph, t]) => (
              <div key={k} style={{ marginBottom:10 }}>
                <input type={t} value={form[k] || ''} onChange={e => set(k, e.target.value)}
                  placeholder={ph} style={inp} />
              </div>
            ))}
            <textarea value={form.bio || ''} onChange={e => set('bio', e.target.value)}
              rows={2} placeholder="Una frase sobre ti y tus mascotas…"
              style={{ ...inp, resize:'vertical', lineHeight:1.5 }} />
            <button onClick={handleSave} style={{ width:'100%', marginTop:10,
              background:C.accent, color:C.bg, border:'none', borderRadius:12,
              padding:'12px', fontFamily:F.display, fontSize:14, fontWeight:700,
              cursor:'pointer' }}>
              {saved ? '✓ Guardado' : 'Guardar'}
            </button>
          </div>
        )}

        {/* Mis mascotas */}
        <div style={{ fontFamily:F.body, fontSize:11, fontWeight:700, color:C.textMuted,
          textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 }}>
          Mis mascotas
        </div>

        {pets.map(pet => (
          <div key={pet.id || pet.nombre} onClick={() => onOpenPet?.(pet)}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
              background:C.bgCard, borderRadius:14, marginBottom:8,
              border:`1px solid ${C.border}`, cursor:'pointer' }}>
            <div style={{ width:46, height:46, borderRadius:14, overflow:'hidden',
              background:C.bgElevated, display:'flex', alignItems:'center',
              justifyContent:'center', fontSize:24, flexShrink:0 }}>
              {pet.foto
                ? <img src={pet.foto} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt={pet.nombre} />
                : '🐾'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:F.body, fontWeight:700, fontSize:14, color:C.text }}>{pet.nombre}</div>
              <div style={{ fontFamily:F.body, fontSize:12, color:C.textSub }}>
                {[pet.raza, pet.especie].filter(Boolean).join(' · ')}
              </div>
              {pet.username && (
                <div style={{ fontFamily:F.body, fontSize:11, color:C.teal }}>@{pet.username}</div>
              )}
            </div>
            <span style={{ color:C.textMuted, fontSize:16 }}>›</span>
          </div>
        ))}

        <button onClick={onAddPet} style={{ width:'100%', background:'transparent',
          border:`1.5px dashed ${C.accent}66`, borderRadius:14, padding:'12px',
          fontFamily:F.body, fontSize:13, fontWeight:600, color:C.accent,
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          + Agregar mascota
        </button>
      </div>
    </div>
  )
}
