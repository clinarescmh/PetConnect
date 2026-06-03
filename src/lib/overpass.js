/**
 * Overpass API (OpenStreetMap) — PetConnect
 *
 * Busca veterinarias, tiendas de mascotas y peluquerías por ETIQUETA OSM
 * (amenity=veterinary, shop=pet, shop=pet_grooming, …) — para eso está hecho
 * Overpass, a diferencia de la búsqueda por texto libre de Nominatim.
 *
 * Estrategia de fiabilidad (los servidores públicos de Overpass suelen estar
 * saturados o limitando por IP → 429/504, devolviendo listas vacías):
 *   1. UNA consulta por pestaña, lanzada en PARALELO a varios endpoints
 *      (Promise.any) → gana el primero que responda, no se espera a los lentos.
 *   2. Si todos fallan o no devuelven nada, se usa un SNAPSHOT real de datos OSM
 *      de Santiago (src/lib/santiagoFallback.json) → la UI nunca queda vacía.
 *
 * Docs: https://wiki.openstreetmap.org/wiki/Overpass_API
 */

import fallback from './santiagoFallback.json'

const SANTIAGO = { lat: -33.4569, lon: -70.6483 }

// Instancias públicas full-planet con CORS. Se corren en paralelo; gana la más
// rápida. (overpass.osm.ch solo tiene Europa y maps.mail.ru da 403 → excluidos.)
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

const REQUEST_TIMEOUT_MS = 13_000

// ── Geolocalización ───────────────────────────────────────────────────────────

export async function getLocation(timeoutMs = 6000) {
  return new Promise((resolve) => {
    const fb = { ...SANTIAGO, source: 'default' }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      console.log('[overpass] geolocation no disponible, usando Santiago')
      return resolve(fb)
    }

    const done = (pos) => {
      clearTimeout(timer)
      const { lat, lon } = pos
      if (!isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        console.warn('[overpass] coordenadas inválidas:', lat, lon)
        return resolve(fb)
      }
      resolve(pos)
    }

    const timer = setTimeout(() => {
      console.warn('[overpass] getLocation timeout, usando Santiago')
      resolve({ ...SANTIAGO, source: 'timeout' })
    }, timeoutMs)

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        console.log('[overpass] GPS obtenido:', coords.latitude.toFixed(4), coords.longitude.toFixed(4))
        done({ lat: coords.latitude, lon: coords.longitude, source: 'gps' })
      },
      (err) => {
        console.warn('[overpass] GPS denegado/error:', err?.code, err?.message)
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

// ── Overpass query runner ───────────────────────────────────────────────────────

async function fetchEndpoint(endpoint, query) {
  const ctrl  = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: 'data=' + encodeURIComponent(query),
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`${endpoint} HTTP ${res.status}`)
    // Overpass a veces responde 200 con un cuerpo de error HTML/XML (timeout /
    // rate-limit). En ese caso res.json() lanza y este endpoint se descarta.
    const data = await res.json()
    const elements = Array.isArray(data?.elements) ? data.elements : []
    console.log('[overpass] ✓', endpoint, '→', elements.length)
    return elements
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Lanza la consulta a TODOS los endpoints en paralelo y devuelve el primero que
 * responda con éxito (Promise.any ignora los que fallan). Lanza si todos fallan.
 */
async function runOverpass(query) {
  return Promise.any(OVERPASS_ENDPOINTS.map(ep =>
    fetchEndpoint(ep, query).catch(err => {
      console.warn('[overpass] ✗', ep, err?.message)
      throw err
    })
  ))
}

// ── Helpers de parseo ───────────────────────────────────────────────────────────

function elCoords(el) {
  if (isFinite(el.lat) && isFinite(el.lon)) return { lat: el.lat, lon: el.lon }
  if (el.center && isFinite(el.center.lat) && isFinite(el.center.lon)) {
    return { lat: el.center.lat, lon: el.center.lon }
  }
  return null
}

function osmName(tags) {
  return (tags.name || tags['name:es'] || tags.brand || tags.operator || '').trim() || null
}

function osmAddress(tags) {
  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ')
  const area   = tags['addr:suburb'] || tags['addr:city'] || tags['addr:neighbourhood'] || ''
  return [street, area].filter(Boolean).join(', ') || null
}

function osmPhone(tags) {
  return tags.phone || tags['contact:phone'] || tags['contact:mobile'] || null
}

/** Construye una veterinaria a partir de campos normalizados. */
function buildVet({ id, name, lat, lon, phone, address, urgent }, uLat, uLon) {
  const km = distanceKm(uLat, uLon, lat, lon)
  return {
    id, name: name || 'Veterinaria', specialty: 'General', open: true,
    urgent: !!urgent, phone: phone || null, address: address || null,
    distance: formatDistance(km), distanceKm: km,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
    lat, lon,
  }
}

/** Clasifica una tienda por etiqueta OSM y, como respaldo, por nombre. */
function detectStoreType(shopTag, name) {
  const shop = (shopTag || '').toLowerCase()
  const n    = (name || '').toLowerCase()
  const looksGrooming = /peluquer|baño y corte|baño corte|estética|estetica|grooming|spa canin|corte canin|belleza canin/.test(n)
  const looksAquarium = /acuari|peces ornamental|acuático|acuatico/.test(n)

  if (shop === 'pet_grooming') return 'Peluquería'
  if (shop === 'aquatics' || shop === 'aquarium') return 'Peces & acuarios'
  if (shop === 'pet_food') return 'Alimentos para mascotas'
  if (looksGrooming) return 'Peluquería'
  if (looksAquarium) return 'Peces & acuarios'
  return 'Tienda de mascotas'
}

/** Construye una tienda a partir de campos normalizados. */
function buildStore({ id, name, lat, lon, phone, address, shop }, uLat, uLon) {
  const km   = distanceKm(uLat, uLon, lat, lon)
  const type = detectStoreType(shop, name)
  return {
    id, name: name || type, type,
    icon: type.includes('Peluquer') ? '✂️' : type.includes('Peces') ? '🐠' : '🐾',
    discount: null, phone: phone || null, address: address || null,
    distance: formatDistance(km), distanceKm: km,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
    lat, lon,
  }
}

/** Construye un alojamiento (hotel/guardería de mascotas) normalizado. */
function buildLodging({ id, name, lat, lon, phone, address }, uLat, uLon) {
  const km = distanceKm(uLat, uLon, lat, lon)
  return {
    id, name: name || 'Alojamiento de mascotas',
    phone: phone || null, address: address || null,
    distance: formatDistance(km), distanceKm: km,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
    lat, lon,
  }
}

// ── Adaptadores: elemento OSM en vivo / snapshot → campos normalizados ──────────

function vetFromElement(el) {
  const c = elCoords(el); if (!c) return null
  const t = el.tags || {}
  const urgent = t.emergency === 'yes' ||
    /24|urgenc|emergen/i.test([t.opening_hours, t.name, t.description].filter(Boolean).join(' '))
  return { id: `${el.type}/${el.id}`, name: osmName(t), lat: c.lat, lon: c.lon,
           phone: osmPhone(t), address: osmAddress(t), urgent }
}

function storeFromElement(el) {
  const c = elCoords(el); if (!c) return null
  const t = el.tags || {}
  return { id: `${el.type}/${el.id}`, name: osmName(t), lat: c.lat, lon: c.lon,
           phone: osmPhone(t), address: osmAddress(t),
           shop: t.shop || t.craft || t.amenity || null }
}

function lodgingFromElement(el) {
  const c = elCoords(el); if (!c) return null
  const t = el.tags || {}
  return { id: `${el.type}/${el.id}`, name: osmName(t), lat: c.lat, lon: c.lon,
           phone: osmPhone(t), address: osmAddress(t) }
}

function snapAddress(s) {
  const street = [s.street, s.hn].filter(Boolean).join(' ')
  return [street, s.suburb].filter(Boolean).join(', ') || null
}

function fallbackVets(uLat, uLon) {
  console.warn('[overpass] usando snapshot de veterinarias de Santiago')
  return (fallback.vets || [])
    .map(s => buildVet({
      id: s.id, name: s.name, lat: s.lat, lon: s.lon, phone: s.phone,
      address: snapAddress(s),
      urgent: s.emergency === 'yes' || /24|urgenc|emergen/i.test([s.oh, s.name].filter(Boolean).join(' ')),
    }, uLat, uLon))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 80)
}

function fallbackStores(uLat, uLon) {
  console.warn('[overpass] usando snapshot de tiendas de Santiago')
  return (fallback.stores || [])
    .map(s => buildStore({
      id: s.id, name: s.name, lat: s.lat, lon: s.lon, phone: s.phone,
      address: snapAddress(s), shop: s.shop,
    }, uLat, uLon))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 120)
}

function fallbackLodging(uLat, uLon) {
  console.warn('[overpass] usando snapshot de alojamientos')
  return (fallback.lodging || [])
    .map(s => buildLodging({
      id: s.id, name: s.name, lat: s.lat, lon: s.lon, phone: s.phone,
      address: snapAddress(s),
    }, uLat, uLon))
    .sort((a, b) => a.distanceKm - b.distanceKm)
}

// ── Fetchers públicos ─────────────────────────────────────────────────────────

/** Veterinarias cercanas (amenity=veterinary), radio 18km. */
export async function fetchNearbyVets(lat, lon) {
  console.log('[overpass] fetchNearbyVets', lat.toFixed(4), lon.toFixed(4))
  const query = `
    [out:json][timeout:20];
    ( nwr["amenity"="veterinary"](around:18000,${lat},${lon}); );
    out center 80;`
  try {
    const elements = await runOverpass(query)
    const results = elements.map(vetFromElement).filter(Boolean)
      .map(v => buildVet(v, lat, lon))
      .sort((a, b) => a.distanceKm - b.distanceKm)
    if (results.length > 0) return results
    console.warn('[overpass] vets en vivo vacío → snapshot')
  } catch (err) {
    console.warn('[overpass] vets fallaron todos los endpoints → snapshot:', err?.message)
  }
  return fallbackVets(lat, lon)
}

/** Tiendas de mascotas + peluquerías + acuarios cercanos, radio 22km. */
export async function fetchNearbyPetShops(lat, lon) {
  console.log('[overpass] fetchNearbyPetShops', lat.toFixed(4), lon.toFixed(4))
  const query = `
    [out:json][timeout:20];
    (
      nwr["shop"="pet"](around:22000,${lat},${lon});
      nwr["shop"="pet_food"](around:22000,${lat},${lon});
      nwr["shop"="pet_grooming"](around:22000,${lat},${lon});
      nwr["craft"="pet_grooming"](around:22000,${lat},${lon});
      nwr["amenity"="pet_grooming"](around:22000,${lat},${lon});
      nwr["shop"="aquatics"](around:22000,${lat},${lon});
    );
    out center 150;`
  try {
    const elements = await runOverpass(query)
    const results = elements.map(storeFromElement).filter(Boolean)
      .map(s => buildStore(s, lat, lon))
      .sort((a, b) => a.distanceKm - b.distanceKm)
    if (results.length > 0) return results
    console.warn('[overpass] tiendas en vivo vacío → snapshot')
  } catch (err) {
    console.warn('[overpass] tiendas fallaron todos los endpoints → snapshot:', err?.message)
  }
  return fallbackStores(lat, lon)
}

/**
 * Alojamientos para mascotas — hoteles / guarderías (amenity=animal_boarding).
 * OSM tiene poca cobertura en Chile, así que se buscan TODOS los del país
 * (bbox nacional) y se ordenan por cercanía. Snapshot real como respaldo.
 */
export async function fetchNearbyLodging(lat, lon) {
  console.log('[overpass] fetchNearbyLodging', lat.toFixed(4), lon.toFixed(4))
  const CHILE_BBOX = '-56.0,-76.0,-17.5,-66.0'   // sur,oeste,norte,este
  const query = `
    [out:json][timeout:25];
    ( nwr["amenity"="animal_boarding"](${CHILE_BBOX}); );
    out center 200;`
  try {
    const elements = await runOverpass(query)
    const results = elements.map(lodgingFromElement).filter(e => e && e.name)
      .map(l => buildLodging(l, lat, lon))
      .sort((a, b) => a.distanceKm - b.distanceKm)
    if (results.length > 0) return results
    console.warn('[overpass] alojamientos en vivo vacío → snapshot')
  } catch (err) {
    console.warn('[overpass] alojamientos fallaron todos los endpoints → snapshot:', err?.message)
  }
  return fallbackLodging(lat, lon)
}
