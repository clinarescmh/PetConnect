import { useState } from 'react'
import { useTheme, F } from '../lib/theme'
import { supabase } from '../lib/supabase'

const CATEGORIAS = ['veterinaria', 'tienda', 'farmacia', 'grooming', 'alojamiento']

const PLANES = [
  {
    id: 'free',
    label: 'Gratis',
    price: '$0',
    color: '#8AAAC0',
    features: ['Aparece en listado', 'Nombre y teléfono', 'Sin imagen'],
  },
  {
    id: 'basic',
    label: 'Básico',
    price: '$9.990/mes',
    color: '#2DD4BF',
    features: ['Foto + descripción', 'Horario de atención', 'Botón WhatsApp'],
  },
  {
    id: 'premium',
    label: 'Premium ⭐',
    price: '$19.990/mes',
    color: '#FF8C00',
    features: ['Primero en resultados', 'Badge "Destacado"', 'Link web + visitas'],
  },
]

export default function BusinessForm({ onClose }) {
  const { C } = useTheme()
  const [plan, setPlan] = useState('free')
  const [form, setForm] = useState({
    nombre: '', categoria: '', telefono: '', email: '',
    direccion: '', descripcion: '', horario: '', foto: '', website: '',
  })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim() || !form.categoria) {
      setError('Nombre y categoría son obligatorios.')
      return
    }
    setError(null)
    setLoading(true)
    const payload = {
      nombre: form.nombre.trim(),
      categoria: form.categoria,
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      direccion: form.direccion.trim() || null,
      plan,
      active: true,
    }
    if (plan !== 'free') {
      payload.descripcion = form.descripcion.trim() || null
      payload.horario     = form.horario.trim() || null
      payload.foto        = form.foto.trim() || null
    }
    if (plan === 'premium') {
      payload.website = form.website.trim() || null
    }
    const { error: sbErr } = await supabase.from('businesses').insert(payload)
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

  /* ── Success ── */
  if (done) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 64 }}>✅</div>
      <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 22,
        color: C.text, marginTop: 20 }}>¡Registro recibido!</div>
      <div style={{ fontFamily: F.body, fontSize: 14, color: C.textSub,
        marginTop: 10, lineHeight: 1.6 }}>
        Tu negocio <strong style={{ color: C.accent }}>{form.nombre}</strong> ha sido registrado
        con plan <strong>{plan}</strong>.
        {form.email && <><br />Te contactaremos a <strong>{form.email}</strong>.</>}
      </div>
      <button onClick={onClose} style={{ marginTop: 32, background: C.accent,
        border: 'none', borderRadius: 14, padding: '14px 28px', fontFamily: F.display,
        fontSize: 15, fontWeight: 700, color: C.bg, cursor: 'pointer' }}>
        Volver a la app
      </button>
    </div>
  )

  const selectedPlan = PLANES.find(p => p.id === plan)

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
        <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 18, color: C.text }}>
          Registra tu negocio
        </span>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '20px 18px 40px', maxWidth: 460, width: '100%', margin: '0 auto' }}>

        {/* Plan selector */}
        <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: C.textMuted,
          textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Elige tu plan</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
          {PLANES.map(p => (
            <button key={p.id} type="button" onClick={() => setPlan(p.id)} style={{
              flex: 1, borderRadius: 16, padding: '12px 8px', cursor: 'pointer',
              border: `2px solid ${plan === p.id ? p.color : C.border}`,
              background: plan === p.id ? p.color + '18' : C.bgCard,
              transition: 'all 0.15s',
            }}>
              <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 13,
                color: plan === p.id ? p.color : C.text }}>{p.label}</div>
              <div style={{ fontFamily: F.body, fontSize: 10, color: C.textMuted,
                marginTop: 2 }}>{p.price}</div>
            </button>
          ))}
        </div>
        <div style={{ background: C.bgElevated, borderRadius: 12, padding: '10px 14px',
          marginBottom: 4 }}>
          {selectedPlan.features.map((f, i) => (
            <div key={i} style={{ fontFamily: F.body, fontSize: 12, color: C.textSub,
              marginTop: i ? 4 : 0 }}>✓ {f}</div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: C.border, margin: '24px 0 8px' }} />
        <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: C.textMuted,
          textTransform: 'uppercase', letterSpacing: 0.8 }}>Información del negocio</div>

        {label('Nombre', true)}
        <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
          placeholder="Ej: Clínica Veterinaria San Marcos" style={inputStyle} />

        {label('Categoría', true)}
        <select value={form.categoria} onChange={e => set('categoria', e.target.value)}
          style={{ ...inputStyle, appearance: 'none' }}>
          <option value="">Selecciona...</option>
          {CATEGORIAS.map(c => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>

        {label('Teléfono')}
        <input type="tel" value={form.telefono} onChange={e => set('telefono', e.target.value)}
          placeholder="+56 9 1234 5678" style={inputStyle} />

        {label('Email')}
        <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
          placeholder="negocio@email.com" style={inputStyle} />

        {label('Dirección')}
        <input value={form.direccion} onChange={e => set('direccion', e.target.value)}
          placeholder="Av. Providencia 123, Santiago" style={inputStyle} />

        {/* Basic + Premium fields */}
        {plan !== 'free' && (
          <>
            <div style={{ height: 1, background: C.border, margin: '24px 0 8px' }} />
            <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: C.textMuted,
              textTransform: 'uppercase', letterSpacing: 0.8 }}>Contenido</div>

            {label('Descripción')}
            <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
              rows={3} placeholder="Cuéntanos sobre tu negocio..."
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />

            {label('Horario de atención')}
            <input value={form.horario} onChange={e => set('horario', e.target.value)}
              placeholder="Lun–Vie 9:00–18:00, Sáb 9:00–14:00" style={inputStyle} />

            {label('URL de foto')}
            <input type="url" value={form.foto} onChange={e => set('foto', e.target.value)}
              placeholder="https://..." style={inputStyle} />
          </>
        )}

        {/* Premium-only fields */}
        {plan === 'premium' && (
          <>
            <div style={{ height: 1, background: C.border, margin: '24px 0 8px' }} />
            <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: C.textMuted,
              textTransform: 'uppercase', letterSpacing: 0.8 }}>Web</div>

            {label('Sitio web')}
            <input type="url" value={form.website} onChange={e => set('website', e.target.value)}
              placeholder="https://minegocio.cl" style={inputStyle} />
          </>
        )}

        {error && (
          <div style={{ background: '#FF525218', border: '1px solid #FF525244', borderRadius: 12,
            padding: '11px 14px', marginTop: 16, fontFamily: F.body, fontSize: 13, color: '#FF5252' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={{
          width: '100%', marginTop: 28, background: C.accent, border: 'none',
          borderRadius: 14, padding: '15px', fontFamily: F.display, fontSize: 15,
          fontWeight: 700, color: C.bg, cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s',
        }}>
          {loading ? 'Enviando...' : 'Enviar registro →'}
        </button>

        <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted,
          textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
          Al registrarte aceptas nuestros términos de servicio.{'\n'}
          Tu negocio aparecerá tras revisión.
        </div>
      </form>
    </div>
  )
}
