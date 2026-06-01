-- ─────────────────────────────────────────────────
-- PetConnect – Schema completo
-- Pega esto en el SQL Editor de Supabase:
-- https://supabase.com/dashboard/project/tfkxwqatecoucbcnwtxx/sql/new
-- ─────────────────────────────────────────────────

-- POSTS (feed)
-- Nota: columna 'name' omitida — la tabla preexistía sin ella
CREATE TABLE IF NOT EXISTS posts (
  id            BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  breed         TEXT,
  owner         TEXT,
  avatar        TEXT,
  owner_avatar  TEXT,
  likes         INT DEFAULT 0,
  comments      INT DEFAULT 0,
  caption       TEXT,
  time_ago      TEXT,
  tag           TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
GRANT ALL ON posts TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE posts_id_seq TO anon, authenticated;

-- VETS
CREATE TABLE IF NOT EXISTS vets (
  id          BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name        TEXT,
  distance    TEXT,
  rating      NUMERIC(3,1),
  open        BOOLEAN DEFAULT TRUE,
  specialty   TEXT,
  icon        TEXT,
  urgent      BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE vets DISABLE ROW LEVEL SECURITY;
GRANT ALL ON vets TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE vets_id_seq TO anon, authenticated;

-- WALKERS
CREATE TABLE IF NOT EXISTS walkers (
  id          BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name        TEXT,
  avatar      TEXT,
  rating      NUMERIC(3,1),
  reviews     INT DEFAULT 0,
  distance    TEXT,
  price       INT,
  services    TEXT[],
  verified    BOOLEAN DEFAULT FALSE,
  available   BOOLEAN DEFAULT TRUE,
  badge       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE walkers DISABLE ROW LEVEL SECURITY;
GRANT ALL ON walkers TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE walkers_id_seq TO anon, authenticated;

-- ADOPTIONS
CREATE TABLE IF NOT EXISTS adoptions (
  id           BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name         TEXT,
  species      TEXT,
  breed        TEXT,
  age          TEXT,
  gender       TEXT,
  avatar       TEXT,
  org          TEXT,
  zone         TEXT,
  vaccinated   BOOLEAN DEFAULT FALSE,
  castrated    BOOLEAN DEFAULT FALSE,
  description  TEXT,
  urgent       BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE adoptions DISABLE ROW LEVEL SECURITY;
GRANT ALL ON adoptions TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE adoptions_id_seq TO anon, authenticated;

-- LODGING
CREATE TABLE IF NOT EXISTS lodging (
  id          BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name        TEXT,
  host        TEXT,
  avatar      TEXT,
  rating      NUMERIC(3,1),
  reviews     INT DEFAULT 0,
  price       INT,
  zone        TEXT,
  capacity    TEXT,
  amenities   TEXT[],
  available   BOOLEAN DEFAULT TRUE,
  badge       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE lodging DISABLE ROW LEVEL SECURITY;
GRANT ALL ON lodging TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE lodging_id_seq TO anon, authenticated;

-- LOST_PETS
-- Nota: columna 'found' omitida — la tabla preexistía sin ella
CREATE TABLE IF NOT EXISTS lost_pets (
  id          BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name        TEXT,
  breed       TEXT,
  avatar      TEXT,
  zone        TEXT,
  time_seen   TEXT,
  contact     TEXT,
  reward      BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE lost_pets DISABLE ROW LEVEL SECURITY;
GRANT ALL ON lost_pets TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE lost_pets_id_seq TO anon, authenticated;

-- PETS
-- Nota: columna 'age' omitida — la tabla preexistía sin ella
CREATE TABLE IF NOT EXISTS pets (
  id           BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name         TEXT NOT NULL,
  breed        TEXT,
  owner        TEXT,
  avatar       TEXT,
  owner_avatar TEXT,
  species      TEXT DEFAULT 'dog',
  weight       NUMERIC(5,2),
  chip         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE pets DISABLE ROW LEVEL SECURITY;
GRANT ALL ON pets TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE pets_id_seq TO anon, authenticated;

-- ─────────────────────────────────────────────────
-- BUSINESSES (negocios registrados)
-- plan: free | basic | premium
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS businesses (
  id          BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre      TEXT NOT NULL,
  categoria   TEXT NOT NULL, -- veterinaria | tienda | farmacia | grooming | alojamiento
  direccion   TEXT,
  telefono    TEXT,
  email       TEXT,
  descripcion TEXT,
  horario     TEXT,
  foto        TEXT,
  website     TEXT,
  plan        TEXT DEFAULT 'free',
  active      BOOLEAN DEFAULT TRUE,
  visitas     INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;
GRANT ALL ON businesses TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE businesses_id_seq TO anon, authenticated;

-- ─────────────────────────────────────────────────
-- WALKERS — columnas adicionales para registro
-- ─────────────────────────────────────────────────
ALTER TABLE walkers ADD COLUMN IF NOT EXISTS descripcion        TEXT;
ALTER TABLE walkers ADD COLUMN IF NOT EXISTS telefono           TEXT;
ALTER TABLE walkers ADD COLUMN IF NOT EXISTS email              TEXT;
ALTER TABLE walkers ADD COLUMN IF NOT EXISTS zona               TEXT;
ALTER TABLE walkers ADD COLUMN IF NOT EXISTS experiencia        INT DEFAULT 0;
ALTER TABLE walkers ADD COLUMN IF NOT EXISTS tiene_seguro       BOOLEAN DEFAULT FALSE;
ALTER TABLE walkers ADD COLUMN IF NOT EXISTS tiene_certificacion BOOLEAN DEFAULT FALSE;
ALTER TABLE walkers ADD COLUMN IF NOT EXISTS redes              TEXT;
ALTER TABLE walkers ADD COLUMN IF NOT EXISTS estado             TEXT DEFAULT 'pendiente';
ALTER TABLE walkers ADD COLUMN IF NOT EXISTS disponibilidad     TEXT;

-- ─────────────────────────────────────────────────
-- CHALLENGES (retos semanales)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenges (
  id            BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  titulo        TEXT NOT NULL,
  descripcion   TEXT,
  foto          TEXT,          -- URL foto de ejemplo
  fecha_inicio  DATE,
  fecha_fin     DATE,
  activo        BOOLEAN DEFAULT TRUE,
  participantes INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE challenges DISABLE ROW LEVEL SECURITY;
GRANT ALL ON challenges TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE challenges_id_seq TO anon, authenticated;

-- Reto inicial de ejemplo
INSERT INTO challenges (titulo, descripcion, foto, fecha_inicio, fecha_fin, activo, participantes)
VALUES (
  'Foto de tu mascota durmiendo en posición graciosa 😴',
  'Comparte la foto más creativa de tu mascota durmiendo. ¡La más votada gana el badge Campeón Semanal! 🏆',
  '/Beagle.jpeg',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL ''7 days'',
  true,
  247
)
ON CONFLICT DO NOTHING;
