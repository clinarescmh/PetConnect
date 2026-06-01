import { useState } from 'react'
import { useTheme, F } from '../lib/theme'
import { supabase } from '../lib/supabase'

const SEXES = ['Macho', 'Hembra', 'No especificado']

export default function PetEdit({ pet, onSave, onClose }) {
  const { C } = useTheme()
  const [form, setForm] = useState({
    name:        pet.name        || '',
    breed:       pet.breed       || '',
    age:         pet.age         || '',
    sexo:        pet.sexo        || '',
    chip:        pet.chip        || '',
    descripcion: pet.descripcion || '',
    photo:       pet.photo       || '',
  })
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)
  const [success, setSuccess] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    setSaving(true); setError(null)

    const payload = {
      name:        form.name.trim(),
      breed:       form.breed.trim()       || null,
      age:         form.age.trim()         || null,
      chip:        form.chip.trim()        || null,
      descripcion: form.descripcion.trim() || null,
      photo:       form.photo.trim()       || null,
      sexo:        form.sexo               || null,
    }

    try {
      if (pet.dbId) {
        const { error: e } = await supabase.from('pets').update(payload).eq('id', pet.dbId)
        if (e) throw e
      } else {
        await supabase.from('pets').insert(payload).catch(() => {}) // silent if table missing
      }
      setSuccess(true)
      setTimeout(() => { onSave({ ...pet, ...payload }); onClose() }, 700)
    } catch (err) {
      setError(err?.message || 'Error al guardar — los cambios se aplicarán localmente.')
      // Apply locally even if Supabase fails
      setSuccess(true)
      setTimeout(() => { onSave({ ...pet, ...payload }); onClose() }, 900)
    } finally {
      setSaving(false)
    }
  }

  const inp = {
    width:'100%', background:C.bgElevated, border:`1px solid ${C.borderHi}`,
    borderRadius:12, padding:'12px 14px', fontFamily:F.body, fontSize:14,
    color:C.text, outline:'none', boxSizing:'border-box',
  }
  const lbl = (txt, req) => (
    <div style={{ fontFamily:F.body, fontSize:12, fontWeight:600,
      color:C.textSub, marginBottom:6, marginTop:14 }}>
      {txt}{req && <span style={{ color:C.accent }}> *</span>}
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, zIndex:350,
      background:C.bg, overflowY:'auto', maxWidth:420, margin:'0 auto' }}>
      <style>{`* { box-sizing:border-box }`}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'18px 18px 14px',
        background:C.bg, borderBottom:`1px solid ${C.border}`,
        position:'sticky', top:0, zIndex:10 }}>
        <button onClick={onClose} style={{ background:C.bgElevated, border:`1px solid ${C.border}`,
          borderRadius:10, width:34, height:34, display:'flex', alignItems:'center',
          justifyContent:'center', cursor:'pointer', fontSize:16, color:C.text }}>←</button>
        <span style={{ fontFamily:F.display, fontWeight:800, fontSize:18, color:C.text }}>
          Editar perfil de mascota
        </span>
      </div>

      <form onSubmit={handleSave} style={{ padding:'16px 18px 44px' }}>

        {/* Preview foto */}
        <div style={{ textAlign:'center', marginBottom:4 }}>
          <div style={{ width:100, height:100, borderRadius:30, overflow:'hidden',
            margin:'0 auto 10px', background:C.bgElevated,
            border:`2.5px solid ${C.accent}66` }}>
            {form.photo ? (
              <img src={form.photo} alt="preview"
                style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            ) : (
              <div style={{ width:'100%', height:'100%', display:'flex',
                alignItems:'center', justifyContent:'center', fontSize:42 }}>
                {pet.avatar || '🐾'}
              </div>
            )}
          </div>
        </div>

        {lbl('URL de foto')}
        <input value={form.photo} onChange={e => set('photo', e.target.value)}
          placeholder="https://…" style={inp} />

        {lbl('Nombre', true)}
        <input required value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="Nombre de tu mascota" style={inp} />

        {lbl('Raza')}
        <input value={form.breed} onChange={e => set('breed', e.target.value)}
          placeholder="Ej: Golden Retriever" style={inp} />

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            {lbl('Edad')}
            <input value={form.age} onChange={e => set('age', e.target.value)}
              placeholder="Ej: 3 años" style={inp} />
          </div>
          <div>
            {lbl('Sexo')}
            <select value={form.sexo} onChange={e => set('sexo', e.target.value)}
              style={{ ...inp, appearance:'none' }}>
              <option value="">Selecciona…</option>
              {SEXES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {lbl('Número de chip')}
        <input value={form.chip} onChange={e => set('chip', e.target.value)}
          placeholder="Ej: 985141003012345" style={inp} />

        {lbl('Descripción')}
        <textarea value={form.descripcion} rows={3}
          onChange={e => set('descripcion', e.target.value)}
          placeholder="Cuéntanos sobre tu mascota…"
          style={{ ...inp, resize:'vertical', lineHeight:1.5 }} />

        {error && (
          <div style={{ background:C.red + '18', border:`1px solid ${C.red}44`,
            borderRadius:12, padding:'11px 14px', marginTop:14,
            fontFamily:F.body, fontSize:12, color:C.red }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={saving} style={{
          width:'100%', marginTop:22,
          background: success ? C.teal : C.accent,
          border:'none', borderRadius:14, padding:'14px',
          fontFamily:F.display, fontSize:15, fontWeight:700,
          color: C.bg, cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1, transition:'all 0.2s',
        }}>
          {success ? '✓ Guardado' : saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}
