/**
 * Overpass API (OpenStreetMap) — PetConnect
 *
 * Reemplaza la búsqueda de texto libre de Nominatim por consultas por ETIQUETA OSM,
 * que es para lo que Overpass está diseñado. Ventajas:
 *   - 1 sola petición por pestaña (Nominatim disparaba ~14 en paralelo y el servidor
 *     público las bloqueaba por exceder el límite de 1 req/seg → 0 resultados).
 *   - Encuentra POIs reales por tag (amenity=veterinary, shop=pet, shop=pet_grooming),
 *     no depende de adivinar nombres en español chileno.
 *   - Devuelve coordenadas, nombre, dirección, teléfono y horario estructurados.
 *
 * Los endpoints públicos de Overpass envían `Access-Control-Allow-Origin: *`,
 * así que funciona desde el navegador. Se prueban varios endpoints como respaldo.
 * Docs: https://wiki.openstreetmap.org/wiki/Overpass_API
 */

const SANTIAGO = { lat: -33.4569, lon: -70.6483 }

// Endpoints públicos con CORS — se prueban en orden hasta que uno responda.
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

// ── Geolocalización ───────────────────────────────────────────────────────────

export async function getLocation(timeoutMs = 6000) {
  return new Promise((resolve) => {
    const fallback = { ...SANTIAGO, source: 'default' }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      console.log('[overpass] geolocation no disponible, usando Santiago')
      return resolve(fallback)
    }

    const done = (pos) => {
      clearTimeout(timer)
      const { lat, lon } = pos
      if (!isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        console.warn('[overpass] coordenadas inválidas:', lat, lon)
        return resolve(fallback)
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

/**
 * Ejecuta una consulta Overpass QL probando endpoints en orden.
 * Devuelve el array de `elements` o lanza si todos fallan.
 */
async function runOverpass(query, signal) {
  let lastErr = null
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log('[overpass] POST', endpoint)
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: 'data=' + encodeURIComponent(query),
        signal,
      })
      console.log('[overpass] status', res.status, res.ok ? '✓' : '✗')
      if (!res.ok) { lastErr = new Error(`Overpass HTTP ${res.status}`); continue }
      // Overpass a veces responde 200 con un cuerpo de error en HTML/XML
      // (timeout o rate-limit). En ese caso res.json() lanza y probamos el siguiente.
      const data = await res.json()
      const elements = Array.isArray(data?.elements) ? data.elements : []
      console.log('[overpass] elements:', elements.length)
      return elements
    } catch (err) {
      if (err?.name === 'AbortError') throw err
      console.warn('[overpass] endpoint falló:', endpoint, err?.message)
      lastErr = err
    }
  }
  throw lastErr || new Error('Overpass: todos los endpoints fallaron')
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

function toVet(el, uLat, uLon) {
  const c = elCoords(el)
  if (!c) return null
  const tags = el.tags || {}
  const km   = distanceKm(uLat, uLon, c.lat, c.lon)
  const urgent =
    tags.emergency === 'yes' ||
    /24|urgenc|emergen/i.test([tags.opening_hours, tags.name, tags.description].filter(Boolean).join(' '))
  return {
    id:          `${el.type}/${el.id}`,
    name:        osmName(tags) || 'Veterinaria',
    specialty:   'General',
    open:        true,
    urgent,
    phone:       osmPhone(tags),
    address:     osmAddress(tags),
    distance:    formatDistance(km),
    distanceKm:  km,
    mapsUrl:     `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lon}`,
    lat: c.lat, lon: c.lon,
  }
}

/**
 * Clasifica una tienda a partir de sus etiquetas OSM y, como respaldo,
 * de palabras clave en el nombre (naming chileno).
 */
function detectStoreType(tags) {
  const shop  = (tags.shop || '').toLowerCase()
  const craft = (tags.craft || '').toLowerCase()
  const amen  = (tags.amenity || '').toLowerCase()

  if (shop === 'pet_grooming' || craft === 'pet_grooming' || amen === 'pet_grooming') return 'Peluquería'
  if (shop === 'aquatics' || shop === 'aquarium') return 'Peces & acuarios'
  if (shop === 'pet_food') return 'Alimentos para mascotas'
  if (shop === 'pet') {
    // shop=pet puede ser tienda, peluquería o acuario — desambiguar por nombre
    const name = (tags.name || '').toLowerCase()
    if (/peluquer|baño y corte|baño corte|estética|estetica|grooming|spa canin|corte canin|belleza canin/.test(name)) return 'Peluquería'
    if (/acuari|peces|acuático|acuatico/.test(name)) return 'Peces & acuarios'
    return 'Tienda de mascotas'
  }

  // Respaldo por nombre cuando la etiqueta es genérica
  const name = (tags.name || '').toLowerCase()
  if (/peluquer|baño y corte|baño corte|estética|estetica|grooming|spa canin|corte canin|belleza canin/.test(name)) return 'Peluquería'
  if (/acuari|peces ornamental/.test(name)) return 'Peces & acuarios'
  return 'Tienda de mascotas'
}

function toStore(el, uLat, uLon) {
  const c = elCoords(el)
  if (!c) return null
  const tags = el.tags || {}
  const km   = distanceKm(uLat, uLon, c.lat, c.lon)
  const type = detectStoreType(tags)
  return {
    id:          `${el.type}/${el.id}`,
    name:        osmName(tags) || type,
    type,
    icon:        type.includes('Peluquer') ? '✂️' : type.includes('Peces') ? '🐠' : '🐾',
    discount:    null,
    phone:       osmPhone(tags),
    address:     osmAddress(tags),
    distance:    formatDistance(km),
    distanceKm:  km,
    mapsUrl:     `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lon}`,
    lat: c.lat, lon: c.lon,
  }
}

// ── Fetchers públicos ─────────────────────────────────────────────────────────

/**
 * Veterinarias cercanas (amenity=veterinary). Radio creciente hasta encontrar
 * resultados: 8km → 20km → 40km. Devuelve ordenadas por distancia.
 */
export async function fetchNearbyVets(lat, lon) {
  console.log('[overpass] fetchNearbyVets', lat.toFixed(4), lon.toFixed(4))
  const ctrl   = new AbortController()
  const safety = setTimeout(() => ctrl.abort(), 25_000)

  try {
    for (const radius of [8000, 20000, 40000]) {
      const query = `
        [out:json][timeout:25];
        (
          nwr["amenity"="veterinary"](around:${radius},${lat},${lon});
        );
        out center 60;`
      try {
        const elements = await runOverpass(query, ctrl.signal)
        const results = elements
          .map(e => toVet(e, lat, lon))
          .filter(Boolean)
          .sort((a, b) => a.distanceKm - b.distanceKm)
        console.log(`[overpass] vets radio=${radius}m →`, results.length)
        if (results.length > 0) { clearTimeout(safety); return results }
      } catch (err) {
        if (err?.name === 'AbortError') throw err
        console.warn('[overpass] vets error radio=' + radius + ':', err?.message)
      }
    }
  } finally {
    clearTimeout(safety)
  }
  return []
}

/**
 * Tiendas de mascotas, peluquerías y acuarios cercanos.
 * Una sola consulta que combina todas las etiquetas OSM relevantes.
 * Radio creciente: 10km → 25km → 50km.
 */
export async function fetchNearbyPetShops(lat, lon) {
  console.log('[overpass] fetchNearbyPetShops', lat.toFixed(4), lon.toFixed(4))
  const ctrl   = new AbortController()
  const safety = setTimeout(() => ctrl.abort(), 25_000)

  try {
    for (const radius of [10000, 25000, 50000]) {
      const query = `
        [out:json][timeout:25];
        (
          nwr["shop"="pet"](around:${radius},${lat},${lon});
          nwr["shop"="pet_food"](around:${radius},${lat},${lon});
          nwr["shop"="pet_grooming"](around:${radius},${lat},${lon});
          nwr["craft"="pet_grooming"](around:${radius},${lat},${lon});
          nwr["amenity"="pet_grooming"](around:${radius},${lat},${lon});
          nwr["shop"="aquatics"](around:${radius},${lat},${lon});
        );
        out center 120;`
      try {
        const elements = await runOverpass(query, ctrl.signal)
        const results = elements
          .map(e => toStore(e, lat, lon))
          .filter(Boolean)
          .sort((a, b) => a.distanceKm - b.distanceKm)
        console.log(`[overpass] stores radio=${radius}m →`, results.length)
        if (results.length > 0) { clearTimeout(safety); return results }
      } catch (err) {
        if (err?.name === 'AbortError') throw err
        console.warn('[overpass] stores error radio=' + radius + ':', err?.message)
      }
    }
  } finally {
    clearTimeout(safety)
  }
  return []
}
