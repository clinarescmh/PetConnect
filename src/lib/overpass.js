/**
 * Overpass API (OpenStreetMap) — PetConnect
 * Gratis, sin API key.
 * Docs: https://wiki.openstreetmap.org/wiki/Overpass_API
 */

const SANTIAGO = { lat: -33.4569, lon: -70.6483 }

// Dos endpoints en caso de que uno esté lento o caído
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

// ── Geolocalización ───────────────────────────────────────────────────────────

/**
 * Obtiene la posición del usuario con fallback a Santiago centro.
 * Retorna { lat, lon, source: 'gps'|'denied'|'timeout'|'default' }
 */
export async function getLocation(timeoutMs = 6000) {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return resolve({ ...SANTIAGO, source: 'default' })
    }

    const done = (pos) => {
      clearTimeout(timer)
      resolve(pos)
    }

    const timer = setTimeout(
      () => done({ ...SANTIAGO, source: 'timeout' }),
      timeoutMs
    )

    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        done({ lat: coords.latitude, lon: coords.longitude, source: 'gps' }),
      () =>
        done({ ...SANTIAGO, source: 'denied' }),
      { timeout: timeoutMs - 500, maximumAge: 120_000, enableHighAccuracy: false }
    )
  })
}

// ── Matemáticas ───────────────────────────────────────────────────────────────

/** Distancia Haversine en km */
export function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

export function formatDistance(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

// ── Overpass query ────────────────────────────────────────────────────────────

function buildQuery(lat, lon, radiusM, tags) {
  const filter = tags.map(([k, v]) => `["${k}"="${v}"]`).join('')
  return [
    '[out:json][timeout:30];',
    '(',
    `  node${filter}(around:${radiusM},${lat},${lon});`,
    `  way${filter}(around:${radiusM},${lat},${lon});`,
    ');',
    'out center tags;',
  ].join('\n')
}

async function fetchEndpoint(url, query, signal) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
    signal,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  return json.elements || []
}

async function queryOverpass(query) {
  for (const url of ENDPOINTS) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 18_000)
    try {
      const elements = await fetchEndpoint(url, query, ctrl.signal)
      clearTimeout(timer)
      return elements
    } catch {
      clearTimeout(timer)
      // try next endpoint
    }
  }
  throw new Error('Overpass API no disponible')
}

// ── Parsers ───────────────────────────────────────────────────────────────────

function coords(el) {
  return { lat: el.lat ?? el.center?.lat, lon: el.lon ?? el.center?.lon }
}

function osmPhone(tags) {
  return tags.phone || tags['contact:phone'] || tags['phone:es'] || null
}

function osmAddress(tags) {
  const parts = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean)
  return parts.length ? parts.join(' ') : (tags['addr:full'] || null)
}

function mapsUrl(lat, lon, name) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
}

function parseVet(el, uLat, uLon) {
  const { lat, lon } = coords(el)
  const tags = el.tags || {}
  const km = distanceKm(uLat, uLon, lat, lon)
  return {
    id: el.id,
    name: tags.name || 'Veterinaria',
    distance: formatDistance(km),
    distanceKm: km,
    specialty: tags.veterinary || tags.healthcare || 'General',
    open: tags.opening_hours ? !tags.opening_hours.includes('off') : true,
    urgent: (tags.opening_hours || '').includes('24/7'),
    phone: osmPhone(tags),
    address: osmAddress(tags),
    mapsUrl: mapsUrl(lat, lon, tags.name),
    lat, lon,
  }
}

function parseStore(el, uLat, uLon) {
  const { lat, lon } = coords(el)
  const tags = el.tags || {}
  const km = distanceKm(uLat, uLon, lat, lon)
  const typeMap = {
    pet: 'Tienda de mascotas',
    pet_food: 'Alimentos para mascotas',
    groomer: 'Grooming & estética',
    aquarium: 'Peces & acuarios',
    animal: 'Animales & accesorios',
  }
  return {
    id: el.id,
    name: tags.name || 'Tienda',
    type: typeMap[tags.shop] || 'Productos para mascotas',
    distance: formatDistance(km),
    distanceKm: km,
    icon: tags.shop === 'groomer' ? '✂️' : tags.shop === 'aquarium' ? '🐟' : '🐾',
    discount: null,
    phone: osmPhone(tags),
    address: osmAddress(tags),
    mapsUrl: mapsUrl(lat, lon, tags.name),
    lat, lon,
  }
}

// ── Fetchers públicos ─────────────────────────────────────────────────────────

/**
 * Busca veterinarias cercanas. Intenta 5 km primero, luego 15 km si no hay resultados.
 */
export async function fetchNearbyVets(lat, lon) {
  for (const r of [5000, 15_000]) {
    const els = await queryOverpass(
      buildQuery(lat, lon, r, [['amenity', 'veterinary']])
    )
    const results = els
      .map(el => parseVet(el, lat, lon))
      .filter(v => v.lat && v.lon)
      .sort((a, b) => a.distanceKm - b.distanceKm)
    if (results.length > 0) return results
  }
  return []
}

/**
 * Busca pet shops cercanas. Combina shop=pet y variantes afines.
 * Intenta 5 km primero, luego 15 km.
 */
export async function fetchNearbyPetShops(lat, lon) {
  const shopTypes = ['pet', 'pet_food', 'groomer', 'aquarium', 'animal']

  for (const r of [5000, 15_000]) {
    // Lanza las consultas en paralelo, una por tipo
    const all = await Promise.allSettled(
      shopTypes.map(type =>
        queryOverpass(buildQuery(lat, lon, r, [['shop', type]]))
          .then(els => els.map(el => parseStore(el, lat, lon)))
      )
    )

    const merged = all
      .flatMap(res => (res.status === 'fulfilled' ? res.value : []))
      .filter(s => s.lat && s.lon)

    // Dedup por id
    const seen = new Set()
    const unique = merged.filter(s => {
      if (seen.has(s.id)) return false
      seen.add(s.id)
      return true
    })

    const sorted = unique.sort((a, b) => a.distanceKm - b.distanceKm)
    if (sorted.length > 0) return sorted
  }
  return []
}
