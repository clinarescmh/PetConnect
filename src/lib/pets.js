/** Utilidades de storage para mascotas, dueño y seguidos. */

export const PETS_KEY      = 'petconnect_pets'
export const OWNER_KEY     = 'petconnect_owner'
export const FOLLOWING_KEY = 'petconnect_following'

export function genId() {
  return 'pet_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
}

/** Carga todas las mascotas del usuario (migra desde key viejo si existe). */
export function loadPets() {
  try {
    const stored = JSON.parse(localStorage.getItem(PETS_KEY) || '[]')
    if (Array.isArray(stored) && stored.length > 0) return stored
    // Migrar desde clave antigua (single pet)
    const old = JSON.parse(localStorage.getItem('petconnect_my_pet') || 'null')
    if (old) {
      const migrated = [{ ...old, id: old.id || genId() }]
      savePets(migrated)
      return migrated
    }
    return []
  } catch { return [] }
}

export function savePets(pets) {
  localStorage.setItem(PETS_KEY, JSON.stringify(pets))
  // Compatibilidad hacia atrás
  if (pets[0]) localStorage.setItem('petconnect_my_pet', JSON.stringify(pets[0]))
}

export function loadOwner() {
  try { return JSON.parse(localStorage.getItem(OWNER_KEY) || 'null') }
  catch { return null }
}

export function saveOwner(owner) {
  localStorage.setItem(OWNER_KEY, JSON.stringify(owner))
}

export function loadFollowing() {
  try { return JSON.parse(localStorage.getItem(FOLLOWING_KEY) || '[]') }
  catch { return [] }
}

export function toggleFollow(petId) {
  const cur = loadFollowing()
  const upd = cur.includes(petId) ? cur.filter(id => id !== petId) : [...cur, petId]
  localStorage.setItem(FOLLOWING_KEY, JSON.stringify(upd))
  return upd
}

export function isFollowing(petId) {
  return loadFollowing().includes(petId)
}

/** Genera sugerencia de username a partir del nombre y especie. */
export function suggestUsername(nombre, especie) {
  const clean = (nombre || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 18)
  const suffix = { perro:'dog', gato:'cat', conejo:'bunny', ave:'bird' }[especie] || 'pet'
  return `${clean || 'mascota'}_${suffix}`
}
