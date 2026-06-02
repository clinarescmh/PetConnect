/**
 * Nominatim (OpenStreetMap geocoding) — PetConnect
 * Reemplaza Overpass para evitar problemas de CORS en producción.
 * Sin API key, gratis, CORS abierto por defecto.
 * Docs: https://nominatim.org/release-docs/latest/api/Search/
 *
 * Límite de uso: 1 petición/segundo — para proyectos personales/demo es suficiente.
 */

const BASE     = 'https://nominatim.openstreetmap.org/search'
const SANTIAGO = { lat: -33.4569, lon: -70.6483 }

// ── Geolocalización ───────────────────────────────────────────────────────────

export async function getLocation(timeoutMs = 6000) {
  return new Promise((resolve) => {
    const fallback = { ...SANTIAGO, source: 'default' }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      console.log('[nominatim] geolocation no disponible, usando Santiago')
      return resolve(fallback)
    }

    const done = (pos) => {
      clearTimeout(timer)
      const { lat, lon } = pos
      if (!isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        console.warn('[nominatim] coordenadas inválidas:', lat, lon)
        return resolve(fallback)
      }
      resolve(pos)
    }

    const timer = setTimeout(() => {
      console.warn('[nominatim] getLocation timeout, usando Santiago')
      resolve({ ...SANTIAGO, source: 'timeout' })
    }, timeoutMs)

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        console.log('[nominatim] GPS obtenido:', coords.latitude.toFixed(4), coords.longitude.toFixed(4))
        done({ lat: coords.latitude, lon: coords.longitude, source: 'gps' })
      },
      (err) => {
        console.warn('[nominatim] GPS denegado/error:', err?.code, err?.message)
        done({ ...SANTIAGO, source: 'denied' })
      },
      { timeout: timeoutMs - 500, maximumAge: 120_000, enableHighAccuracy: false }
    )
  })
}

// ── Matemáticas ───────────────────────────────────────────────────────────────

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

// ── Nominatim helpers ─────────────────────────────────────────────────────────

/**
 * Bounding box para Nominatim.
 * Formato: lon_min,lat_max,lon_max,lat_min  (left,top,right,bottom)
 */
function makeBbox(lat, lon, km) {
  const dLat = km / 111
  const dLon = km / (111 * Math.cos((lat * Math.PI) / 180))
  return [
    (lon - dLon).toFixed(5),  // left
    (lat + dLat).toFixed(5),  // top
    (lon + dLon).toFixed(5),  // right
    (lat - dLat).toFixed(5),  // bottom
  ].join(',')
}

async function searchNominatim(params, signal) {
  const url = new URL(BASE)
  // namedetails=1 devuelve el campo namedetails.name (más preciso que address.amenity)
  const defaults = { format: 'json', addressdetails: '1', namedetails: '1', limit: '25', countrycodes: 'cl' }
  Object.entries({ ...defaults, ...params }).forEach(([k, v]) =>
    url.searchParams.set(k, String(v))
  )

  console.log('[nominatim] GET', decodeURIComponent(url.search.slice(0, 120)) + '…')

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
    signal,
  })

  console.log('[nominatim] status', res.status, res.ok ? '✓' : '✗')
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`)

  const data = await res.json()
  console.log('[nominatim] items devueltos:', Array.isArray(data) ? data.length : typeof data)
  return Array.isArray(data) ? data : []
}

// ── Parsers ───────────────────────────────────────────────────────────────────

const GENERIC_NAMES = new Set(['veterinaria', 'tienda', 'farmacia', 'grooming', 'pet shop', 'sin nombre', ''])

function extractName(item) {
  const a  = item.address     || {}
  const nd = item.namedetails || {}

  // 1. namedetails.name — más preciso (requiere namedetails=1)
  const fromND = nd.name?.trim()

  // 2. address fields
  const fromAddr = (a.amenity || a.shop || a.building)?.trim()

  // 3. Primera parte de display_name
  const fromDisplay = item.display_name?.split(',')[0]?.trim()

  // Elegir el primero que no sea genérico
  for (const candidate of [fromND, fromAddr, fromDisplay]) {
    if (candidate && !GENERIC_NAMES.has(candidate.toLowerCase())) return candidate
  }

  // Fallback: usar dirección como nombre si todo lo anterior es genérico
  const addr = extractAddress(item)
  return addr || fromDisplay || 'Sin nombre'
}

function extractAddress(item) {
  const a = item.address || {}
  const street  = [a.road, a.house_number].filter(Boolean).join(' ')
  const suburb  = a.suburb || a.neighbourhood || a.city_district || ''
  if (street || suburb) return [street, suburb].filter(Boolean).join(', ')
  // fallback: second and third segment of display_name
  return item.display_name.split(',').slice(1, 3).map(s => s.trim()).join(', ') || null
}

function toVet(item, uLat, uLon) {
  try {
    const lat = parseFloat(item.lat)
    const lon = parseFloat(item.lon)
    if (!isFinite(lat) || !isFinite(lon)) return null
    const km = distanceKm(uLat, uLon, lat, lon)
    return {
      id:          item.place_id,
      name:        extractName(item),
      specialty:   'General',
      open:        true,
      urgent:      false,
      phone:       null,
      address:     extractAddress(item),
      distance:    formatDistance(km),
      distanceKm:  km,
      mapsUrl:     `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
      lat, lon,
    }
  } catch { return null }
}

/** Detecta el tipo de tienda por tags OSM y luego por palabras clave en el nombre */
function detectStoreType(item) {
  const tags = item.tags || {}

  // 1. OSM shop tag — más preciso
  const OSM_MAP = {
    pet:       'Tienda de mascotas',
    pet_food:  'Alimentos para mascotas',
    groomer:   'Peluquería & Grooming',
    aquarium:  'Peces & acuarios',
    animal:    'Animales & accesorios',
  }
  if (tags.shop && OSM_MAP[tags.shop]) return OSM_MAP[tags.shop]

  // 2. Palabras clave en nombre/display_name — cubre el caso chileno
  const haystack = [
    item.namedetails?.name,
    item.address?.amenity,
    item.address?.shop,
    item.display_name,
  ].filter(Boolean).join(' ').toLowerCase()

  const GROOMING_KW = [
    'peluquer', 'baño y corte', 'baño corte', 'estética', 'estetica',
    'grooming', 'spa canin', 'corte canin', 'belleza canin',
  ]
  if (GROOMING_KW.some(kw => haystack.includes(kw))) return 'Peluquería & Grooming'

  return 'Tienda de mascotas'
}

function toStore(item, uLat, uLon) {
  try {
    const lat = parseFloat(item.lat)
    const lon = parseFloat(item.lon)
    if (!isFinite(lat) || !isFinite(lon)) return null
    const km = distanceKm(uLat, uLon, lat, lon)
    const storeType = detectStoreType(item)
    return {
      id:          item.place_id,
      name:        extractName(item),
      type:        storeType,
      icon:        storeType.includes('Grooming') ? '✂️' : '🐾',
      discount:    null,
      phone:       null,
      address:     extractAddress(item),
      distance:    formatDistance(km),
      distanceKm:  km,
      mapsUrl:     `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
      lat, lon,
    }
  } catch { return null }
}

// ── Fetchers públicos ─────────────────────────────────────────────────────────

/**
 * Busca veterinarias con texto libre — más tolerante que amenity=veterinary.
 * Intenta múltiples términos y radio creciente hasta cubrir la RM completa.
 */
export async function fetchNearbyVets(lat, lon) {
  console.log('[nominatim] fetchNearbyVets', lat.toFixed(4), lon.toFixed(4))
  const ctrl = new AbortController()
  const safety = setTimeout(() => ctrl.abort(), 25_000)

  // Bounding box de la Región Metropolitana completa
  const RM_BBOX = '-71.2,-33.0,-70.0,-34.0'

  const queries = [
    { q: 'veterinaria',                    viewbox: makeBbox(lat, lon, 15), bounded: '0' },
    { q: 'clinica veterinaria',            viewbox: makeBbox(lat, lon, 20), bounded: '0' },
    { q: 'veterinaria santiago',           viewbox: RM_BBOX,                bounded: '0' },
    { q: 'clinica veterinaria santiago chile' },
  ]

  try {
    for (const params of queries) {
      try {
        const items = await searchNominatim(params, ctrl.signal)
        console.log('[nominatim] vets q="' + params.q + '":', items.length)
        const results = items.map(i => toVet(i, lat, lon)).filter(Boolean)
          .sort((a, b) => a.distanceKm - b.distanceKm)
        if (results.length > 0) { clearTimeout(safety); return results }
      } catch (err) {
        if (err?.name === 'AbortError') throw err
        console.warn('[nominatim] vets error q="' + params.q + '":', err?.message)
      }
      await new Promise(r => setTimeout(r, 400))
    }
  } finally {
    clearTimeout(safety)
  }
  return []
}

/**
 * Busca tiendas de mascotas con múltiples términos de búsqueda.
 * Intenta bounding box 10 km, expande a 25 km si no hay resultados.
 */
export async function fetchNearbyPetShops(lat, lon) {
  console.log('[nominatim] fetchNearbyPetShops', lat.toFixed(4), lon.toFixed(4))
  const ctrl = new AbortController()
  const safety = setTimeout(() => ctrl.abort(), 25_000)

  try {
    for (const km of [10, 25]) {
      try {
        const bbox = makeBbox(lat, lon, km)

        // Queries en paralelo (conjunto reducido para respetar rate limit de Nominatim)
        // Los 5 términos chilenos de grooming se ejecutan junto a tiendas generales
        const QUERIES = [
          'tienda mascotas',
          'pet shop',
          'peluqueria canina santiago',
          'baño corte mascotas santiago',
          'estetica canina santiago',
          'grooming mascotas santiago',
          'peluqueria perros santiago',
        ]
        const settled = await Promise.allSettled(
          QUERIES.map(q =>
            searchNominatim({ q, viewbox: bbox, bounded: '0', limit: '10' }, ctrl.signal)
              .catch(() => [])
          )
        )
        const allItems = settled.flatMap(r => r.status === 'fulfilled' ? r.value : [])

        console.log('[nominatim] stores encontradas (raw):', allItems.length, `(radio ${km}km)`)

        // Dedup por place_id
        const seen = new Set()
        const unique = allItems.filter(i => {
          if (seen.has(i.place_id)) return false
          seen.add(i.place_id)
          return true
        })

        const results = unique.map(i => toStore(i, lat, lon))
          .filter(Boolean)
          .sort((a, b) => a.distanceKm - b.distanceKm)

        if (results.length > 0) { clearTimeout(safety); return results }
      } catch (err) {
        if (err?.name === 'AbortError') throw err
        console.warn('[nominatim] stores error en radio', km, ':', err?.message)
      }
    }
  } finally {
    clearTimeout(safety)
  }
  return []
}
