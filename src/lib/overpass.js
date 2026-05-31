/**
 * Overpass API (OpenStreetMap) — PetConnect
 * Gratis, sin API key.
 * Docs: https://wiki.openstreetmap.org/wiki/Overpass_API
 */

const SANTIAGO = { lat: -33.4569, lon: -70.6483 }

// Endpoints en orden de preferencia:
// 1. kumi.systems  — CORS abierto, más confiable en producción
// 2. overpass-api.de — servidor principal, a veces bloquea CORS en browsers
// 3. openstreetmap.ru — respaldo adicional
const ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.ru/cgi/interpreter',
]

// ── Geolocalización ───────────────────────────────────────────────────────────

/**
 * Obtiene la posición del usuario con fallback a Santiago centro.
 * Retorna { lat, lon, source: 'gps'|'denied'|'timeout'|'default' }
 */
export async function getLocation(timeoutMs = 6000) {
  return new Promise((resolve) => {
    const fallback = { ...SANTIAGO, source: 'default' }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return resolve(fallback)
    }

    const done = (pos) => {
      clearTimeout(timer)
      // Validar que las coordenadas son números finitos y razonables
      const { lat, lon } = pos
      if (!isFinite(lat) || !isFinite(lon) ||
          lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        console.warn('[getLocation] coords inválidas, usando Santiago:', lat, lon)
        return resolve(fallback)
      }
      resolve(pos)
    }

    const timer = setTimeout(
      () => {
        console.warn('[getLocation] timeout, usando Santiago centro')
        resolve({ ...SANTIAGO, source: 'timeout' })
      },
      timeoutMs
    )

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => done({ lat: coords.latitude, lon: coords.longitude, source: 'gps' }),
      (err) => {
        console.warn('[getLocation] denegado/error:', err?.code, err?.message)
        done({ ...SANTIAGO, source: 'denied' })
      },
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
  console.log('[overpass] → fetch', url.replace('https://', '').split('/')[0])
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: `data=${encodeURIComponent(query)}`,
    signal,
  })
  console.log('[overpass] ← status', res.status, url.replace('https://', '').split('/')[0])
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const count = (json.elements || []).length
  console.log('[overpass] ✓ elementos recibidos:', count)
  return json.elements || []
}

async function queryOverpass(query) {
  for (const url of ENDPOINTS) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 18_000)
    try {
      const elements = await fetchEndpoint(url, query, ctrl.signal)
      clearTimeout(timer)
      if (!Array.isArray(elements)) {
        console.warn('[overpass] respuesta no es array, siguiente endpoint')
        continue
      }
      return elements
    } catch (err) {
      clearTimeout(timer)
      console.warn('[overpass] ✗ endpoint falló:', url.split('/')[2], '—', err?.message)
    }
  }
  console.warn('[overpass] ✗ todos los endpoints fallaron, retornando []')
  return []
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
  try {
    const { lat, lon } = coords(el)
    if (lat == null || lon == null) return null
    const tags = el.tags || {}
    const km = distanceKm(uLat, uLon, lat, lon)
    if (!isFinite(km)) return null
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
  } catch {
    return null
  }
}

function parseStore(el, uLat, uLon) {
  try {
    const { lat, lon } = coords(el)
    if (lat == null || lon == null) return null
    const tags = el.tags || {}
    const km = distanceKm(uLat, uLon, lat, lon)
    if (!isFinite(km)) return null
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
  } catch {
    return null
  }
}

// ── Fetchers públicos ─────────────────────────────────────────────────────────

/**
 * Busca veterinarias cercanas. Intenta 5 km primero, luego 15 km si no hay resultados.
 */
export async function fetchNearbyVets(lat, lon) {
  for (const r of [5000, 15_000]) {
    try {
      const els = await queryOverpass(
        buildQuery(lat, lon, r, [['amenity', 'veterinary']])
      )
      const results = els
        .map(el => parseVet(el, lat, lon))
        .filter(Boolean)
        .sort((a, b) => a.distanceKm - b.distanceKm)
      if (results.length > 0) return results
    } catch {
      // radio fallido, intentar el siguiente
    }
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
    try {
    const all = await Promise.allSettled(
      shopTypes.map(type =>
        queryOverpass(buildQuery(lat, lon, r, [['shop', type]]))
          .then(els => els.map(el => parseStore(el, lat, lon)).filter(Boolean))
          .catch(() => [])
      )
    )

    const merged = all
      .flatMap(res => res.status === 'fulfilled' ? res.value : [])

    // Dedup por id
    const seen = new Set()
    const unique = merged.filter(s => {
      if (seen.has(s.id)) return false
      seen.add(s.id)
      return true
    })

    const sorted = unique.sort((a, b) => a.distanceKm - b.distanceKm)
    if (sorted.length > 0) return sorted
    } catch {
      // radio fallido, intentar el siguiente
    }
  }
  return []
}
