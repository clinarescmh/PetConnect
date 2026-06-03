import { useState } from 'react'
import { useTheme, F, makeCard } from '../lib/theme'

const CAT_COLORS = { salud:'#FF5252', legal:'#4A9EFF', cuidados:'#2DD4BF', comportamiento:'#9B6EF5' }
const CATS = ['salud','legal','cuidados','comportamiento']

const MOCK_CONSULTAS = [
  { id:1, titulo:'¿Cuántas veces al día debo alimentar a mi cachorro de 3 meses?',
    desc:'Tengo un Labrador de 3 meses y estoy confundida con las porciones y frecuencia de comida.',
    categoria:'cuidados', respuestas:8, autor:'@maria_pets', tiempo:'2h', urgente:false,
    respuestasTexto:[
      { autor:'@vet_carlos', texto:'A esa edad, 3-4 veces al día en porciones pequeñas. La comida seca para cachorros es ideal.', tiempo:'1h' },
      { autor:'@sofia_golden', texto:'Nosotros le dimos 3 veces hasta los 6 meses y le fue perfecto 🐾', tiempo:'45m' },
    ] },
  { id:2, titulo:'Mi gato tose constantemente — ¿debo preocuparme?',
    desc:'Mi gato persa de 2 años lleva 3 días con tos seca. Come normal pero la tos es frecuente.',
    categoria:'salud', respuestas:12, autor:'@pedro_gatos', tiempo:'5h', urgente:true,
    respuestasTexto:[
      { autor:'@vet_pedro', texto:'Puede ser bronquitis felina o asma. Te recomiendo ir al veterinario urgente si la tos es productiva.', tiempo:'4h' },
    ] },
  { id:3, titulo:'¿Hay ley que permita llevar perros al trabajo en Chile?',
    desc:'Trabajo en una oficina pet-friendly y quiero formalizar la política. ¿Existe normativa?',
    categoria:'legal', respuestas:3, autor:'@sofia_law', tiempo:'1d', urgente:false,
    respuestasTexto:[] },
]

const MOCK_DENUNCIAS = [
  { id:1, desc:'Perro amarrado sin agua ni comida hace 3 días. Tiene heridas visibles.',
    ubicacion:'Calle Los Álamos 234, Providencia', urgente:true, estado:'En revisión',
    tiempo:'3h', foto:null },
]

export default function CommunityScreen({ onClose }) {
  const { C } = useTheme()
  const [tab, setTab]             = useState('consultas')
  const [consultas, setConsultas] = useState(MOCK_CONSULTAS)
  const [denuncias, setDenuncias] = useState(MOCK_DENUNCIAS)
  const [showNewConsulta, setShowNewConsulta] = useState(false)
  const [expanded, setExpanded]   = useState(null)

  const [cForm, setCForm] = useState({ titulo:'', desc:'', categoria:'cuidados' })
  const [dForm, setDForm] = useState({ desc:'', ubicacion:'', foto:'', contacto:'', urgente:false })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]  = useState(false)

  const inp = { width:'100%', background:C.bgElevated, border:`1px solid ${C.borderHi}`,
    borderRadius:12, padding:'11px 14px', fontFamily:F.body, fontSize:14,
    color:C.text, outline:'none', boxSizing:'border-box' }

  const submitConsulta = () => {
    if (!cForm.titulo.trim()) return
    setSubmitting(true)
    const newC = { id:Date.now(), ...cForm, titulo:cForm.titulo.trim(), desc:cForm.desc.trim(),
      respuestas:0, autor:'@tú', tiempo:'ahora', urgente:false, respuestasTexto:[] }
    setTimeout(() => { setConsultas(c => [newC, ...c]); setSubmitting(false);
      setShowNewConsulta(false); setCForm({ titulo:'', desc:'', categoria:'cuidados' }) }, 400)
  }

  const submitDenuncia = () => {
    if (!dForm.desc.trim()) return
    setSubmitting(true)
    const newD = { id:Date.now(), ...dForm, desc:dForm.desc.trim(),
      estado:'Recibida', tiempo:'ahora' }
    setTimeout(() => { setDenuncias(d => [newD, ...d]); setSubmitting(false); setSubmitted(true) }, 400)
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:260, background:C.bg, overflowY:'auto', maxWidth:420, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'18px 18px 14px',
        background:C.bg, borderBottom:`1px solid ${C.border}`, position:'sticky', top:0, zIndex:10 }}>
        <button onClick={onClose} style={{ background:C.bgElevated, border:`1px solid ${C.border}`,
          borderRadius:10, width:34, height:34, display:'flex', alignItems:'center',
          justifyContent:'center', cursor:'pointer', fontSize:16, color:C.text }}>←</button>
        <span style={{ fontFamily:F.display, fontWeight:800, fontSize:18, color:C.text }}>
          Comunidad 💬
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', background:C.bgElevated, margin:'14px 18px 0', borderRadius:14, padding:4 }}>
        {[['consultas','❓ Consultas'],['denuncias','🚨 Denuncias']].map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex:1, border:'none', borderRadius:10,
            padding:'10px 4px', fontFamily:F.body, fontSize:12, fontWeight:600, cursor:'pointer',
            background:tab===id ? C.bgCard : 'transparent',
            color:tab===id ? C.text : C.textSub, transition:'all 0.15s' }}>{lbl}</button>
        ))}
      </div>

      <div style={{ padding:'14px 18px 48px' }}>

        {/* ══ CONSULTAS ══ */}
        {tab === 'consultas' && (
          <>
            <button onClick={() => setShowNewConsulta(s => !s)} style={{
              width:'100%', background:C.accent, color:C.bg, border:'none',
              borderRadius:14, padding:'12px', fontFamily:F.display, fontSize:14, fontWeight:700,
              cursor:'pointer', marginBottom:16 }}>
              {showNewConsulta ? '✕ Cancelar' : '+ Nueva consulta'}
            </button>

            {showNewConsulta && (
              <div style={{ ...makeCard(C), padding:'16px', marginBottom:16 }}>
                <input value={cForm.titulo} onChange={e => setCForm(f=>({...f,titulo:e.target.value}))}
                  placeholder="Título de tu consulta *" style={{ ...inp, marginBottom:10 }} />
                <textarea value={cForm.desc} onChange={e => setCForm(f=>({...f,desc:e.target.value}))}
                  rows={3} placeholder="Describe tu consulta con detalle…"
                  style={{ ...inp, resize:'vertical', lineHeight:1.5, marginBottom:10 }} />
                <select value={cForm.categoria} onChange={e => setCForm(f=>({...f,categoria:e.target.value}))}
                  style={{ ...inp, appearance:'none', marginBottom:12 }}>
                  {CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                </select>
                <button onClick={submitConsulta} disabled={submitting} style={{
                  width:'100%', background:C.teal, color:'#fff', border:'none',
                  borderRadius:12, padding:'11px', fontFamily:F.body, fontSize:13, fontWeight:600,
                  cursor:'pointer', opacity:submitting?0.7:1 }}>
                  {submitting ? 'Publicando…' : 'Publicar consulta →'}
                </button>
              </div>
            )}

            {consultas.map(c => (
              <div key={c.id} style={{ background:C.bgCard, borderRadius:16, padding:'14px',
                marginBottom:10, border:`1px solid ${c.urgente ? C.red+'44' : C.border}` }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:8 }}>
                  <div style={{ background:(CAT_COLORS[c.categoria]||C.accent)+'22',
                    borderRadius:8, padding:'3px 10px', fontFamily:F.body, fontSize:10,
                    fontWeight:700, color:CAT_COLORS[c.categoria]||C.accent, flexShrink:0 }}>
                    {c.categoria}
                  </div>
                  {c.urgente && <div style={{ background:C.red+'22', borderRadius:8, padding:'3px 10px',
                    fontFamily:F.body, fontSize:10, fontWeight:700, color:C.red }}>URGENTE</div>}
                </div>
                <div style={{ fontFamily:F.body, fontWeight:700, fontSize:14, color:C.text, marginBottom:5, lineHeight:1.35 }}>
                  {c.titulo}
                </div>
                <div style={{ fontFamily:F.body, fontSize:12, color:C.textSub, marginBottom:10, lineHeight:1.5 }}>
                  {c.desc}
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ fontFamily:F.body, fontSize:11, color:C.textMuted }}>
                    {c.autor} · {c.tiempo}
                  </div>
                  <button onClick={() => setExpanded(expanded===c.id ? null : c.id)}
                    style={{ background:C.bgElevated, border:`1px solid ${C.border}`,
                      borderRadius:10, padding:'4px 12px', fontFamily:F.body, fontSize:11,
                      fontWeight:600, color:C.teal, cursor:'pointer' }}>
                    💬 {c.respuestas} respuesta{c.respuestas !== 1 ? 's' : ''}
                  </button>
                </div>
                {/* Respuestas expandidas */}
                {expanded === c.id && c.respuestasTexto.length > 0 && (
                  <div style={{ marginTop:10, borderTop:`1px solid ${C.border}`, paddingTop:10 }}>
                    {c.respuestasTexto.map((r, i) => (
                      <div key={i} style={{ background:C.bgElevated, borderRadius:10, padding:'10px 12px', marginBottom:8 }}>
                        <div style={{ fontFamily:F.body, fontSize:11, fontWeight:700, color:C.teal }}>{r.autor} · {r.tiempo}</div>
                        <div style={{ fontFamily:F.body, fontSize:12, color:C.text, marginTop:3 }}>{r.texto}</div>
                      </div>
                    ))}
                    {c.respuestasTexto.length === 0 && (
                      <div style={{ fontFamily:F.body, fontSize:12, color:C.textMuted, textAlign:'center' }}>Sin respuestas aún</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* ══ DENUNCIAS ══ */}
        {tab === 'denuncias' && (
          <>
            <div style={{ background:C.red+'18', border:`1px solid ${C.red}44`, borderRadius:16,
              padding:'14px', marginBottom:16, display:'flex', gap:12 }}>
              <span style={{ fontSize:28 }}>🚨</span>
              <div>
                <div style={{ fontFamily:F.display, fontWeight:700, fontSize:14, color:C.red }}>
                  Reporta maltrato animal
                </div>
                <div style={{ fontFamily:F.body, fontSize:12, color:C.textSub, marginTop:3, lineHeight:1.5 }}>
                  Todas las denuncias son revisadas y derivadas a autoridades si corresponde.
                </div>
              </div>
            </div>

            {submitted ? (
              <div style={{ textAlign:'center', padding:'24px', background:C.bgCard, borderRadius:16, marginBottom:16 }}>
                <div style={{ fontSize:48 }}>✅</div>
                <div style={{ fontFamily:F.display, fontWeight:700, fontSize:16, color:C.text, marginTop:10 }}>
                  Denuncia recibida
                </div>
                <div style={{ fontFamily:F.body, fontSize:12, color:C.textSub, marginTop:6 }}>
                  Será revisada a la brevedad.
                </div>
              </div>
            ) : (
              <div style={{ ...makeCard(C), padding:'16px', marginBottom:16 }}>
                {[['desc','Descripción de lo que ocurre *','textarea'],
                  ['ubicacion','Dirección o zona','text'],
                  ['foto','URL de foto (opcional)','url'],
                  ['contacto','Tu contacto (opcional)','text']].map(([k, ph, t]) => (
                  <div key={k} style={{ marginBottom:10 }}>
                    {t === 'textarea' ? (
                      <textarea value={dForm[k]} onChange={e => setDForm(f=>({...f,[k]:e.target.value}))}
                        rows={3} placeholder={ph} style={{ ...inp, resize:'vertical', lineHeight:1.5 }} />
                    ) : (
                      <input type={t} value={dForm[k]} onChange={e => setDForm(f=>({...f,[k]:e.target.value}))}
                        placeholder={ph} style={inp} />
                    )}
                  </div>
                ))}
                <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer',
                  fontFamily:F.body, fontSize:13, color:C.text, marginBottom:14 }}>
                  <div onClick={() => setDForm(f=>({...f,urgente:!f.urgente}))} style={{
                    width:20, height:20, borderRadius:6, border:`2px solid ${dForm.urgente ? C.red : C.border}`,
                    background:dForm.urgente ? C.red : 'transparent', display:'flex',
                    alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                    {dForm.urgente && <span style={{ color:'#fff', fontSize:12 }}>✓</span>}
                  </div>
                  ⚡ Caso urgente — animal en peligro inmediato
                </label>
                <button onClick={submitDenuncia} disabled={submitting} style={{
                  width:'100%', background:C.red, color:'#fff', border:'none',
                  borderRadius:14, padding:'13px', fontFamily:F.display, fontSize:14, fontWeight:700,
                  cursor:'pointer', opacity:submitting?0.7:1 }}>
                  {submitting ? 'Enviando…' : '🚨 Enviar denuncia'}
                </button>
              </div>
            )}

            {denuncias.map(d => (
              <div key={d.id} style={{ background:C.bgCard, borderRadius:14, padding:'14px',
                marginBottom:8, border:`1px solid ${d.urgente ? C.red+'44' : C.border}` }}>
                {d.urgente && <div style={{ background:C.red, borderRadius:8, padding:'3px 10px',
                  fontFamily:F.body, fontSize:10, fontWeight:700, color:'#fff',
                  display:'inline-block', marginBottom:8 }}>⚡ URGENTE</div>}
                <div style={{ fontFamily:F.body, fontSize:13, color:C.text, lineHeight:1.5, marginBottom:6 }}>{d.desc}</div>
                {d.ubicacion && <div style={{ fontFamily:F.body, fontSize:11, color:C.textSub }}>📍 {d.ubicacion}</div>}
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
                  <span style={{ fontFamily:F.body, fontSize:11, color:C.textMuted }}>{d.tiempo}</span>
                  <span style={{ fontFamily:F.body, fontSize:11, fontWeight:600,
                    color:d.estado==='En revisión' ? C.amber : C.teal }}>● {d.estado}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
