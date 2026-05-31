import { useState } from 'react'
import { useTheme, F } from '../lib/theme'
import { supabase } from '../lib/supabase'

const SERVICES = ['Paseos', 'Guardería', 'Alojamiento', 'Cuidado en casa']
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function WalkerForm({ onClose }) {
  const { C } = useTheme()
  const [form, setForm] = useState({
    nombre: '', telefono: '', email: '', zona: '',
    descripcion: '', precio: '', experiencia: '',
    redes: '', tiene_seguro: false, tiene_certificacion: false,
  })
  const [services, setServices]       = useState([])
  const [availability, setAvailability] = useState([])
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleService = s => setServices(prev =>
    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
  )
  const toggleDay = d => setAvailability(prev =>
    prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim() || !form.telefono.trim()) {
      setError('Nombre y teléfono son obligatorios.')
      return
    }
    setError(null)
    setLoading(true)

    const payload = {
      name:                 form.nombre.trim(),
      telefono:             form.telefono.trim(),
      email:                form.email.trim()       || null,
      zona:                 form.zona.trim()         || null,
      descripcion:          form.descripcion.trim() || null,
      price:                form.precio ? Number(form.precio) : null,
      experiencia:          form.experiencia ? Number(form.experiencia) : null,
      redes:                form.redes.trim()        || null,
      tiene_seguro:         form.tiene_seguro,
      tiene_certificacion:  form.tiene_certificacion,
      services:             services.length ? services : null,
      disponibilidad:       availability.length ? availability.join(', ') : null,
      estado:               'pendiente',
      verified:             false,
      available:            true,
    }

    const { error: sbErr } = await supabase.from('walkers').insert(payload)
    setLoading(false)
    if (sbErr) setError(sbErr.message)
    else setDone(true)
  }

  /* ── Input helper ── */
  const inputStyle = {
    width: '100%', background: C.bgElevated, border: `1px solid ${C.borderHi}`,
    borderRadius: 12, padding: '12px 14px', fontFamily: F.body, fontSize: 14,
    color: C.text, outline: 'none', boxSizing: 'border-box',
  }
  const label = (txt, req) => (
    <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600,
      color: C.textSub, marginBottom: 6, marginTop: 16 }}>
      {txt}{req && <span style={{ color: C.accent }}> *</span>}
    </div>
  )
  const section = (txt) => (
    <>
      <div style={{ height: 1, background: C.border, margin: '24px 0 8px' }} />
      <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: C.textMuted,
        textTransform: 'uppercase', letterSpacing: 0.8 }}>{txt}</div>
    </>
  )

  /* ── Success ── */
  if (done) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 64 }}>🦮</div>
      <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 22,
        color: C.text, marginTop: 20 }}>¡Solicitud enviada!</div>
      <div style={{ fontFamily: F.body, fontSize: 14, color: C.textSub,
        marginTop: 10, lineHeight: 1.6 }}>
        Tu perfil de paseador <strong style={{ color: C.teal }}>{form.nombre}</strong> está
        siendo revisado.<br />Recibirás el badge <strong>✅ Verificado</strong> una vez aprobado.
        {form.email && <><br />Te avisaremos a <strong>{form.email}</strong>.</>}
      </div>
      <button onClick={onClose} style={{ marginTop: 32, background: C.teal,
        border: 'none', borderRadius: 14, padding: '14px 28px', fontFamily: F.display,
        fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
        Volver a la app
      </button>
    </div>
  )

  return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex',
      flexDirection: 'column', overflowY: 'auto' }}>
      <style>{`* { box-sizing: border-box; } body { margin: 0; }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 18px 14px',
        background: C.bg, borderBottom: `1px solid ${C.border}`,
        position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={onClose} style={{ background: C.bgElevated, border: `1px solid ${C.border}`,
          borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer', fontSize: 16, color: C.text }}>←</button>
        <div>
          <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 18, color: C.text }}>
            Únete como paseador
          </div>
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.textSub }}>
            Verificación en 24–48h · Gratis
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ margin: '16px 18px 0', background: `${C.teal}18`,
        border: `1px solid ${C.teal}44`, borderRadius: 14, padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>✅</span>
        <div style={{ fontFamily: F.body, fontSize: 12, color: C.teal, fontWeight: 600 }}>
          El badge "Verificado" aparece tras revisión del equipo PetConnect
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '16px 18px 40px', maxWidth: 460, width: '100%', margin: '0 auto' }}>

        {section('Datos personales')}

        {label('Nombre completo', true)}
        <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
          placeholder="Tu nombre completo" style={inputStyle} />

        {label('Teléfono', true)}
        <input type="tel" value={form.telefono} onChange={e => set('telefono', e.target.value)}
          placeholder="+56 9 1234 5678" style={inputStyle} />

        {label('Email')}
        <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
          placeholder="tu@email.com" style={inputStyle} />

        {label('Zona de cobertura')}
        <input value={form.zona} onChange={e => set('zona', e.target.value)}
          placeholder="Ej: Providencia, Las Condes, Ñuñoa" style={inputStyle} />

        {section('Servicios y precio')}

        {label('Servicios que ofreces')}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
          {SERVICES.map(s => (
            <button key={s} type="button" onClick={() => toggleService(s)} style={{
              borderRadius: 20, padding: '7px 14px', cursor: 'pointer',
              border: `1.5px solid ${services.includes(s) ? C.teal : C.border}`,
              background: services.includes(s) ? `${C.teal}18` : C.bgElevated,
              fontFamily: F.body, fontSize: 12, fontWeight: 600,
              color: services.includes(s) ? C.teal : C.textSub,
              transition: 'all 0.15s',
            }}>
              {services.includes(s) ? '✓ ' : ''}{s}
            </button>
          ))}
        </div>

        {label('Precio por paseo (CLP)')}
        <input type="number" value={form.precio} onChange={e => set('precio', e.target.value)}
          placeholder="Ej: 8000" style={inputStyle} min={0} />

        {section('Disponibilidad')}

        {label('Días disponibles')}
        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          {DAYS.map(d => (
            <button key={d} type="button" onClick={() => toggleDay(d)} style={{
              flex: 1, borderRadius: 10, padding: '8px 4px', cursor: 'pointer',
              border: `1.5px solid ${availability.includes(d) ? C.accent : C.border}`,
              background: availability.includes(d) ? `${C.accent}18` : C.bgElevated,
              fontFamily: F.body, fontSize: 11, fontWeight: 600,
              color: availability.includes(d) ? C.accent : C.textSub,
              transition: 'all 0.15s',
            }}>{d}</button>
          ))}
        </div>

        {section('Experiencia')}

        {label('Años de experiencia')}
        <input type="number" value={form.experiencia} onChange={e => set('experiencia', e.target.value)}
          placeholder="Ej: 3" style={inputStyle} min={0} max={50} />

        {/* Checkboxes */}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['tiene_seguro',        '🛡️ Tengo seguro de responsabilidad civil'],
            ['tiene_certificacion', '🎓 Tengo certificación en cuidado animal'],
          ].map(([key, text]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', fontFamily: F.body, fontSize: 13, color: C.text }}>
              <div onClick={() => set(key, !form[key])} style={{
                width: 20, height: 20, borderRadius: 6, border: `2px solid ${form[key] ? C.accent : C.border}`,
                background: form[key] ? C.accent : 'transparent', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'all 0.15s', cursor: 'pointer',
              }}>
                {form[key] && <span style={{ color: C.bg, fontSize: 12, fontWeight: 700 }}>✓</span>}
              </div>
              {text}
            </label>
          ))}
        </div>

        {section('Sobre ti')}

        {label('Descripción')}
        <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
          rows={3} placeholder="Cuéntanos sobre tu experiencia con mascotas..."
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />

        {label('Redes sociales')}
        <input value={form.redes} onChange={e => set('redes', e.target.value)}
          placeholder="@usuario o https://instagram.com/..." style={inputStyle} />

        {error && (
          <div style={{ background: '#FF525218', border: '1px solid #FF525244', borderRadius: 12,
            padding: '11px 14px', marginTop: 16, fontFamily: F.body, fontSize: 13, color: '#FF5252' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={{
          width: '100%', marginTop: 28, background: C.teal, border: 'none',
          borderRadius: 14, padding: '15px', fontFamily: F.display, fontSize: 15,
          fontWeight: 700, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s',
        }}>
          {loading ? 'Enviando...' : 'Enviar solicitud →'}
        </button>

        <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted,
          textAlign: 'center', marginTop: 14 }}>
          Tu perfil quedará como "Pendiente" hasta ser verificado.
        </div>
      </form>
    </div>
  )
}
