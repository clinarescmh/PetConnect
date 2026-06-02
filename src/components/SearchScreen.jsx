import { useState, useMemo } from 'react'
import { useTheme, F } from '../lib/theme'
import { loadPets, loadFollowing, toggleFollow } from '../lib/pets'

/* Mascotas de demo — combinadas con las del usuario */
const DEMO_PETS = [
  { id:'1',  name:'Tobías', username:'tobias_golden', breed:'Golden Retriever', photo:'/Golden_retriever.jpeg', likes:142 },
  { id:'2',  name:'Luna',   username:'luna_persa',    breed:'Gata Persa',       photo:'/Gato_persa.jpeg',       likes:267 },
  { id:'3',  name:'Max',    username:'max_labrador',  breed:'Labrador',          photo:'/Labrador.jpeg',         likes:89  },
  { id:'4',  name:'Bella',  username:'bella_beagle',  breed:'Beagle',            photo:'/Beagle.jpeg',           likes:98  },
  { id:'5',  name:'Coco',   username:'coco_bunny',    breed:'Conejo',            photo:'/Conejo.jpeg',           likes:134 },
]

function PetCard({ pet, onOpen }) {
  const { C } = useTheme()
  const followId = pet.username || pet.id
  const [following, setFollowing] = useState(() => loadFollowing().includes(followId))

  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
      background:C.bgCard, borderRadius:14, marginBottom:8, border:`1px solid ${C.border}`,
      cursor:'pointer' }} onClick={onOpen}>
      <div style={{ width:52, height:52, borderRadius:16, overflow:'hidden', flexShrink:0,
        background:C.bgElevated }}>
        {pet.photo || pet.foto
          ? <img src={pet.photo || pet.foto} alt={pet.name || pet.nombre}
              style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center 20%' }} />
          : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center',
              justifyContent:'center', fontSize:26 }}>🐾</div>
        }
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:F.body, fontWeight:700, fontSize:14, color:C.text }}>
          {pet.name || pet.nombre}
        </div>
        {pet.username && (
          <div style={{ fontFamily:F.body, fontSize:12, color:C.teal }}>@{pet.username}</div>
        )}
        <div style={{ fontFamily:F.body, fontSize:11, color:C.textSub, marginTop:1 }}>
          {pet.breed || pet.raza}
        </div>
      </div>
      <button onClick={e => {
        e.stopPropagation()
        const upd = toggleFollow(followId)
        setFollowing(upd.includes(followId))
      }} style={{
        background: following ? C.teal+'18' : C.bgElevated,
        border: `1px solid ${following ? C.teal+'55' : C.border}`,
        borderRadius: 20, padding:'5px 12px', cursor:'pointer',
        fontFamily:F.body, fontSize:11, fontWeight:600,
        color: following ? C.teal : C.textSub, flexShrink:0, transition:'all 0.15s',
      }}>
        {following ? '✓ Siguiendo' : '+ Seguir'}
      </button>
    </div>
  )
}

export default function SearchScreen({ onClose, onOpenPet }) {
  const { C } = useTheme()
  const [query, setQuery] = useState('')

  // Combina mascotas demo + mascotas del usuario en localStorage
  const allPets = useMemo(() => {
    const myPets = loadPets().map(p => ({
      id:    p.id,
      name:  p.nombre,
      username: p.username,
      breed: p.raza || p.especie,
      photo: p.foto,
      likes: 0,
      isOwn: true,
    }))
    // Dedup con DEMO_PETS por nombre
    const myNames = new Set(myPets.map(p => p.name?.toLowerCase()))
    const demoFiltered = DEMO_PETS.filter(p => !myNames.has(p.name.toLowerCase()))
    return [...myPets, ...demoFiltered]
  }, [])

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase().replace('@', '')
    return allPets.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.username || '').toLowerCase().includes(q) ||
      (p.breed || '').toLowerCase().includes(q)
    )
  }, [query, allPets])

  const popular = useMemo(() =>
    [...allPets].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 6),
    [allPets]
  )

  const toPost = (pet) => ({
    id: pet.id, name: pet.name || pet.nombre, username: pet.username,
    breed: pet.breed || pet.raza, photo: pet.photo || pet.foto,
    avatar:'🐾', owner: '', owner_avatar:'👤', likes: pet.likes || 0,
    comments: 0, caption:'', time_ago:'', tag:'',
  })

  return (
    <div style={{ position:'fixed', inset:0, zIndex:260, background:C.bg,
      overflowY:'auto', maxWidth:420, margin:'0 auto' }}>

      {/* Header sticky con buscador */}
      <div style={{ padding:'14px 16px', background:C.bg,
        borderBottom:`1px solid ${C.border}`, position:'sticky', top:0, zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={onClose} style={{ background:C.bgElevated, border:`1px solid ${C.border}`,
            borderRadius:10, width:34, height:34, display:'flex', alignItems:'center',
            justifyContent:'center', cursor:'pointer', fontSize:16, color:C.text, flexShrink:0 }}>←</button>
          <div style={{ flex:1, background:C.bgElevated, borderRadius:14, padding:'10px 14px',
            display:'flex', alignItems:'center', gap:8, border:`1px solid ${C.border}` }}>
            <span style={{ fontSize:15, opacity:0.5 }}>🔍</span>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por @username o nombre…"
              style={{ border:'none', background:'none', fontFamily:F.body, fontSize:14,
                flex:1, outline:'none', color:C.text }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ background:'none', border:'none',
                cursor:'pointer', color:C.textMuted, fontSize:14, padding:0 }}>✕</button>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding:'14px 18px 48px' }}>
        {query ? (
          <>
            <div style={{ fontFamily:F.body, fontSize:12, color:C.textMuted, marginBottom:12 }}>
              {results.length} resultado{results.length !== 1 ? 's' : ''} para "{query}"
            </div>
            {results.length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px 0' }}>
                <div style={{ fontSize:48 }}>🔍</div>
                <div style={{ fontFamily:F.display, fontWeight:700, fontSize:16,
                  color:C.textSub, marginTop:10 }}>Sin resultados</div>
                <div style={{ fontFamily:F.body, fontSize:13, color:C.textMuted, marginTop:6 }}>
                  Prueba con otro nombre o @username
                </div>
              </div>
            ) : (
              results.map(p => (
                <PetCard key={p.id || p.username} pet={p} onOpen={() => onOpenPet?.(toPost(p))} />
              ))
            )}
          </>
        ) : (
          <>
            <div style={{ fontFamily:F.body, fontSize:11, fontWeight:700, color:C.textMuted,
              textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 }}>
              Mascotas populares
            </div>
            {popular.map(p => (
              <PetCard key={p.id || p.username} pet={p} onOpen={() => onOpenPet?.(toPost(p))} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
