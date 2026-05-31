/**
 * PetConnect – seed script
 * Uso: node scripts/seed.mjs
 *
 * Requiere que las tablas ya existan.
 * Si no existen, ejecuta primero supabase/schema.sql en:
 * https://supabase.com/dashboard/project/tfkxwqatecoucbcnwtxx/sql/new
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const SCHEMA_SQL = readFileSync(join(__dir, '../supabase/schema.sql'), 'utf8')

const SUPABASE_URL = 'https://tfkxwqatecoucbcnwtxx.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRma3h3cWF0ZWNvdWNiY253dHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMzYwOTMsImV4cCI6MjA5NTgxMjA5M30.bcvcMqvtH1ir3QDt9KejRlnmWKmg0IyMBQ8kBowxNCI'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Paso 1: intentar crear tablas via Management API ──────────────────────────
async function tryCreateTables() {
  console.log('\n📐 Intentando crear tablas via Management API...')
  try {
    const res = await fetch(
      'https://api.supabase.com/v1/projects/tfkxwqatecoucbcnwtxx/database/query',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ query: SCHEMA_SQL }),
      }
    )
    const body = await res.json().catch(() => ({}))
    if (res.ok) {
      console.log('✅ Tablas creadas via Management API')
      return true
    } else {
      // Needs personal access token — anon key is insufficient for DDL
      console.log('⚠️  Management API requiere Personal Access Token (no el anon key).')
      console.log('   → Abre este enlace y pega el contenido de supabase/schema.sql:')
      console.log('   https://supabase.com/dashboard/project/tfkxwqatecoucbcnwtxx/sql/new\n')
      return false
    }
  } catch (err) {
    console.log('⚠️  No se pudo conectar con Management API:', err.message)
    return false
  }
}

// ── Seed data ─────────────────────────────────────────────────────────────────

// 'name' no existe en la tabla posts de Supabase (tabla preexistente con schema diferente)
const posts = [
  { breed: 'Golden Retriever', owner: 'María L.', avatar: '🐕', owner_avatar: '👩', likes: 142, comments: 28, caption: 'Primer día en el parque esta semana 🌿', time_ago: '2h', tag: '#lavidacanina' },
  { breed: 'Gata Persa',       owner: 'Pedro R.', avatar: '🐈', owner_avatar: '👨', likes: 267, comments: 41, caption: 'Reinando el balcón como siempre 👑',    time_ago: '4h', tag: '#catlife'     },
  { breed: 'Labrador',         owner: 'Sofía V.', avatar: '🐶', owner_avatar: '👩‍🦰', likes: 89,  comments: 12, caption: '¡Aprendimos a sentarnos! Mamá orgullosa 🎉', time_ago: '6h', tag: '#perrofeliz' },
]

const vets = [
  { name: 'Clínica PetCare',   distance: '0.8 km', rating: 4.8, open: true, specialty: 'General',   icon: '🏥', urgent: false },
  { name: 'Dr. González',      distance: '1.2 km', rating: 4.9, open: true, specialty: 'Cirugía',   icon: '⚕️', urgent: false },
  { name: 'VetUrgencias 24h',  distance: '2.1 km', rating: 4.7, open: true, specialty: 'Urgencias', icon: '🚨', urgent: true  },
]

const walkers = [
  { name: 'Camila Torres', avatar: '👩‍🦱', rating: 4.9, reviews: 87, distance: '0.4 km', price: 8000, services: ['Paseos', 'Guardería'],            verified: true,  available: true,  badge: 'Top'  },
  { name: 'Rodrigo Soto',  avatar: '👨‍🦲', rating: 4.7, reviews: 52, distance: '0.9 km', price: 7500, services: ['Paseos', 'Cuidado en casa'],       verified: true,  available: true,  badge: null   },
  { name: 'Valentina M.',  avatar: '👩‍🦰', rating: 4.8, reviews: 34, distance: '1.3 km', price: 9000, services: ['Guardería', 'Alojamiento'],        verified: true,  available: false, badge: 'Nuevo'},
]

const adoptions = [
  { name: 'Pancho', species: 'Perro', breed: 'Mestizo',     age: '2 años', gender: 'Macho',  avatar: '🐕', org: 'Refugio Huellitas',    zone: 'Maipú',      vaccinated: true,  castrated: true,  description: 'Súper cariñoso, bueno con niños y otros perros.', urgent: false },
  { name: 'Nube',   species: 'Gato',  breed: 'Angora mix',  age: '1 año',  gender: 'Hembra', avatar: '🐈', org: 'ONG PatitasFelices',   zone: 'Ñuñoa',      vaccinated: true,  castrated: true,  description: 'Tranquila y muy mimosa. Ideal para departamento.', urgent: true  },
  { name: 'Rocky',  species: 'Perro', breed: 'Pitbull mix', age: '4 años', gender: 'Macho',  avatar: '🐶', org: 'Particular',           zone: 'La Florida', vaccinated: true,  castrated: false, description: 'Dueño viaja al extranjero. Muy leal y obediente.',  urgent: true  },
]

const lodging = [
  { name: 'Casa PetFriendly de Ana',  host: 'Ana Martínez',  avatar: '👩‍🦳', rating: 4.9, reviews: 63,  price: 20000, zone: 'Providencia', capacity: 'Hasta 2 perros medianos', amenities: ['Jardín', 'Cámara 24h', 'Fotos diarias'], available: true,  badge: 'Superhost' },
  { name: 'PetHotel Luna Verde',      host: 'Establecimiento', avatar: '🏡', rating: 4.7, reviews: 128, price: 15000, zone: 'Las Condes',  capacity: 'Todas las razas',         amenities: ['Piscina canina', 'Paseos 2x día', 'Grooming'], available: true,  badge: null },
  { name: 'Guardería Familiar Soto',  host: 'Rodrigo Soto',  avatar: '👨‍🦲', rating: 4.8, reviews: 41,  price: 12000, zone: 'Maipú',       capacity: 'Perros pequeños y gatos', amenities: ['Sin jaulas', 'Fotos diarias'],           available: false, badge: null },
]

// 'found' no existe en la tabla lost_pets de Supabase (tabla preexistente con schema diferente)
const lost_pets = [
  { name: 'Firulais', breed: 'Mestizo',     avatar: '🐕', zone: 'Las Condes',  time_seen: 'Hoy 09:30',  contact: '+56 9 1234 5678', reward: true,  description: 'Collar azul, responde a su nombre' },
  { name: 'Michi',    breed: 'Gato Siamés', avatar: '🐈', zone: 'Providencia', time_seen: 'Ayer 18:00', contact: '+56 9 8765 4321', reward: false, description: 'Ojos azules, sin collar'            },
]

// 'age' no existe en la tabla pets de Supabase (tabla preexistente con schema diferente)
const pets = [
  { name: 'Tobías', breed: 'Golden Retriever', owner: 'María L.', avatar: '🐕', owner_avatar: '👩', species: 'dog', weight: 28.5, chip: '985141003012345' },
]

// ── Paso 2: insertar datos ────────────────────────────────────────────────────
// seedTable descubre automáticamente qué columnas existen en la tabla real
// descartando las que Supabase rechaza, hasta que el insert funciona.

async function seedTable(tableName, rows) {
  // ¿Ya tiene datos?
  const { data: existing, error: checkErr } = await supabase
    .from(tableName).select('id').limit(1)

  if (checkErr) {
    if (checkErr.code === '42P01') {
      console.log(`✗ ${tableName}: tabla no existe — ejecuta primero supabase/schema.sql`)
    } else {
      console.log(`✗ ${tableName}: ${checkErr.message}`)
    }
    return
  }

  if (existing?.length > 0) {
    console.log(`⏭  ${tableName}: ya tiene datos (${existing.length}+ filas), omitiendo`)
    return
  }

  // Intentar insert; si falla por columna inválida, descartarla y reintentar
  let cols = Object.keys(rows[0])
  const removed = []

  for (let attempt = 0; attempt <= cols.length; attempt++) {
    const payload = rows.map(row => {
      const r = {}
      cols.forEach(c => { r[c] = row[c] })
      return r
    })

    const { error } = await supabase.from(tableName).insert(payload)

    if (!error) {
      const note = removed.length ? `  (sin columnas: ${removed.join(', ')})` : ''
      console.log(`✅ ${tableName}: ${rows.length} filas insertadas${note}`)
      return
    }

    const match = error.message.match(/Could not find the '(\w+)' column/)
    if (match) {
      removed.push(match[1])
      cols = cols.filter(c => c !== match[1])
    } else {
      console.log(`✗ ${tableName}: ${error.message}`)
      return
    }
  }

  console.log(`✗ ${tableName}: no se pudo insertar — columnas insuficientes`)
}

async function main() {
  console.log('═══════════════════════════════════════')
  console.log('     PetConnect – Setup de base de datos')
  console.log('═══════════════════════════════════════')

  await tryCreateTables()

  console.log('\n🌱 Insertando datos de ejemplo...')
  await seedTable('posts',     posts)
  await seedTable('vets',      vets)
  await seedTable('walkers',   walkers)
  await seedTable('adoptions', adoptions)
  await seedTable('lodging',   lodging)
  await seedTable('lost_pets', lost_pets)
  await seedTable('pets',      pets)

  console.log('\n✨ Listo. Arranca la app con: npm run dev\n')
}

main()
