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
  const defaults = { format: 'json', addressdetails: '1', limit: '25', countrycodes: 'cl' }
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

function extractName(item) {
  const a = item.address || {}
  return (
    a.amenity ||
    a.shop    ||
    a.building ||
    item.display_name.split(',')[0].trim()
  ) || 'Sin nombre'
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

function toStore(item, uLat, uLon) {
  try {
    const lat = parseFloat(item.lat)
    const lon = parseFloat(item.lon)
    if (!isFinite(lat) || !isFinite(lon)) return null
    const km = distanceKm(uLat, uLon, lat, lon)
    return {
      id:          item.place_id,
      name:        extractName(item),
      type:        'Tienda de mascotas',
      icon:        '🐾',
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
 * Busca veterinarias usando amenity=veterinary (tag OSM oficial).
 * Intenta bounding box 10 km, expande a 25 km si no hay resultados.
 */
export async function fetchNearbyVets(lat, lon) {
  console.log('[nominatim] fetchNearbyVets', lat.toFixed(4), lon.toFixed(4))
  const ctrl = new AbortController()
  const safety = setTimeout(() => ctrl.abort(), 20_000)

  try {
    for (const km of [10, 25]) {
      try {
        const items = await searchNominatim(
          { amenity: 'veterinary', viewbox: makeBbox(lat, lon, km), bounded: '1' },
          ctrl.signal
        )
        console.log('[nominatim] vets encontradas:', items.length, `(radio ${km}km)`)
        const results = items.map(i => toVet(i, lat, lon))
          .filter(Boolean)
          .sort((a, b) => a.distanceKm - b.distanceKm)
        if (results.length > 0) { clearTimeout(safety); return results }
      } catch (err) {
        if (err?.name === 'AbortError') throw err
        console.warn('[nominatim] vets error en radio', km, ':', err?.message)
      }
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

        // Búsquedas secuenciales para respetar rate limit 1 req/s
        const allItems = []
        for (const q of ['tienda mascotas', 'peluquería canina', 'pet shop']) {
          try {
            const items = await searchNominatim(
              { q, viewbox: bbox, bounded: '1', limit: '15' },
              ctrl.signal
            )
            allItems.push(...items)
          } catch (err) {
            if (err?.name === 'AbortError') throw err
            console.warn('[nominatim] stores error para q="' + q + '":', err?.message)
          }
          // Pequeña pausa para respetar rate limit de Nominatim
          await new Promise(r => setTimeout(r, 300))
        }

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
