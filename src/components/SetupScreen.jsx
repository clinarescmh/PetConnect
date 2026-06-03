/**
 * SetupScreen — pantalla de configuración inicial para nuevos usuarios.
 * Combina perfil del dueño + datos de la mascota en un solo scroll.
 * Guarda en localStorage: petconnect_owner y petconnect_my_pet
 */
import { useState } from 'react'
import { useTheme, F, makeCard } from '../lib/theme'
import { PET_LS_KEY, OWNER_LS_KEY, SPECIES } from './MyPetForm'

export default function SetupScreen({ onComplete }) {
  const { C } = useTheme()
  const [owner, setOwner] = useState({ nombre: '', fotoPerfil: '' })
  const [pet,   setPet]   = useState({
    nombre:'', especie:'', raza:'', fechaNacimiento:'', sexo:'', foto:''
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)
  const [done,   setDone]   = useState(false)

  const setO = (k, v) => setOwner(o => ({ ...o, [k]: v }))
  const setP = (k, v) => setPet(p => ({ ...p, [k]: v }))

  const handleComplete = () => {
    if (!owner.nombre.trim()) { setError('Ingresa tu nombre.'); return }
    if (!pet.nombre.trim())   { setError('Ingresa el nombre de tu mascota.'); return }
    setError(null); setSaving(true)

    const ownerData = { nombre: owner.nombre.trim(), fotoPerfil: owner.fotoPerfil.trim() || null }
    const petData   = { ...pet, nombre: pet.nombre.trim() }

    try {
      localStorage.setItem(OWNER_LS_KEY,  JSON.stringify(ownerData))
      localStorage.setItem(PET_LS_KEY,    JSON.stringify(petData))
    } catch {}

    setTimeout(() => { setSaving(false); setDone(true); setTimeout(() => onComplete?.(ownerData, petData), 800) }, 400)
  }

  const inp = {
    width:'100%', background:C.bgElevated, border:`1px solid ${C.borderHi}`,
    borderRadius:12, padding:'12px 14px', fontFamily:F.body, fontSize:14,
    color:C.text, outline:'none', boxSizing:'border-box',
  }
  const sectionTitle = (txt) => (
    <div style={{ fontFamily:F.body, fontSize:11, fontWeight:700, color:C.textMuted,
      textTransform:'uppercase', letterSpacing:0.8, marginBottom:14, marginTop:4 }}>
      {txt}
    </div>
  )
  const fieldLabel = (txt, req) => (
    <div style={{ fontFamily:F.body, fontSize:12, fontWeight:600, color:C.textSub, marginBottom:6, marginTop:14 }}>
      {txt}{req && <span style={{ color:C.accent }}> *</span>}
    </div>
  )

  if (done) return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:C.bg, maxWidth:'var(--app-max)', margin:'0 auto',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:28 }}>
      <div style={{ fontSize:72 }}>{SPECIES.find(s => s.id === pet.especie)?.emoji || '🐾'}</div>
      <div style={{ fontFamily:F.display, fontWeight:800, fontSize:22, color:C.text, textAlign:'center' }}>
        ¡Bienvenido, {owner.nombre}!
      </div>
      <div style={{ fontFamily:F.body, fontSize:14, color:C.textSub, textAlign:'center', lineHeight:1.5 }}>
        {pet.nombre} ya tiene su perfil en PetConnect 🎉
      </div>
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:C.bg,
      overflowY:'auto', overflowX:'hidden', maxWidth:'var(--app-max)', margin:'0 auto' }}>
      <style>{`* { box-sizing: border-box; } body { margin:0; }`}</style>

      {/* Hero */}
      <div style={{ padding:'48px 24px 24px', textAlign:'center',
        background:`linear-gradient(180deg, ${C.accent}12 0%, transparent 100%)` }}>
        <div style={{ fontSize:52, marginBottom:12 }}>🐾</div>
        <div style={{ fontFamily:F.display, fontWeight:800, fontSize:24, color:C.text, lineHeight:1.2 }}>
          ¡Configura tu cuenta!
        </div>
        <div style={{ fontFamily:F.body, fontSize:13, color:C.textSub, marginTop:6, lineHeight:1.5 }}>
          Cuéntanos sobre ti y tu mascota
        </div>
      </div>

      <div style={{ padding:'0 18px 48px' }}>

        {/* ── TU PERFIL ── */}
        <div style={{ ...makeCard(C), padding:'18px', marginBottom:16 }}>
          {sectionTitle('👤 Tu perfil')}

          {fieldLabel('Tu nombre', true)}
          <input value={owner.nombre} onChange={e => setO('nombre', e.target.value)}
            placeholder="¿Cómo te llamamos?" style={inp} />

          {fieldLabel('Foto de perfil (URL)')}
          <input type="url" value={owner.fotoPerfil} onChange={e => setO('fotoPerfil', e.target.value)}
            placeholder="https://…" style={inp} />
          {owner.fotoPerfil && (
            <div style={{ marginTop:8, width:60, height:60, borderRadius:16, overflow:'hidden',
              background:C.bgElevated }}>
              <img src={owner.fotoPerfil} alt="preview"
                style={{ width:'100%', height:'100%', objectFit:'cover' }}
                onError={e => { e.currentTarget.style.display = 'none' }} />
            </div>
          )}
        </div>

        {/* ── TU MASCOTA ── */}
        <div style={{ ...makeCard(C), padding:'18px', marginBottom:16 }}>
          {sectionTitle('🐾 Tu mascota')}

          {fieldLabel('Nombre de tu mascota', true)}
          <input value={pet.nombre} onChange={e => setP('nombre', e.target.value)}
            placeholder="Ej: Tobías, Luna, Max…" style={{ ...inp, fontSize:17, fontWeight:600 }} />

          {fieldLabel('Especie')}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:4 }}>
            {SPECIES.map(s => (
              <button key={s.id} type="button" onClick={() => setP('especie', s.id)} style={{
                borderRadius:20, padding:'7px 14px', cursor:'pointer',
                border:`1.5px solid ${pet.especie === s.id ? C.accent : C.border}`,
                background: pet.especie === s.id ? C.accent + '18' : C.bgElevated,
                fontFamily:F.body, fontSize:12, fontWeight:600,
                color: pet.especie === s.id ? C.accent : C.text,
                transition:'all 0.15s', display:'flex', alignItems:'center', gap:5,
              }}>
                <span>{s.emoji}</span> {s.label}
              </button>
            ))}
          </div>

          {fieldLabel('Raza')}
          <input value={pet.raza} onChange={e => setP('raza', e.target.value)}
            placeholder="Ej: Golden Retriever, Mestizo…" style={inp} />

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:14 }}>
            <div>
              {fieldLabel('Fecha de nacimiento')}
              <input type="date" value={pet.fechaNacimiento}
                onChange={e => setP('fechaNacimiento', e.target.value)} style={inp} />
            </div>
            <div>
              {fieldLabel('Sexo')}
              <select value={pet.sexo} onChange={e => setP('sexo', e.target.value)}
                style={{ ...inp, appearance:'none' }}>
                <option value="">Selecciona…</option>
                <option value="Macho">Macho</option>
                <option value="Hembra">Hembra</option>
              </select>
            </div>
          </div>

          {fieldLabel('Foto de tu mascota (URL)')}
          <input type="url" value={pet.foto} onChange={e => setP('foto', e.target.value)}
            placeholder="https://…" style={inp} />
          {pet.foto && (
            <div style={{ marginTop:8, borderRadius:12, overflow:'hidden', height:100,
              background:C.bgElevated }}>
              <img src={pet.foto} alt="preview"
                style={{ width:'100%', height:'100%', objectFit:'cover' }}
                onError={e => { e.currentTarget.style.display = 'none' }} />
            </div>
          )}
        </div>

        {error && (
          <div style={{ background:C.red + '18', border:`1px solid ${C.red}44`,
            borderRadius:12, padding:'11px 14px', marginBottom:14,
            fontFamily:F.body, fontSize:13, color:C.red }}>
            {error}
          </div>
        )}

        <button onClick={handleComplete} disabled={saving} style={{
          width:'100%', background:C.accent, color:C.bg, border:'none',
          borderRadius:14, padding:'15px', fontFamily:F.display, fontSize:16, fontWeight:700,
          cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
          boxShadow:`0 4px 18px ${C.accent}44`, transition:'all 0.2s',
        }}>
          {saving ? 'Guardando…' : '¡Comenzar con PetConnect! →'}
        </button>
      </div>
    </div>
  )
}
