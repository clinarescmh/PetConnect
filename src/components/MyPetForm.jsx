/**
 * MyPetForm — formulario de mascota para primera vez y edición.
 * Guarda en localStorage key 'petconnect_my_pet'.
 *
 * Props:
 *  mode       'welcome' | 'edit'
 *  initialData  objeto con datos previos (para modo edit)
 *  onSave(data)  callback cuando se guarda
 *  onClose       callback para cerrar (modo edit)
 *  onSkip        callback para "Lo haré después" (modo welcome, opcional)
 */
import { useState } from 'react'
import { useTheme, F } from '../lib/theme'

export { PETS_KEY as PET_LS_KEY, OWNER_KEY as OWNER_LS_KEY } from '../lib/pets'
import { PETS_KEY, OWNER_KEY, loadPets, savePets, genId, suggestUsername } from '../lib/pets'

export const SPECIES = [
  { id:'perro',  emoji:'🐕', label:'Perro'  },
  { id:'gato',   emoji:'🐈', label:'Gato'   },
  { id:'conejo', emoji:'🐰', label:'Conejo' },
  { id:'ave',    emoji:'🦜', label:'Ave'    },
  { id:'otro',   emoji:'🐾', label:'Otro'   },
]

export function calcAge(fechaNacimiento) {
  if (!fechaNacimiento) return null
  const birth = new Date(fechaNacimiento)
  const now   = new Date()
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (months <= 0) return 'Recién nacido'
  if (months < 12) return `${months} mes${months > 1 ? 'es' : ''}`
  const years = Math.floor(months / 12)
  return `${years} año${years > 1 ? 's' : ''}`
}

export default function MyPetForm({ mode = 'welcome', initialData, onSave, onClose, onSkip }) {
  const { C } = useTheme()

  const [form, setForm] = useState({
    nombre:          initialData?.nombre          || '',
    username:        initialData?.username        || '',
    especie:         initialData?.especie         || '',
    raza:            initialData?.raza            || '',
    fechaNacimiento: initialData?.fechaNacimiento || '',
    sexo:            initialData?.sexo            || '',
    foto:            initialData?.foto            || '',
  })
  const [usernameTouched, setUsernameTouched] = useState(!!initialData?.username)
  const [saving, setSaving] = useState(false)
  const [done,   setDone]   = useState(false)
  const [error,  setError]  = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Auto-sugerir username si no fue editado manualmente
  const handleNombreChange = (v) => {
    set('nombre', v)
    if (!usernameTouched && v) set('username', suggestUsername(v, form.especie))
  }
  const handleEspecieChange = (v) => {
    set('especie', v)
    if (!usernameTouched && form.nombre) set('username', suggestUsername(form.nombre, v))
  }

  const selectedSpecies = SPECIES.find(s => s.id === form.especie)

  const handleSave = () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    setError(null); setSaving(true)
    const data = {
      ...form,
      id:       initialData?.id || genId(),
      nombre:   form.nombre.trim(),
      username: (form.username || suggestUsername(form.nombre, form.especie)).trim(),
    }
    // Guardar en array de mascotas
    const pets = loadPets()
    const idx  = pets.findIndex(p => p.id === data.id)
    const updated = idx >= 0 ? pets.map((p, i) => i === idx ? data : p) : [...pets, data]
    savePets(updated)
    setTimeout(() => { setSaving(false); setDone(true); setTimeout(() => onSave?.(data), 700) }, 300)
  }

  const inp = {
    width:'100%', background:C.bgElevated, border:`1px solid ${C.borderHi}`,
    borderRadius:12, padding:'12px 14px', fontFamily:F.body, fontSize:14,
    color:C.text, outline:'none', boxSizing:'border-box',
  }

  /* ── Pantalla de éxito ── */
  if (done) return (
    <div style={{ position:'fixed', inset:0, zIndex:400, background:C.bg, maxWidth:'var(--app-max)', margin:'0 auto',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14 }}>
      <div style={{ fontSize:72 }}>{selectedSpecies?.emoji || '🐾'}</div>
      <div style={{ fontFamily:F.display, fontWeight:800, fontSize:22, color:C.text }}>
        ¡Hola, {form.nombre}!
      </div>
      <div style={{ fontFamily:F.body, fontSize:14, color:C.textSub }}>
        Tu mascota ya está configurada 🎉
      </div>
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, zIndex:400, background:C.bg,
      overflowY:'auto', overflowX:'hidden', maxWidth:'var(--app-max)', margin:'0 auto' }}>
      <style>{`* { box-sizing: border-box; }`}</style>

      {/* ── Header según modo ── */}
      {mode === 'edit' ? (
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'18px 18px 14px',
          background:C.bg, borderBottom:`1px solid ${C.border}`, position:'sticky', top:0, zIndex:10 }}>
          <button onClick={onClose} style={{ background:C.bgElevated, border:`1px solid ${C.border}`,
            borderRadius:10, width:34, height:34, display:'flex', alignItems:'center',
            justifyContent:'center', cursor:'pointer', fontSize:16, color:C.text }}>←</button>
          <span style={{ fontFamily:F.display, fontWeight:800, fontSize:18, color:C.text }}>
            Editar mascota
          </span>
        </div>
      ) : (
        <div style={{ padding:'52px 28px 28px', textAlign:'center' }}>
          {/* Emoji animado que cambia con la especie */}
          <div style={{ fontSize:80, marginBottom:16, lineHeight:1 }}>
            {selectedSpecies?.emoji || '🐾'}
          </div>
          <div style={{ fontFamily:F.display, fontWeight:800, fontSize:26,
            color:C.text, lineHeight:1.2, marginBottom:8 }}>
            ¿Cómo se llama<br/>tu mascota?
          </div>
          <div style={{ fontFamily:F.body, fontSize:14, color:C.textSub, lineHeight:1.5 }}>
            Configura el perfil de tu compañero
          </div>
        </div>
      )}

      {/* ── Formulario ── */}
      <div style={{ padding: mode === 'edit' ? '20px 18px 44px' : '0 18px 44px' }}>

        {/* Nombre */}
        <div style={{ fontFamily:F.body, fontSize:12, fontWeight:600, color:C.textSub, marginBottom:6 }}>
          Nombre <span style={{ color:C.accent }}>*</span>
        </div>
        <input
          autoFocus={mode === 'welcome'}
          value={form.nombre}
          onChange={e => handleNombreChange(e.target.value)}
          placeholder="Ej: Tobías, Luna, Max…"
          style={{ ...inp, marginBottom:8, fontSize:18, fontWeight:600 }}
        />
        {/* @username */}
        <div style={{ display:'flex', alignItems:'center', background:C.bgElevated,
          border:`1px solid ${C.borderHi}`, borderRadius:12, padding:'10px 14px',
          marginBottom:16, gap:4 }}>
          <span style={{ fontFamily:F.body, fontSize:14, color:C.teal, fontWeight:600 }}>@</span>
          <input value={form.username || ''}
            onChange={e => { setUsernameTouched(true); set('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'')) }}
            placeholder="username_único"
            style={{ border:'none', background:'none', fontFamily:F.body, fontSize:14,
              color:C.text, outline:'none', flex:1 }} />
        </div>

        {/* Especie */}
        <div style={{ fontFamily:F.body, fontSize:12, fontWeight:600, color:C.textSub, marginBottom:8 }}>
          Especie
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
          {SPECIES.map(s => (
            <button key={s.id} type="button" onClick={() => handleEspecieChange(s.id)} style={{
              borderRadius:20, padding:'7px 14px', cursor:'pointer',
              border:`1.5px solid ${form.especie === s.id ? C.accent : C.border}`,
              background: form.especie === s.id ? C.accent + '18' : C.bgElevated,
              fontFamily:F.body, fontSize:12, fontWeight:600,
              color: form.especie === s.id ? C.accent : C.text,
              transition:'all 0.15s', display:'flex', alignItems:'center', gap:5,
            }}>
              <span>{s.emoji}</span> {s.label}
            </button>
          ))}
        </div>

        {/* Raza */}
        <div style={{ fontFamily:F.body, fontSize:12, fontWeight:600, color:C.textSub, marginBottom:6 }}>
          Raza
        </div>
        <input value={form.raza} onChange={e => set('raza', e.target.value)}
          placeholder="Ej: Golden Retriever, Mestizo…" style={{ ...inp, marginBottom:16 }} />

        {/* Fecha nacimiento + sexo */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
          <div>
            <div style={{ fontFamily:F.body, fontSize:12, fontWeight:600, color:C.textSub, marginBottom:6 }}>
              Fecha de nacimiento
            </div>
            <input type="date" value={form.fechaNacimiento}
              onChange={e => set('fechaNacimiento', e.target.value)}
              style={{ ...inp }} />
            {form.fechaNacimiento && (
              <div style={{ fontFamily:F.body, fontSize:11, color:C.teal, marginTop:4 }}>
                {calcAge(form.fechaNacimiento)}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontFamily:F.body, fontSize:12, fontWeight:600, color:C.textSub, marginBottom:6 }}>
              Sexo
            </div>
            <select value={form.sexo} onChange={e => set('sexo', e.target.value)}
              style={{ ...inp, appearance:'none', cursor:'pointer' }}>
              <option value="">Selecciona…</option>
              <option value="Macho">Macho</option>
              <option value="Hembra">Hembra</option>
            </select>
          </div>
        </div>

        {/* Foto */}
        <div style={{ fontFamily:F.body, fontSize:12, fontWeight:600, color:C.textSub, marginBottom:6 }}>
          Foto (URL de imagen)
        </div>
        <input type="url" value={form.foto} onChange={e => set('foto', e.target.value)}
          placeholder="https://…" style={{ ...inp, marginBottom:4 }} />
        {form.foto && (
          <div style={{ marginBottom:16, borderRadius:12, overflow:'hidden', height:120, background:C.bgElevated }}>
            <img src={form.foto} alt="preview"
              style={{ width:'100%', height:'100%', objectFit:'cover' }}
              onError={e => { e.currentTarget.style.display = 'none' }} />
          </div>
        )}

        {error && (
          <div style={{ background:C.red + '18', border:`1px solid ${C.red}44`,
            borderRadius:12, padding:'11px 14px', marginBottom:14,
            fontFamily:F.body, fontSize:13, color:C.red }}>
            {error}
          </div>
        )}

        {/* Botones */}
        <button onClick={handleSave} disabled={saving} style={{
          width:'100%', background:C.accent, color:C.bg, border:'none',
          borderRadius:14, padding:'14px', fontFamily:F.display, fontSize:15, fontWeight:700,
          cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
          transition:'all 0.2s', marginBottom: onSkip ? 12 : 0,
        }}>
          {saving ? 'Guardando…' : mode === 'edit' ? 'Guardar cambios' : 'Continuar →'}
        </button>

        {onSkip && mode === 'welcome' && (
          <button onClick={onSkip} style={{ width:'100%', background:'none', border:'none',
            fontFamily:F.body, fontSize:13, color:C.textSub, cursor:'pointer', padding:'10px' }}>
            Lo haré después →
          </button>
        )}
      </div>
    </div>
  )
}
