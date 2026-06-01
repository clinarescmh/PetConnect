/**
 * FamilyTree — árbol genealógico visual con SVG.
 * Nodos circulares con foto, conectados por líneas con etiquetas de relación.
 * Interactivo: toca un nodo para resaltarlo.
 */
import { useState } from 'react'
import { useTheme, F } from '../lib/theme'

/* ── Mock data de demo ── */
export const DEMO_RELATIONS = [
  {
    pet1: { id:1, name:'Tobías', photo:'/Golden_retriever.jpeg' },
    pet2: { id:3, name:'Max',    photo:'/Labrador.jpeg'         },
    type: 'hermano', status:'approved',
  },
  {
    pet1: { id:1, name:'Tobías', photo:'/Golden_retriever.jpeg' },
    pet2: { id:4, name:'Bella',  photo:'/Beagle.jpeg'           },
    type: 'primo', status:'approved',
  },
  {
    pet1: { id:3, name:'Max',    photo:'/Labrador.jpeg'         },
    pet2: { id:4, name:'Bella',  photo:'/Beagle.jpeg'           },
    type: 'primo', status:'approved',
  },
]

const REL_COLORS = {
  padre:        '#FF8C00',
  madre:        '#F055A3',
  hijo:         '#2DD4BF',
  hermano:      '#4A9EFF',
  prima:        '#9B6EF5',
  primo:        '#9B6EF5',
  'media sangre': '#FFB547',
}
const relColor = (type) => REL_COLORS[type?.toLowerCase()] || '#8BA8C4'

/* ── Layout ── */
function computeLayout(currentId, relations, W = 320) {
  const petMap = new Map()
  for (const r of relations) {
    if (!petMap.has(r.pet1.id)) petMap.set(r.pet1.id, r.pet1)
    if (!petMap.has(r.pet2.id)) petMap.set(r.pet2.id, r.pet2)
  }

  const current = petMap.get(currentId) || [...petMap.values()][0]
  if (!current) return { nodes:[], edges:[] }

  const others  = [...petMap.values()].filter(p => p.id !== current.id)

  /* Current pet: top center.  Others: bottom row, evenly spaced. */
  const cx = W / 2
  const spread = Math.min(130, W / (others.length + 1))
  const startX = cx - ((others.length - 1) * spread) / 2

  const nodes = [
    { ...current, x: cx, y: 65, isCurrent: true },
    ...others.map((p, i) => ({ ...p, x: startX + i * spread, y: 210, isCurrent: false })),
  ]
  const nodeById = new Map(nodes.map(n => [n.id, n]))

  const edges = relations.map(r => ({
    from:   nodeById.get(r.pet1.id),
    to:     nodeById.get(r.pet2.id),
    type:   r.type,
    status: r.status,
  })).filter(e => e.from && e.to)

  return { nodes, edges }
}

/* ── Component ── */
export default function FamilyTree({
  currentPetId,
  relations = DEMO_RELATIONS,
  onRequestLink,
}) {
  const { C } = useTheme()
  const [highlight, setHighlight] = useState(null)

  const W = 320
  const H = 290
  const R = 34   // node radius
  const PREFIX = `ft${currentPetId}`   // unique prefix per instance

  const { nodes, edges } = computeLayout(currentPetId, relations, W)

  /* Unique relation types in use */
  const usedTypes = [...new Set(edges.map(e => e.type))]

  return (
    <div>
      {/* Legend */}
      {usedTypes.length > 0 && (
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:12 }}>
          {usedTypes.map(type => (
            <div key={type} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:20, height:3, borderRadius:2, background:relColor(type) }} />
              <span style={{ fontFamily:F.body, fontSize:10, color:C.textMuted,
                textTransform:'capitalize' }}>{type}</span>
            </div>
          ))}
          {edges.some(e => e.status === 'pending') && (
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:20, height:0, border:`1.5px dashed ${C.amber}` }} />
              <span style={{ fontFamily:F.body, fontSize:10, color:C.textMuted }}>pendiente</span>
            </div>
          )}
        </div>
      )}

      {/* SVG Canvas */}
      <div style={{ background:C.bgElevated, borderRadius:16,
        padding:'10px 0', overflowX:'auto' }}>
        <svg
          width={W} height={H}
          style={{ display:'block', margin:'0 auto', overflow:'visible' }}
        >
          <defs>
            {nodes.map(n => (
              <clipPath key={n.id} id={`${PREFIX}-cp-${n.id}`}>
                <circle cx={n.x} cy={n.y} r={R} />
              </clipPath>
            ))}
          </defs>

          {/* ── Edges ── */}
          {edges.map((e, i) => {
            const color  = relColor(e.type)
            const isPending = e.status === 'pending'
            const mx = (e.from.x + e.to.x) / 2
            const my = (e.from.y + e.to.y) / 2
            // Shorten line so it doesn't overlap node circles
            const dx = e.to.x - e.from.x
            const dy = e.to.y - e.from.y
            const len = Math.sqrt(dx*dx + dy*dy) || 1
            const pad = R + 4
            const x1  = e.from.x + (dx/len) * pad
            const y1  = e.from.y + (dy/len) * pad
            const x2  = e.to.x   - (dx/len) * pad
            const y2  = e.to.y   - (dy/len) * pad

            return (
              <g key={i}>
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={color} strokeWidth={2.5} strokeOpacity={0.65}
                  strokeDasharray={isPending ? '7,5' : 'none'}
                />
                {/* Label background */}
                <rect x={mx-30} y={my-11} width={60} height={22} rx={8}
                  fill={color} fillOpacity={0.14} />
                <text x={mx} y={my+5} textAnchor="middle"
                  fontFamily="DM Sans,sans-serif" fontSize={10} fontWeight={600}
                  fill={color}>
                  {e.type}
                </text>
              </g>
            )
          })}

          {/* ── Nodes ── */}
          {nodes.map(n => {
            const isHL = highlight === n.id
            return (
              <g key={n.id}
                style={{ cursor:'pointer' }}
                onClick={() => setHighlight(isHL ? null : n.id)}>
                {/* Accent ring for current pet */}
                {n.isCurrent && (
                  <circle cx={n.x} cy={n.y} r={R + 6}
                    fill="none" stroke="#FF8C00" strokeWidth={2.5} opacity={0.45} />
                )}
                {/* Highlight ring */}
                {isHL && (
                  <circle cx={n.x} cy={n.y} r={R + 5}
                    fill="none" stroke={C.teal} strokeWidth={2} opacity={0.8} />
                )}
                {/* Base circle */}
                <circle cx={n.x} cy={n.y} r={R}
                  fill={C.bgCard}
                  stroke={n.isCurrent ? '#FF8C00' : isHL ? C.teal : C.border}
                  strokeWidth={n.isCurrent || isHL ? 2.5 : 1.5} />
                {/* Photo */}
                {n.photo ? (
                  <image
                    href={n.photo}
                    x={n.x - R} y={n.y - R}
                    width={R * 2} height={R * 2}
                    clipPath={`url(#${PREFIX}-cp-${n.id})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                ) : (
                  <text x={n.x} y={n.y + 9} textAnchor="middle" fontSize={30}>🐾</text>
                )}
                {/* Name */}
                <text
                  x={n.x} y={n.y + R + 17}
                  textAnchor="middle"
                  fontFamily="DM Sans,sans-serif"
                  fontSize={11} fontWeight={600}
                  fill={n.isCurrent ? '#FF8C00' : C.text}
                >
                  {n.name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Vincular mascota */}
      {onRequestLink && (
        <button onClick={onRequestLink} style={{
          width:'100%', marginTop:12,
          background:'transparent',
          border:`1.5px dashed ${C.teal}66`,
          borderRadius:12, padding:'11px',
          fontFamily:F.body, fontSize:13, fontWeight:600,
          color:C.teal, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap:6,
          transition:'background 0.15s',
        }}>
          🔗 Vincular mascota
        </button>
      )}

      {/* Info node on tap */}
      {highlight && (() => {
        const n = nodes.find(x => x.id === highlight)
        const rels = edges.filter(e => e.from.id === highlight || e.to.id === highlight)
        return n ? (
          <div style={{ marginTop:10, background:C.bgCard, borderRadius:12,
            border:`1px solid ${C.borderHi}`, padding:'12px 14px' }}>
            <div style={{ fontFamily:F.body, fontWeight:600, fontSize:14, color:C.text }}>
              {n.name}
            </div>
            {rels.map((r, i) => {
              const other = r.from.id === n.id ? r.to : r.from
              return (
                <div key={i} style={{ fontFamily:F.body, fontSize:12,
                  color:relColor(r.type), marginTop:5 }}>
                  {r.type} de {other.name}
                  {r.status === 'pending' && <span style={{ color:C.amber }}> · pendiente</span>}
                </div>
              )
            })}
          </div>
        ) : null
      })()}
    </div>
  )
}
