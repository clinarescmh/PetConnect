import { useState, useMemo } from 'react'
import { useTheme, F } from '../lib/theme'
import { supabase } from '../lib/supabase'
import PetEdit   from './PetEdit'
import FamilyTree, { DEMO_RELATIONS } from './FamilyTree'
import { loadPets, loadFollowing, toggleFollow } from '../lib/pets'

/* ── Mascotas conocidas (para selector de vínculo) ── */
const ALL_PETS_DEMO = [
  { id:1, name:'Tobías', photo:'/Golden_retriever.jpeg' },
  { id:2, name:'Luna',   photo:'/Gato_persa.jpeg'       },
  { id:3, name:'Max',    photo:'/Labrador.jpeg'         },
  { id:4, name:'Bella',  photo:'/Beagle.jpeg'           },
  { id:5, name:'Coco',   photo:'/Conejo.jpeg'           },
]

const RELATION_TYPES = ['padre','madre','hijo','hermano','primo','media sangre']

/* ── Filtra las relaciones relevantes para una mascota ── */
function relationsFor(petId, all) {
  return all.filter(r => r.pet1.id === petId || r.pet2.id === petId)
}

/* ── Modal "Vincular mascota" ── */
function LinkModal({ fromPet, existingIds, onClose, onLinked }) {
  const { C } = useTheme()
  const [targetId, setTargetId]   = useState('')
  const [relType,  setRelType]    = useState('hermano')
  const [sending,  setSending]    = useState(false)
  const [done,     setDone]       = useState(false)

  const available = ALL_PETS_DEMO.filter(p =>
    p.id !== fromPet.id && !existingIds.has(p.id)
  )

  const handleSend = async () => {
    if (!targetId) return
    setSending(true)

    const target = ALL_PETS_DEMO.find(p => p.id === parseInt(targetId))
    const payload = {
      pet_id_1: fromPet.id, pet_id_2: parseInt(targetId),
      relation_type: relType, status: 'pending',
    }

    await supabase.from('pet_relations').insert(payload).catch(() => {})
    setSending(false)
    setDone(true)

    // Añadir localmente en estado "pending"
    if (target) {
      onLinked({
        pet1: { id: fromPet.id, name: fromPet.name, photo: fromPet.photo },
        pet2: target,
        type: relType, status: 'pending',
      })
    }
    setTimeout(onClose, 1200)
  }

  const inp = {
    width:'100%', background:C.bgElevated, border:`1px solid ${C.borderHi}`,
    borderRadius:12, padding:'12px 14px', fontFamily:F.body, fontSize:14,
    color:C.text, outline:'none', boxSizing:'border-box',
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:360,
      display:'flex', alignItems:'flex-end', justifyContent:'center',
      background:'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div style={{ width:'100%', maxWidth:420,
        background:C.bgCard, borderRadius:'24px 24px 0 0',
        padding:'24px 20px 44px', boxShadow:'0 -8px 32px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily:F.display, fontWeight:800, fontSize:18,
          color:C.text, marginBottom:4 }}>Vincular mascota</div>
        <div style={{ fontFamily:F.body, fontSize:13, color:C.textSub, marginBottom:20 }}>
          El dueño de la otra mascota deberá aprobar el vínculo.
        </div>

        {done ? (
          <div style={{ textAlign:'center', padding:'12px 0' }}>
            <div style={{ fontSize:40 }}>✅</div>
            <div style={{ fontFamily:F.body, fontWeight:600, fontSize:14,
              color:C.teal, marginTop:8 }}>Solicitud enviada · pendiente de aprobación</div>
          </div>
        ) : (
          <>
            <div style={{ fontFamily:F.body, fontSize:12, fontWeight:600,
              color:C.textSub, marginBottom:6 }}>Selecciona la mascota</div>
            <select value={targetId} onChange={e => setTargetId(e.target.value)}
              style={{ ...inp, marginBottom:14, appearance:'none' }}>
              <option value="">Elige una mascota…</option>
              {available.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <div style={{ fontFamily:F.body, fontSize:12, fontWeight:600,
              color:C.textSub, marginBottom:6 }}>Tipo de relación</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:20 }}>
              {RELATION_TYPES.map(t => (
                <button key={t} type="button" onClick={() => setRelType(t)} style={{
                  borderRadius:20, padding:'6px 14px', cursor:'pointer',
                  border:`1.5px solid ${relType===t ? C.teal : C.border}`,
                  background: relType===t ? C.teal + '18' : C.bgElevated,
                  fontFamily:F.body, fontSize:12, fontWeight:600,
                  color: relType===t ? C.teal : C.textSub,
                  textTransform:'capitalize', transition:'all 0.15s',
                }}>{t}</button>
              ))}
            </div>

            <button onClick={handleSend} disabled={!targetId || sending} style={{
              width:'100%', background:C.teal, color:'#fff', border:'none',
              borderRadius:14, padding:'14px', fontFamily:F.display,
              fontSize:15, fontWeight:700, cursor: !targetId ? 'not-allowed' : 'pointer',
              opacity: !targetId || sending ? 0.6 : 1, transition:'opacity 0.15s',
            }}>
              {sending ? 'Enviando…' : '🔗 Enviar solicitud'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/* ── PetProfile principal ── */
export default function PetProfile({ post, allPosts = [], onClose }) {
  const { C } = useTheme()

  // Guard crítico — nunca debe recibir null/undefined, pero si pasa devuelve null limpio
  if (!post) return null

  const [petData,    setPetData]    = useState(post)
  const [shared,     setShared]     = useState(false)
  const [editMode,   setEditMode]   = useState(false)
  const [showLink,   setShowLink]   = useState(false)

  // Follow state (desde localStorage)
  const petFollowId = (petData?.username) || String(petData?.id ?? 'demo')
  const [isFollowing, setIsFollowing] = useState(() => loadFollowing().includes(petFollowId))

  // Construye relaciones: demo + hermanos de hogar automáticos (con guard para evitar crash)
  const [extraRels] = useState(() => {
    try {
      const myPets = loadPets()
      const petName = petData?.name || ''
      return (myPets || [])
        .filter(p => p?.nombre && p.nombre !== petName)
        .map((p, i) => ({
          pet1: { id: petData?.id ?? 1, name: petName,  photo: petData?.photo || null },
          pet2: { id: p.id || 100 + i,  name: p.nombre, photo: p.foto  || null },
          type: 'hermano de hogar', status: 'approved',
        }))
    } catch { return [] }
  })
  const [relations, setRelations] = useState([...DEMO_RELATIONS, ...extraRels])

  const petId    = petData.id ?? 1
  const myRels   = relationsFor(petId, relations)
  const linkedIds = new Set(myRels.flatMap(r => [r.pet1.id, r.pet2.id]).filter(id => id !== petId))

  const petPosts = allPosts.filter(p =>
    (p.name && p.name === petData.name) ||
    (!petData.name && p.breed === petData.breed && p.owner === petData.owner)
  )
  const totalLikes = petPosts.reduce((s, p) => s + (p.likes || 0), 0)

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${petData.name || petData.breed} en PetConnect`,
        text:  `¡Mira el perfil de ${petData.name || 'esta mascota'} en PetConnect!`,
        url:   window.location.href,
      }).catch(() => {})
    }
    setShared(true)
    setTimeout(() => setShared(false), 2000)
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:250,
      background:C.bg, overflowY:'auto', maxWidth:420, margin:'0 auto' }}>

      {/* Formulario de edición */}
      {editMode && (
        <PetEdit
          pet={petData}
          onSave={updated => setPetData(updated)}
          onClose={() => setEditMode(false)}
        />
      )}

      {/* Modal de vínculo */}
      {showLink && (
        <LinkModal
          fromPet={{ id:petId, name:petData.name, photo:petData.photo }}
          existingIds={linkedIds}
          onClose={() => setShowLink(false)}
          onLinked={rel => setRelations(r => [...r, rel])}
        />
      )}

      {/* ── Hero ── */}
      <div style={{ position:'relative', height:300, flexShrink:0 }}>
        {petData.photo ? (
          <img src={petData.photo} alt={petData.name}
            style={{ width:'100%', height:'100%', objectFit:'cover',
              objectPosition:'center 15%', display:'block' }} />
        ) : (
          <div style={{ width:'100%', height:'100%',
            background:`linear-gradient(135deg, ${C.accent}33, ${C.teal}22)`,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:90 }}>
            {petData.avatar}
          </div>
        )}
        <div style={{ position:'absolute', inset:0, background:
          'linear-gradient(to bottom,rgba(0,0,0,0.38) 0%,transparent 35%,transparent 55%,rgba(0,0,0,0.55) 100%)',
          pointerEvents:'none' }} />

        {/* Volver */}
        <button onClick={onClose} style={{ position:'absolute', top:52, left:16,
          background:'rgba(0,0,0,0.32)', backdropFilter:'blur(10px)',
          border:'1px solid rgba(255,255,255,0.2)', borderRadius:12,
          width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', color:'#fff', fontSize:18, flexShrink:0 }}>←</button>

        {/* Editar (lápiz) */}
        <button onClick={() => setEditMode(true)} title="Editar perfil" style={{
          position:'absolute', top:52, right:16,
          background:'rgba(0,0,0,0.32)', backdropFilter:'blur(10px)',
          border:'1px solid rgba(255,255,255,0.2)', borderRadius:12,
          width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', color:'#fff', fontSize:16 }}>✏️</button>

        {/* Nombre */}
        <div style={{ position:'absolute', bottom:20, left:20, right:20 }}>
          <div style={{ fontFamily:F.display, fontWeight:800, fontSize:26,
            color:'#fff', lineHeight:1.2, textShadow:'0 2px 8px rgba(0,0,0,0.3)' }}>
            {petData.name || petData.breed}
          </div>
          {petData.name && petData.breed && (
            <div style={{ fontFamily:F.body, fontSize:13,
              color:'rgba(255,255,255,0.85)', marginTop:3 }}>{petData.breed}</div>
          )}
          {(petData.username) && (
            <div style={{ fontFamily:F.body, fontSize:12, fontWeight:600,
              color:'rgba(255,255,255,0.85)', marginTop:2 }}>@{petData.username}</div>
          )}
          {petData.sexo && (
            <div style={{ fontFamily:F.body, fontSize:12,
              color:'rgba(255,255,255,0.7)', marginTop:1 }}>{petData.sexo}</div>
          )}
        </div>
      </div>

      {/* ── Contenido ── */}
      <div style={{ padding:'18px 18px 40px' }}>

        {/* Dueño + descripción */}
        <div style={{ background:C.bgCard, borderRadius:14,
          border:`1px solid ${C.border}`, padding:'13px 14px', marginBottom:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:
            petData.descripcion ? 10 : 0 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:C.bgElevated,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
              {petData.owner_avatar || '👤'}
            </div>
            <div>
              <div style={{ fontFamily:F.body, fontSize:11, color:C.textMuted }}>Dueño</div>
              <div style={{ fontFamily:F.body, fontWeight:600, fontSize:14, color:C.text }}>
                {petData.owner}
              </div>
            </div>
            {petData.chip && (
              <div style={{ marginLeft:'auto', fontFamily:F.body, fontSize:10,
                color:C.textMuted, textAlign:'right' }}>
                Chip<br/>
                <span style={{ fontSize:9 }}>{petData.chip}</span>
              </div>
            )}
          </div>
          {petData.descripcion && (
            <div style={{ fontFamily:F.body, fontSize:13, color:C.textSub,
              lineHeight:1.55, borderTop:`1px solid ${C.border}`, paddingTop:10 }}>
              {petData.descripcion}
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display:'flex', gap:10, marginBottom:18 }}>
          {[
            { label:'Me gusta',   value: totalLikes    },
            { label:'Posts',      value: petPosts.length },
            { label:'Vínculos',   value: myRels.filter(r=>r.status==='approved').length },
            { label:'Seguidores', value: isFollowing ? 1 : 0 },
          ].map((s, i) => (
            <div key={i} style={{ flex:1, background:C.bgCard, borderRadius:12,
              border:`1px solid ${C.border}`, padding:'10px 6px', textAlign:'center' }}>
              <div style={{ fontFamily:F.display, fontWeight:800, fontSize:18, color:C.accent }}>
                {s.value}
              </div>
              <div style={{ fontFamily:F.body, fontSize:10, color:C.textSub, marginTop:2 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Botones */}
        <div style={{ display:'flex', gap:10, marginBottom:26 }}>
          <button onClick={() => { const upd = toggleFollow(petFollowId); setIsFollowing(upd.includes(petFollowId)); }} style={{
            flex:2,
            background: following ? C.bgElevated : C.accent,
            color:       following ? C.text       : C.bg,
            border:`1px solid ${following ? C.border : 'transparent'}`,
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

        {/* ── Árbol genealógico ── */}
        <div style={{ marginBottom:26 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <span style={{ fontSize:18 }}>🌳</span>
            <span style={{ fontFamily:F.display, fontWeight:700, fontSize:15, color:C.text }}>
              Árbol genealógico
            </span>
            {myRels.some(r => r.status === 'pending') && (
              <div style={{ marginLeft:'auto', background:C.amber + '22',
                borderRadius:8, padding:'3px 10px',
                fontFamily:F.body, fontSize:11, fontWeight:600, color:C.amber }}>
                {myRels.filter(r=>r.status==='pending').length} pendiente(s)
              </div>
            )}
          </div>

          {myRels.length === 0 ? (
            <div style={{ background:C.bgElevated, borderRadius:14, padding:'24px',
              textAlign:'center', border:`1px dashed ${C.border}` }}>
              <div style={{ fontSize:36 }}>🌱</div>
              <div style={{ fontFamily:F.body, fontSize:13, color:C.textMuted, marginTop:8 }}>
                Sin vínculos aún
              </div>
              <button onClick={() => setShowLink(true)} style={{
                marginTop:12, background:C.teal, color:'#fff', border:'none',
                borderRadius:12, padding:'9px 18px', fontFamily:F.body,
                fontSize:13, fontWeight:600, cursor:'pointer',
              }}>🔗 Vincular mascota</button>
            </div>
          ) : (
            <FamilyTree
              currentPetId={petId}
              relations={myRels}
              onRequestLink={() => setShowLink(true)}
            />
          )}
        </div>

        {/* ── Publicaciones ── */}
        <div style={{ fontFamily:F.body, fontSize:11, fontWeight:700, color:C.textMuted,
          textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 }}>
          Publicaciones
        </div>
        {petPosts.length === 0 ? (
          <div style={{ textAlign:'center', padding:'24px 0',
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
                <div style={{ position:'absolute', bottom:6, left:6,
                  background:'rgba(0,0,0,0.5)', borderRadius:8,
                  padding:'2px 8px', fontFamily:F.body, fontSize:11, color:'#fff' }}>
                  ❤️ {p.likes}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
