import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import { getLocation, fetchNearbyVets, fetchNearbyPetShops } from "./lib/overpass";
import { F, ThemeContext, useTheme } from "./lib/theme";
import BusinessForm   from "./components/BusinessForm";
import WalkerForm     from "./components/WalkerForm";
import PetProfile     from "./components/PetProfile";
import { TabErrorBoundary } from "./components/ErrorBoundary";

/* ── Theme ── */
/* Paleta brand: naranja #FF8C00 · teal #2DD4BF · azul oscuro #1B3A6B */
const darkColors = {
  bg:        "#0D1B2E",   // azul marino profundo
  bgCard:    "#132240",   // navy card
  bgElevated:"#1A2E50",   // navy elevado
  border:    "#ffffff0E",
  borderHi:  "#ffffff1C",
  text:      "#F0EFEA",
  textSub:   "#8BA8C4",   // azul-gris suave
  textMuted: "#4A6480",
  accent:    "#FF8C00",   // naranja brand
  accentDim: "#FF8C0022",
  pink:      "#F055A3",
  pinkDim:   "#F055A322",
  blue:      "#4A9EFF",
  blueDim:   "#4A9EFF22",
  purple:    "#9B6EF5",
  purpleDim: "#9B6EF522",
  red:       "#FF5252",
  redDim:    "#FF525222",
  amber:     "#FFB547",
  amberDim:  "#FFB54722",
  teal:      "#2DD4BF",   // teal brand
  tealDim:   "#2DD4BF22",
};

const lightColors = {
  bg:         "#F4F6F9",   // gris muy suave (no blanco puro)
  bgCard:     "#FFFFFF",
  bgElevated: "#EBF0F6",
  border:     "#1B3A6B10",
  borderHi:   "#1B3A6B1A",
  text:       "#1B3A6B",   // azul oscuro brand — color principal
  textSub:    "#4A6A8A",
  textMuted:  "#8AAAC0",
  accent:     "#FF8C00",   // naranja brand completo — solo CTAs importantes
  accentDim:  "#FF8C0018",
  pink:       "#D4347A",
  pinkDim:    "#D4347A18",
  blue:       "#1B3A6B",
  blueDim:    "#1B3A6B18",
  purple:     "#7044D4",
  purpleDim:  "#7044D418",
  red:        "#D43030",
  redDim:     "#D4303018",
  amber:      "#C07800",
  amberDim:   "#C0780018",
  teal:       "#0E9E8A",
  tealDim:    "#0E9E8A18",
  /* Tokens de card para modo claro */
  cardBorder: "none",
  cardShadow: "0 2px 12px rgba(27,58,107,0.07), 0 1px 3px rgba(27,58,107,0.04)",
};

// F, ThemeContext, useTheme → importados desde ./lib/theme

/* ── Supabase data hook ─────────────────────────────────────────────────────
   Consulta la tabla dada; si falla o está vacía usa el fallback (mock data).
   Esto garantiza que la app funciona incluso si Supabase no está configurado.
─────────────────────────────────────────────────────────────────────────── */
function useData(table, fallback) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from(table)
      .select("*")
      .order("id")
      .then(({ data: rows, error }) => {
        if (!error && rows?.length > 0) {
          setData(rows);
        }
        setLoading(false);
      });
  }, [table]);

  return { data: data ?? fallback, loading };
}

/* ── Overpass (OpenStreetMap) hook ──────────────────────────────────────────
   Obtiene ubicación → consulta Overpass → retorna resultados reales.
   Múltiples capas de error handling para que nunca quede en loading eterno
   ni cause pantalla en blanco en producción.
─────────────────────────────────────────────────────────────────────────── */
const SANTIAGO_FALLBACK = { lat: -33.4569, lon: -70.6483, source: "default" };

function useOverpassData(fetcher, fallback) {
  const safeFallback = Array.isArray(fallback) ? fallback : (fallback ? [fallback] : []);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationSource, setLocationSource] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const finish = (results, src) => {
      if (cancelled) return;
      const safe = Array.isArray(results) && results.length > 0 ? results : safeFallback;
      setData(safe);
      if (src) setLocationSource(src);
      setLoading(false);
    };

    // Safety net: si en 28 s nada resolvió, fuerza fallback
    const safety = setTimeout(() => finish(safeFallback, "timeout"), 28_000);

    (async () => {
      try {
        // Capa 1: geolocalización (nunca debe lanzar, pero por las dudas)
        const loc = await getLocation().catch(() => SANTIAGO_FALLBACK);
        if (cancelled) return;
        setLocationSource(loc.source);

        // Capa 2: fetch Overpass (ya retorna [] en vez de lanzar)
        let results = [];
        try {
          results = await fetcher(loc.lat, loc.lon);
        } catch (fetchErr) {
          console.warn("[useOverpassData] fetcher error, using fallback:", fetchErr?.message);
        }

        clearTimeout(safety);
        finish(results, null);
      } catch (outerErr) {
        // Capa 3: cualquier otra excepción inesperada
        console.warn("[useOverpassData] unexpected error, using fallback:", outerErr?.message);
        clearTimeout(safety);
        finish(safeFallback, "default");
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(safety);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { data: data ?? safeFallback, loading, locationSource };
}

/* ── Supabase businesses hook ────────────────────────────────────────────────
   Retorna negocios ordenados: premium → basic → free.
   Si la tabla no existe aún, retorna [] silenciosamente.
─────────────────────────────────────────────────────────────────────────── */
function useBusinesses(categoria) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = supabase.from("businesses").select("*").eq("active", true);
    if (categoria) {
      if (Array.isArray(categoria)) q = q.in("categoria", categoria);
      else q = q.eq("categoria", categoria);
    }
    q.then(({ data: rows, error }) => {
      if (!error && rows?.length) {
        const order = { premium: 0, basic: 1, free: 2 };
        setData([...rows].sort((a, b) => (order[a.plan] ?? 3) - (order[b.plan] ?? 3)));
      }
      setLoading(false);
    });
  }, [JSON.stringify(categoria)]);

  return { data, loading };
}

/* ── BusinessCard ─────────────────────────────────────────────────────────────
   Tres variantes visuales según plan: free | basic | premium
─────────────────────────────────────────────────────────────────────────── */
const CAT_ICON = { veterinaria:"🏥", tienda:"🛒", farmacia:"💊", grooming:"✂️", alojamiento:"🏡" };

function BusinessCard({ biz }) {
  const { C } = useTheme();
  const icon = CAT_ICON[biz.categoria] || "🐾";
  const cat  = biz.categoria ? biz.categoria.charAt(0).toUpperCase() + biz.categoria.slice(1) : "";

  const callBtn = biz.telefono && (
    <Btn label="📞 Llamar" small color={C.accent}
      onClick={() => window.open(`tel:${biz.telefono}`)} />
  );
  const waBtn = biz.telefono && (
    <Btn label="💬 WhatsApp" small color={C.teal}
      onClick={() => window.open(`https://wa.me/${biz.telefono.replace(/\D/g, "")}`)} />
  );

  /* FREE */
  if (biz.plan === "free") return (
    <div style={{ ...makeCard(C), padding: "13px 14px", marginBottom: 10,
      display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: C.bgElevated,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 14, color: C.text }}>{biz.nombre}</div>
        <div style={{ fontFamily: F.body, fontSize: 11, color: C.textSub }}>{cat}</div>
        {biz.direccion && (
          <div style={{ fontFamily: F.body, fontSize: 10, color: C.textMuted, marginTop: 2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            📍 {biz.direccion}
          </div>
        )}
      </div>
      {callBtn}
    </div>
  );

  /* BASIC */
  if (biz.plan === "basic") return (
    <div style={{ ...makeCard(C), marginBottom: 14, overflow: "hidden" }}>
      {biz.foto && (
        <img src={biz.foto} alt={biz.nombre}
          style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
      )}
      <div style={{ padding: "14px" }}>
        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, color: C.text }}>{biz.nombre}</div>
        <div style={{ fontFamily: F.body, fontSize: 12, color: C.textSub, marginTop: 2 }}>{cat}</div>
        {biz.descripcion && (
          <div style={{ fontFamily: F.body, fontSize: 12, color: C.textSub, marginTop: 8, lineHeight: 1.5 }}>
            {biz.descripcion}
          </div>
        )}
        {biz.horario && (
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginTop: 6 }}>🕐 {biz.horario}</div>
        )}
        {biz.direccion && (
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginTop: 2 }}>📍 {biz.direccion}</div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {callBtn}{waBtn}
        </div>
      </div>
    </div>
  );

  /* PREMIUM */
  return (
    <div style={{ ...makeCard(C, { border: `1.5px solid ${C.accent}55` }), marginBottom: 14, overflow: "hidden" }}>
      {/* Badge destacado */}
      <div style={{ background: C.accent, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 13 }}>⭐</span>
        <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: C.bg, letterSpacing: 0.5 }}>
          DESTACADO
        </span>
        {biz.visitas > 0 && (
          <span style={{ marginLeft: "auto", fontFamily: F.body, fontSize: 10, color: C.bg, opacity: 0.75 }}>
            👁 {biz.visitas} visitas
          </span>
        )}
      </div>
      {biz.foto && (
        <img src={biz.foto} alt={biz.nombre}
          style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />
      )}
      <div style={{ padding: "14px" }}>
        <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 17, color: C.text }}>{biz.nombre}</div>
        <div style={{ fontFamily: F.body, fontSize: 12, color: C.accent, fontWeight: 600, marginTop: 2 }}>{cat}</div>
        {biz.descripcion && (
          <div style={{ fontFamily: F.body, fontSize: 12, color: C.textSub, marginTop: 8, lineHeight: 1.5 }}>
            {biz.descripcion}
          </div>
        )}
        {biz.horario && (
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginTop: 6 }}>🕐 {biz.horario}</div>
        )}
        {biz.direccion && (
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted, marginTop: 2 }}>📍 {biz.direccion}</div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {callBtn}{waBtn}
          {biz.website && (
            <Btn label="🌐 Web" small variant="ghost"
              onClick={() => window.open(biz.website, "_blank")} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Section label ── */
function SectionLabel({ label }) {
  const { C } = useTheme();
  return (
    <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: C.textMuted,
      textTransform: "uppercase", letterSpacing: 1.0, marginBottom: 10, marginTop: 4 }}>
      {label}
    </div>
  );
}

/* ── DogLoader — animación CSS pura, sin librerías ──────────────────────────
   Perrito corriendo persiguiendo un hueso, usando @keyframes y emojis.
   El contenedor tiene overflow:hidden; el personaje recorre de izquierda
   a derecha en un loop continuo.
─────────────────────────────────────────────────────────────────────────── */
function DogLoader({ message }) {
  const { C } = useTheme();
  return (
    <div style={{ padding:"40px 0 24px", userSelect:"none" }}>
      <style>{`
        @keyframes pc-scene {
          0%   { left: -90px; }
          100% { left: calc(100% + 50px); }
        }
        @keyframes pc-bounce {
          0%, 100% { transform: translateY(0px)   scaleY(1);    }
          30%       { transform: translateY(-12px) scaleY(0.92); }
          65%       { transform: translateY(-4px)  scaleY(1.04); }
        }
        @keyframes pc-bone {
          0%, 100% { transform: rotate(-18deg) translateY(-2px); }
          50%       { transform: rotate(18deg)  translateY(-9px); }
        }
        @keyframes pc-shadow {
          0%, 100% { transform: scaleX(1);    opacity: 0.18; }
          30%       { transform: scaleX(0.6);  opacity: 0.10; }
          65%       { transform: scaleX(0.85); opacity: 0.14; }
        }
        @keyframes pc-dust {
          0%   { opacity: 0.55; transform: translateX(0)    scale(1);    }
          100% { opacity: 0;    transform: translateX(-18px) scale(0.4); }
        }
      `}</style>

      {/* Pista de carrera */}
      <div style={{ position:"relative", height:80, overflow:"hidden" }}>

        {/* Línea del suelo */}
        <div style={{
          position:"absolute", bottom:12, left:"4%", right:"4%",
          height:2, borderRadius:2,
          background:`linear-gradient(to right, transparent, ${C.border} 15%, ${C.border} 85%, transparent)`,
        }} />

        {/* Escena: polvo + perro + hueso — todo se mueve junto */}
        <div style={{
          position:"absolute", top:10,
          display:"flex", alignItems:"flex-end", gap:4,
          animation:"pc-scene 1.7s linear infinite",
        }}>
          {/* Nube de polvo */}
          <span style={{
            fontSize:16, marginBottom:6, lineHeight:1,
            animation:"pc-dust 0.35s ease-out infinite",
          }}>💨</span>

          {/* Perrito con rebote */}
          <span style={{
            fontSize:38, lineHeight:1, display:"inline-block",
            animation:"pc-bounce 0.35s ease-in-out infinite",
          }}>🐕</span>

          {/* Hueso adelante */}
          <span style={{
            fontSize:26, lineHeight:1, display:"inline-block",
            marginLeft:8,
            animation:"pc-bone 0.7s ease-in-out infinite",
          }}>🦴</span>
        </div>

        {/* Sombra del perro (efecto suelo) */}
        <div style={{
          position:"absolute", bottom:8,
          width:32, height:6, borderRadius:"50%",
          background:C.textMuted,
          animation:"pc-scene 1.7s linear infinite, pc-shadow 0.35s ease-in-out infinite",
          marginLeft:6,
        }} />
      </div>

      {/* Mensaje */}
      <div style={{
        textAlign:"center", fontFamily:F.body, fontSize:13,
        color:C.textSub, fontWeight:500, marginTop:4,
      }}>
        {message ?? "Buscando en tu zona…"}
      </div>
    </div>
  );
}

/* ── Loading Skeleton ── */
function LoadingRows({ count = 3 }) {
  const { C } = useTheme();
  return (
    <div style={{ padding: "16px" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          background: C.bgCard, borderRadius: 20, border: `1px solid ${C.border}`,
          padding: "16px", marginBottom: 12, display: "flex", gap: 12, alignItems: "center",
        }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: C.bgElevated }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ height: 13, borderRadius: 6, background: C.bgElevated, width: "55%" }} />
            <div style={{ height: 11, borderRadius: 6, background: C.bgElevated, width: "35%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Helpers ── */
const makeCard = (C, extra = {}) => ({
  background: C.bgCard,
  borderRadius: 20,
  /* Light mode: sombra suave sin borde. Dark mode: borde sutil sin sombra. */
  border:     C.cardBorder !== undefined ? C.cardBorder : `1px solid ${C.border}`,
  boxShadow:  C.cardShadow,
  overflow: "hidden",
  ...extra,
});

/* ── Mock data (fallback si Supabase no responde) ── */
const mockPets = [
  { id:1, name:"Tobías", breed:"Golden Retriever", owner:"María L.", avatar:"🐕", owner_avatar:"👩", likes:142, comments:28, caption:"Primer día en el parque esta semana 🌿",          time_ago:"2h", tag:"#lavidacanina", photo:"/Golden_retriever.jpeg" },
  { id:2, name:"Luna",   breed:"Gata Persa",       owner:"Pedro R.", avatar:"🐈", owner_avatar:"👨", likes:267, comments:41, caption:"Reinando el balcón como siempre 👑",              time_ago:"4h", tag:"#catlife",       photo:"/Gato_persa.jpeg"       },
  { id:3, name:"Max",    breed:"Labrador",          owner:"Sofía V.", avatar:"🐶", owner_avatar:"👩‍🦰", likes:89,  comments:12, caption:"¡Aprendimos a sentarnos! Mamá orgullosa 🎉",    time_ago:"6h", tag:"#perrofeliz",   photo:"/Labrador.jpeg"         },
  { id:4, name:"Bella",  breed:"Beagle",            owner:"Carlos M.",avatar:"🐕", owner_avatar:"👨", likes:98,  comments:15, caption:"¡Primera competencia de olfato! 🏆 Campeona",   time_ago:"1d", tag:"#beaglelife",   photo:"/Beagle.jpeg"           },
  { id:5, name:"Coco",   breed:"Conejo",            owner:"Ana R.",   avatar:"🐰", owner_avatar:"👩", likes:134, comments:22, caption:"¿Quién dijo que los conejos no son fotogénicos? 🥕", time_ago:"2d", tag:"#conejito", photo:"/Conejo.jpeg"           },
];
const mockVets = [
  { id:1, name:"Clínica PetCare",  distance:"0.8 km", rating:4.8, open:true, specialty:"General",   icon:"🏥", urgent:false },
  { id:2, name:"Dr. González",     distance:"1.2 km", rating:4.9, open:true, specialty:"Cirugía",   icon:"⚕️", urgent:false },
  { id:3, name:"VetUrgencias 24h", distance:"2.1 km", rating:4.7, open:true, specialty:"Urgencias", icon:"🚨", urgent:true  },
];
const mockStores = [
  { id:1, name:"PetShop Central", type:"Alimentos & Accesorios", distance:"0.5 km", icon:"🛒", discount:"10% OFF" },
  { id:2, name:"NaturalPet",      type:"Comida Natural",         distance:"1.4 km", icon:"🥩", discount:null },
  { id:3, name:"PetModa",         type:"Accesorios & Ropa",      distance:"2.0 km", icon:"👗", discount:"Envío gratis" },
];
const mockBreeding = [
  { id:1, pet:"Bella", breed:"Beagle",          gender:"Hembra", owner:"Carlos M.", avatar:"🐕", verified:true  },
  { id:2, pet:"Thor",  breed:"Husky Siberiano", gender:"Macho",  owner:"Ana R.",    avatar:"🐺", verified:true  },
  { id:3, pet:"Coco",  breed:"French Bulldog",  gender:"Hembra", owner:"Luis P.",   avatar:"🐾", verified:false },
];
const mockProducts = [
  { id:1, name:"Collar Antipulgas Premium",  price:12990, icon:"🪢", rating:4.6, sold:234 },
  { id:2, name:"Comedero Automático Smart",  price:45990, icon:"🍽️", rating:4.8, sold:89  },
  { id:3, name:"Cama Ortopédica L",          price:28990, icon:"🛏️", rating:4.9, sold:156 },
  { id:4, name:"Juguete Kong XL",            price:8990,  icon:"🎾", rating:4.7, sold:412 },
];
const mockWalkers = [
  { id:1, name:"Camila Torres", avatar:"👩‍🦱", photo:"/Golden_retriever.jpeg", rating:4.9, reviews:87, distance:"0.4 km", price:8000, services:["Paseos","Guardería"],       verified:true,  available:true,  badge:"Top"  },
  { id:2, name:"Rodrigo Soto",  avatar:"👨‍🦲", photo:"/Labrador.jpeg",          rating:4.7, reviews:52, distance:"0.9 km", price:7500, services:["Paseos","Cuidado en casa"], verified:true,  available:true,  badge:null   },
  { id:3, name:"Valentina M.",  avatar:"👩‍🦰", photo:"/Beagle.jpeg",            rating:4.8, reviews:34, distance:"1.3 km", price:9000, services:["Guardería","Alojamiento"],  verified:true,  available:false, badge:"Nuevo"},
];
const mockHealthRecords = [
  { id:1, title:"Vacuna Séxtuple",         date:"15 Mar 2025", next:"15 Mar 2026", icon:"💉", status:"ok"      },
  { id:2, title:"Desparasitación Interna", date:"01 Feb 2025", next:"01 May 2025", icon:"💊", status:"overdue" },
  { id:3, title:"Control Anual",           date:"10 Ene 2025", next:"10 Ene 2026", icon:"🩺", status:"ok"      },
  { id:4, title:"Antirrábica",             date:"20 Nov 2024", next:"20 Nov 2025", icon:"💉", status:"soon"    },
];
const mockLostPets = [
  { id:1, name:"Firulais", breed:"Mestizo",     avatar:"🐕", photo:"/Beagle.jpeg",      zone:"Las Condes",  time_seen:"Hoy 09:30",  contact:"+56 9 1234 5678", reward:true,  description:"Collar azul, responde a su nombre" },
  { id:2, name:"Michi",    breed:"Gato Siamés", avatar:"🐈", photo:"/Gato_persa.jpeg",  zone:"Providencia", time_seen:"Ayer 18:00", contact:"+56 9 8765 4321", reward:false, description:"Ojos azules, sin collar"            },
];
const mockAdoption = [
  { id:1, name:"Pancho", species:"Perro", breed:"Mestizo",     age:"2 años", gender:"Macho",  avatar:"🐕", photo:"/Labrador.jpeg",         org:"Refugio Huellitas",  zone:"Maipú",      vaccinated:true,  castrated:true,  description:"Súper cariñoso, bueno con niños y otros perros.", urgent:false },
  { id:2, name:"Nube",   species:"Gato",  breed:"Angora mix",  age:"1 año",  gender:"Hembra", avatar:"🐈", photo:"/Gato_persa.jpeg",       org:"ONG PatitasFelices", zone:"Ñuñoa",      vaccinated:true,  castrated:true,  description:"Tranquila y muy mimosa. Ideal para departamento.", urgent:true  },
  { id:3, name:"Rocky",  species:"Perro", breed:"Pitbull mix", age:"4 años", gender:"Macho",  avatar:"🐶", photo:"/Beagle.jpeg",           org:"Particular",         zone:"La Florida", vaccinated:true,  castrated:false, description:"Dueño viaja al extranjero. Muy leal y obediente.",  urgent:true  },
];
/* ── Reto semanal ── */
const MOCK_CHALLENGE = {
  id:1, activo:true, participantes:247,
  titulo:      "Foto de tu mascota durmiendo en posición graciosa 😴",
  descripcion: "Comparte la foto más creativa de tu mascota durmiendo. ¡La más votada al final de la semana gana el badge Campeón Semanal! 🏆",
  foto:        "/Beagle.jpeg",
};
const CHALLENGE_POSTS = [
  { id:"c1", name:"Max",    photo:"/Labrador.jpeg",       challengeLikes:127, caption:"¡Ocupó el sofá entero! 😂" },
  { id:"c2", name:"Luna",   photo:"/Gato_persa.jpeg",     challengeLikes:98,  caption:"La reina necesita la almohada 👑" },
  { id:"c3", name:"Bella",  photo:"/Beagle.jpeg",         challengeLikes:76,  caption:"¿Esto es dormir? 🐶" },
];

const mockLodging = [
  { id:1, name:"Casa PetFriendly de Ana", host:"Ana Martínez",   avatar:"👩‍🦳", rating:4.9, reviews:63,  price:20000, zone:"Providencia", capacity:"Hasta 2 perros medianos", amenities:["Jardín","Cámara 24h","Fotos diarias"],         available:true,  badge:"Superhost" },
  { id:2, name:"PetHotel Luna Verde",     host:"Establecimiento", avatar:"🏡",  rating:4.7, reviews:128, price:15000, zone:"Las Condes",  capacity:"Todas las razas",         amenities:["Piscina canina","Paseos 2x día","Grooming"], available:true,  badge:null        },
  { id:3, name:"Guardería Familiar Soto", host:"Rodrigo Soto",   avatar:"👨‍🦲", rating:4.8, reviews:41,  price:12000, zone:"Maipú",       capacity:"Perros pequeños y gatos", amenities:["Sin jaulas","Fotos diarias"],                 available:false, badge:null        },
];
const mockNotifications = [
  { id:1, icon:"💉", title:"Desparasitación de Tobías vence en 3 días", sub:"Agenda una cita antes del 01 Jun", time:"Hace 10 min", dot:"#FF5252", unread:true  },
  { id:2, icon:"❤️", title:"A 23 personas les gustó la foto de Max",    sub:"Ver comentarios →",                time:"Hace 1h",    dot:"#F055A3", unread:true  },
  { id:3, icon:"📍", title:"Perro perdido a 600m de ti",                sub:"Firulais · Mestizo · Las Condes",  time:"Hace 2h",    dot:"#FFB547", unread:true  },
  { id:4, icon:"🏆", title:"¡Nuevo logro desbloqueado!",                sub:"\"Dueño Responsable\" — carnet completo", time:"Ayer", dot:"#C8F04D", unread:false },
  { id:5, icon:"🦮", title:"Camila terminó el paseo de Tobías",         sub:"45 min · 2.3 km recorridos · ¡Califica!", time:"Ayer", dot:"#4A9EFF", unread:false },
  { id:6, icon:"💕", title:"Match de cruza cerca de ti",                sub:"Husky Siberiano compatible con tu zona",  time:"Hace 2 días", dot:"#9B6EF5", unread:false },
];

/* ── Shared Components ── */
function Tag({ label, color }) {
  const { C } = useTheme();
  const cl = color ?? C.accent;
  return (
    <span style={{ background: cl + "22", color: cl, borderRadius: 8, padding: "3px 10px", fontFamily: F.body, fontSize: 11, fontWeight: 600, letterSpacing: 0.3 }}>{label}</span>
  );
}

function Btn({ label, onClick, variant = "primary", color, small }) {
  const { C } = useTheme();
  const bg = variant === "primary" ? (color || C.accent) : "transparent";
  const cl = variant === "primary" ? (color ? "#fff" : C.bg) : (color || C.textSub);
  const border = variant === "ghost" ? `1px solid ${C.borderHi}` : "none";
  return (
    <button onClick={onClick} style={{
      background: bg, color: cl, border, borderRadius: 12,
      padding: small ? "7px 14px" : "11px 18px",
      fontFamily: F.body, fontSize: small ? 12 : 13, fontWeight: 600,
      cursor: "pointer", transition: "opacity 0.15s", letterSpacing: 0.2,
      whiteSpace: "nowrap",
    }}>{label}</button>
  );
}

function Avatar({ emoji, size = 44, color, ring, photo }) {
  const { C } = useTheme();
  const bg = color ?? C.bgElevated;
  const shadow = ring ? `0 0 0 2px ${C.bg}, 0 0 0 3.5px ${ring}` : "none";
  const radius = size * 0.35;

  if (photo) {
    return (
      <div style={{ width:size, height:size, borderRadius:radius, overflow:"hidden",
        flexShrink:0, boxShadow:shadow }}>
        <img src={photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
      </div>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: bg, display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.52, flexShrink: 0, boxShadow: shadow,
    }}>{emoji}</div>
  );
}

function Divider() {
  const { C } = useTheme();
  return <div style={{ height: 1, background: C.border, margin: "0 16px" }} />;
}

function SearchBar({ placeholder, value, onChange }) {
  const { C } = useTheme();
  return (
    <div style={{ background: C.bgElevated, borderRadius: 14, padding: "11px 16px", display: "flex", alignItems: "center", gap: 10, border: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 16, opacity: 0.4 }}>⌕</span>
      <input
        placeholder={placeholder}
        value={value ?? ""}
        onChange={e => onChange?.(e.target.value)}
        style={{ border: "none", background: "none", fontFamily: F.body, fontSize: 13, flex: 1, outline: "none", color: C.text }}
      />
      {value && (
        <button onClick={() => onChange?.("")} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, fontSize: 14, padding: 0 }}>✕</button>
      )}
    </div>
  );
}

function FilterRow({ items, active, setActive, color }) {
  const { C } = useTheme();
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}>
      {items.map(f => (
        <button key={f} onClick={() => setActive(f)} style={{
          flexShrink: 0, borderRadius: 20, padding: "7px 16px", cursor: "pointer",
          fontFamily: F.body, fontSize: 12, fontWeight: 600, border: "none",
          background: active === f ? (color || C.accent) : C.bgElevated,
          color: active === f ? (color === C.accent || !color ? C.bg : "#fff") : C.textSub,
          transition: "all 0.15s",
        }}>{f}</button>
      ))}
    </div>
  );
}

/* ── NavBar ── */
/* ── Nav SVG Icons — líneas limpias, sin emojis ── */
const NavIcons = {
  feed: (on, col) => (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none"
      stroke={col} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10L12 3l9 7v10a1 1 0 01-1 1H15v-6H9v6H4a1 1 0 01-1-1z"
        fill={on ? col : "none"} />
    </svg>
  ),
  walkers: (on, col) => (
    <svg width={22} height={22} viewBox="0 0 24 24" fill={col}>
      <circle cx="8.8"  cy="5"    r="1.85"/>
      <circle cx="15.2" cy="5"    r="1.85"/>
      <circle cx="5.5"  cy="10.5" r="1.65"/>
      <circle cx="18.5" cy="10.5" r="1.65"/>
      <path d="M12 21c-3.5 0-6-2.8-5.4-6.8C7.1 11.5 9.5 10 12 10s4.9 1.5 5.4 4.2C18 18.2 15.5 21 12 21z"/>
    </svg>
  ),
  health: (on, col) => (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none"
      stroke={col} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l8.84 8.84 8.84-8.84a5.5 5.5 0 000-7.78z"
        fill={on ? col : "none"} />
    </svg>
  ),
  lost: (on, col) => (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none"
      stroke={col} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"
        fill={on ? col : "none"} />
      <circle cx="12" cy="10" r="3"
        fill={on ? "#fff" : "none"} stroke={on ? "none" : col} strokeWidth={1.5}/>
    </svg>
  ),
  more: (_on, col) => (
    <svg width={22} height={22} viewBox="0 0 24 24" fill={col}>
      <rect x="3"  y="3"  width="7.5" height="7.5" rx="2"/>
      <rect x="13.5" y="3"  width="7.5" height="7.5" rx="2"/>
      <rect x="3"  y="13.5" width="7.5" height="7.5" rx="2"/>
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>
    </svg>
  ),
};

function NavBar({ active, setActive, notifCount }) {
  const { C, isDark } = useTheme();
  const tabs = [
    { id:"feed",    icon:NavIcons.feed,    label:"Inicio"   },
    { id:"walkers", icon:NavIcons.walkers, label:"Paseos"   },
    { id:"health",  icon:NavIcons.health,  label:"Salud"    },
    { id:"lost",    icon:NavIcons.lost,    label:"Perdidos" },
    { id:"more",    icon:NavIcons.more,    label:"Más"      },
  ];
  return (
    <div style={{
      position:"fixed", bottom:16,
      left:"50%", transform:"translateX(-50%)",
      width:"calc(min(100vw, 420px) - 32px)",
      display:"flex",
      background: isDark ? "rgba(19,34,64,0.82)" : "rgba(255,255,255,0.88)",
      backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)",
      borderRadius:24,
      border:`1px solid ${C.borderHi}`,
      boxShadow: isDark
        ? "0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.14)"
        : "0 4px 24px rgba(27,58,107,0.12), 0 1px 6px rgba(27,58,107,0.06)",
      padding:"10px 8px 12px",
      zIndex:100,
    }}>
      {tabs.map(t => {
        const isOn = active === t.id;
        const iconColor = isOn ? C.bg : C.text;
        return (
          <button key={t.id} onClick={() => setActive(t.id)} style={{
            flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3,
            background:"none", border:"none", cursor:"pointer",
            opacity: isOn ? 1 : 0.65, transition:"all 0.15s",
            transform: isOn ? "translateY(-1px)" : "none",
          }}>
            <div style={{
              background: isOn ? C.accent : "transparent",
              borderRadius:12, padding:"5px 11px",
              transition:"all 0.15s", position:"relative",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              {t.icon(isOn, iconColor)}
              {t.id === "feed" && notifCount > 0 && (
                <span style={{ position:"absolute", top:-3, right:-3, background:C.red,
                  width:14, height:14, borderRadius:"50%", display:"flex",
                  alignItems:"center", justifyContent:"center",
                  fontSize:8, color:"#fff", fontWeight:700 }}>{notifCount}</span>
              )}
            </div>
            <span style={{ fontFamily:F.body, fontSize:10, fontWeight:600,
              color: isOn ? C.accent : C.textSub }}>
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── QuickNav ── */
const QUICK_ITEMS = [
  { id:"mymascota", emoji:"🐾", label:"Mi Mascota", mainTab:"feed"    },
  { id:"vets",      emoji:"🏥", label:"Vets",       mainTab:"more"    },
  { id:"stores",    emoji:"🛒", label:"Tiendas",    mainTab:"more"    },
  { id:"walkers",   emoji:"🦮", label:"Paseadores", mainTab:"walkers" },
  { id:"adoption",  emoji:"🏠", label:"Adopción",   mainTab:"more"    },
  { id:"lodging",   emoji:"🏡", label:"Alojamiento",mainTab:"more"    },
  { id:"breeding",  emoji:"💕", label:"Cruzas",     mainTab:"more"    },
  { id:"lost",      emoji:"📍", label:"Perdidos",   mainTab:"lost"    },
];

function QuickNav({ currentTab, currentSub, onNavigate }) {
  const { C, isDark } = useTheme();
  return (
    <div style={{
      display:"flex", gap:7, overflowX:"auto", padding:"10px 14px 12px",
      scrollbarWidth:"none", msOverflowStyle:"none",
      background: C.bg, borderBottom:`1px solid ${C.border}`,
      WebkitOverflowScrolling:"touch",
    }}>
      {QUICK_ITEMS.map(item => {
        const isActive =
          item.id === "mymascota"
            ? false  // nunca queda "seleccionado" — es una acción, no un estado
            : item.mainTab === "walkers" || item.mainTab === "lost"
              ? currentTab === item.mainTab
              : currentSub === item.id;

        /* Light mode: chip blanco con sombra / Dark mode: chip elevado */
        const chipBg = isDark
          ? (isActive ? C.accent + "22" : C.bgElevated)
          : (isActive ? C.accent + "12" : "#FFFFFF");

        const chipBorder = isDark
          ? `1.5px solid ${isActive ? C.accent + "88" : C.border}`
          : `1.5px solid ${isActive ? C.accent : "transparent"}`;

        const chipShadow = isDark
          ? "none"
          : isActive
            ? `0 0 0 2px ${C.accent}28`
            : "0 1px 4px rgba(27,58,107,0.10)";

        return (
          <button key={item.id} onClick={() => onNavigate(item)} style={{
            flexShrink:0, display:"flex", alignItems:"center", gap:5,
            background: chipBg,
            border: chipBorder,
            boxShadow: chipShadow,
            borderRadius:20, padding:"6px 13px 6px 10px",
            cursor:"pointer", transition:"all 0.15s", whiteSpace:"nowrap",
          }}>
            <span style={{ fontSize:13 }}>{item.emoji}</span>
            <span style={{ fontFamily:F.body, fontSize:11, fontWeight:600,
              color: isActive ? C.accent : C.text }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Header ── */
function Header({ tab, onBack, onNotif, unread }) {
  const { C, isDark, toggleTheme } = useTheme();
  const titles = {
    feed:"PetConnect", walkers:"Paseos & Cuidado", health:"Historial Médico",
    lost:"Mascotas Perdidas", more:"Servicios", vets:"Veterinarios",
    stores:"Tiendas", breeding:"Comunidad", store:"PetStore",
    adoption:"Adopción", lodging:"Alojamiento", notifications:"Notificaciones",
  };
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 18px 14px", background:C.bg, borderBottom:`1px solid ${C.border}`, backdropFilter:"blur(12px)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        {onBack
          ? <button onClick={onBack} style={{ background:C.bgElevated, border:`1px solid ${C.border}`, borderRadius:10, width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:16, color:C.text }}>←</button>
          : <img src="/icon.jpeg" alt="PetConnect" style={{ width:34, height:34, borderRadius:10, objectFit:"cover", flexShrink:0 }} />
        }
        <span style={{ fontFamily:F.display, fontWeight:800, fontSize:19, color:C.text, letterSpacing:-0.5 }}>{titles[tab] || "PetConnect"}</span>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={onNotif} style={{ background:C.bgElevated, border:`1px solid ${C.border}`, borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", position:"relative" }}>
          <span style={{ fontSize:16 }}>🔔</span>
          {unread > 0 && <span style={{ position:"absolute", top:-3, right:-3, background:C.red, width:14, height:14, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"#fff", fontWeight:700, border:`2px solid ${C.bg}` }}>{unread}</span>}
        </button>
        <button style={{ background:C.bgElevated, border:`1px solid ${C.border}`, borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
          <span style={{ fontSize:16 }}>💬</span>
        </button>
        <button onClick={toggleTheme} title={isDark ? "Modo claro" : "Modo oscuro"} style={{ background:C.bgElevated, border:`1px solid ${C.border}`, borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
          <span style={{ fontSize:16 }}>{isDark ? "☀️" : "🌙"}</span>
        </button>
      </div>
    </div>
  );
}

/* ── Notifications Panel ── */
function NotificationsTab() {
  const { C } = useTheme();
  const [items, setItems] = useState(mockNotifications);
  const markAll = () => setItems(prev => prev.map(n => ({ ...n, unread:false })));
  return (
    <div style={{ padding:"16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <span style={{ fontFamily:F.display, fontSize:16, color:C.text, fontWeight:700 }}>Todas</span>
        <button onClick={markAll} style={{ background:"none", border:"none", fontFamily:F.body, fontSize:12, color:C.accent, cursor:"pointer", fontWeight:600 }}>Marcar todas como leídas</button>
      </div>
      {items.map(n => (
        <div key={n.id} onClick={() => setItems(prev => prev.map(x => x.id === n.id ? { ...x, unread:false } : x))} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"14px", borderRadius:16, marginBottom:8, background: n.unread ? C.bgElevated : C.bgCard, border:`1px solid ${n.unread ? C.borderHi : C.border}`, cursor:"pointer", transition:"all 0.15s" }}>
          <div style={{ width:42, height:42, borderRadius:12, background:n.dot + "22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{n.icon}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:F.body, fontWeight:600, fontSize:13, color:C.text, lineHeight:1.4 }}>{n.title}</div>
            <div style={{ fontFamily:F.body, fontSize:12, color:C.textSub, marginTop:3 }}>{n.sub}</div>
            <div style={{ fontFamily:F.body, fontSize:11, color:C.textMuted, marginTop:5 }}>{n.time}</div>
          </div>
          {n.unread && <div style={{ width:8, height:8, borderRadius:"50%", background:n.dot, flexShrink:0, marginTop:4 }} />}
        </div>
      ))}
    </div>
  );
}

/* ── Weekly Challenge ── */
function WeeklyChallenge() {
  const { C } = useTheme();
  const [challenge, setChallenge] = useState(MOCK_CHALLENGE);
  const [participating, setParticipating] = useState(false);
  const [votes, setVotes] = useState({});
  const cameraRef = useRef();

  // Intenta cargar reto activo de Supabase
  useEffect(() => {
    supabase.from("challenges").select("*").eq("activo", true).limit(1)
      .then(({ data }) => { if (data?.[0]) setChallenge(data[0]); })
      .catch(() => {});
  }, []);

  const toggleVote = (id) => setVotes(v => ({ ...v, [id]: !v[id] }));

  const sorted = [...CHALLENGE_POSTS].sort((a, b) => {
    return (b.challengeLikes + (votes[b.id] ? 1 : 0)) - (a.challengeLikes + (votes[a.id] ? 1 : 0));
  });

  return (
    <div style={{ margin:"4px 16px 20px" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
        <span style={{ fontSize:16 }}>🏆</span>
        <span style={{ fontFamily:F.display, fontWeight:700, fontSize:13,
          color:C.text, letterSpacing:0.3 }}>RETO DE LA SEMANA</span>
        <div style={{ marginLeft:"auto", background:C.amber + "22", borderRadius:8,
          padding:"3px 10px" }}>
          <span style={{ fontFamily:F.body, fontSize:11, fontWeight:600, color:C.amber }}>
            3 días restantes
          </span>
        </div>
      </div>

      {/* Challenge card */}
      <div style={{ ...makeCard(C), overflow:"hidden", border:`1.5px solid ${C.accent}55` }}>
        {/* Foto de ejemplo */}
        <div style={{ position:"relative", height:170 }}>
          <img src={challenge.foto || "/Beagle.jpeg"} alt="reto"
            style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
          <div style={{ position:"absolute", inset:0,
            background:"linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.62) 100%)",
            pointerEvents:"none" }} />
          {/* Badge activo */}
          <div style={{ position:"absolute", top:10, left:12, background:C.accent,
            borderRadius:10, padding:"4px 12px", fontFamily:F.body, fontSize:11,
            fontWeight:700, color:C.bg }}>🏆 Reto activo</div>
          {/* Título sobre la foto */}
          <div style={{ position:"absolute", bottom:14, left:14, right:14,
            fontFamily:F.display, fontWeight:800, fontSize:15,
            color:"#fff", lineHeight:1.3, textShadow:"0 1px 6px rgba(0,0,0,0.4)" }}>
            {challenge.titulo}
          </div>
        </div>
        {/* Descripción + botón */}
        <div style={{ padding:"12px 14px 14px" }}>
          <div style={{ fontFamily:F.body, fontSize:12, color:C.textSub,
            lineHeight:1.55, marginBottom:12 }}>
            {challenge.descripcion}
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontFamily:F.body, fontSize:12, color:C.textMuted }}>
              👥 {(challenge.participantes || 247) + (participating ? 1 : 0)} participantes
            </span>
            <>
              {/* Input de cámara oculto */}
              <input ref={cameraRef} type="file" accept="image/*" capture="environment"
                style={{ display:"none" }} onChange={() => setParticipating(true)} />
              <button onClick={() => !participating && cameraRef.current?.click()} style={{
                background: participating ? C.teal : C.accent,
                color: participating ? "#fff" : C.bg,
                border:"none", borderRadius:12, padding:"9px 18px",
                fontFamily:F.body, fontSize:13, fontWeight:600,
                cursor: participating ? "default" : "pointer", transition:"all 0.2s",
              }}>
                {participating ? "✓ Participando" : "📸 Participar"}
              </button>
            </>
          </div>
        </div>
      </div>

      {/* Top participantes con votación */}
      <div style={{ marginTop:14 }}>
        <div style={{ fontFamily:F.body, fontSize:11, fontWeight:600, color:C.textSub,
          marginBottom:10 }}>Top participantes · vota por tu favorito</div>
        <div style={{ display:"flex", gap:10, overflowX:"auto",
          scrollbarWidth:"none", paddingBottom:4 }}>
          {sorted.map((p, i) => {
            const total = p.challengeLikes + (votes[p.id] ? 1 : 0);
            const isLeader = i === 0;
            return (
              <div key={p.id} style={{ width:120, flexShrink:0,
                background:C.bgCard, borderRadius:14,
                border:`1.5px solid ${isLeader ? C.amber + "88" : C.border}`,
                overflow:"hidden" }}>
                <div style={{ height:110, position:"relative" }}>
                  <img src={p.photo} alt={p.name}
                    style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  {isLeader && (
                    <div style={{ position:"absolute", top:6, right:6,
                      background:C.amber, borderRadius:6, padding:"2px 7px",
                      fontFamily:F.body, fontSize:10, fontWeight:700, color:"#fff" }}>
                      🏆 #1
                    </div>
                  )}
                </div>
                <div style={{ padding:"8px 10px 10px" }}>
                  <div style={{ fontFamily:F.body, fontSize:12, fontWeight:600,
                    color:C.text, marginBottom:5 }}>{p.name}</div>
                  <button onClick={() => toggleVote(p.id)} style={{
                    width:"100%", background: votes[p.id] ? C.pink + "18" : C.bgElevated,
                    border:`1px solid ${votes[p.id] ? C.pink + "44" : C.border}`,
                    borderRadius:8, padding:"5px 0",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:4,
                    cursor:"pointer",
                  }}>
                    <span style={{ fontSize:13 }}>{votes[p.id] ? "❤️" : "🤍"}</span>
                    <span style={{ fontFamily:F.body, fontSize:12, fontWeight:600,
                      color: votes[p.id] ? C.pink : C.textSub }}>{total}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Feed Tab ── */
function Stories() {
  const { C } = useTheme();
  const items = [
    { emoji:"➕",  name:"Añadir", dim:true },
    { photo:"/Golden_retriever.jpeg", emoji:"🐕", name:"Tobías" },
    { photo:"/Gato_persa.jpeg",       emoji:"🐈", name:"Luna"   },
    { photo:"/Labrador.jpeg",         emoji:"🐶", name:"Max"    },
    { photo:"/Beagle.jpeg",           emoji:"🐕", name:"Thor"   },
    { photo:"/Conejo.jpeg",           emoji:"🐰", name:"Coco"   },
    { photo:"/Gato_persa.jpeg",       emoji:"🐈", name:"Nala"   },
    { emoji:"🦜", name:"Kiwi" },
  ];

  // Degradado de anillo estilo Instagram
  const RING = "linear-gradient(135deg, #FF8C00 0%, #F055A3 40%, #4A9EFF 100%)";

  return (
    <div style={{ display:"flex", gap:10, overflowX:"auto", padding:"10px 16px 14px", scrollbarWidth:"none" }}>
      {items.map((s, i) => {
        const hasRing = !s.dim; // todas salvo el botón "+"
        return (
          <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, flexShrink:0, cursor:"pointer" }}>
            {/* Contenedor exterior: el degradado aparece como anillo */}
            <div style={{
              width: 64, height: 64,
              borderRadius: 21,
              padding: hasRing ? 2.5 : 0,
              background: s.dim
                ? "transparent"
                : RING,
              flexShrink: 0,
            }}>
              {/* Interior: fondo sólido crea el gap visual entre anillo y foto */}
              <div style={{
                width: "100%", height: "100%",
                borderRadius: s.dim ? 20 : 18,
                overflow: "hidden",
                background: s.dim ? C.bgElevated : C.bg,
                border: s.dim ? `1.5px dashed ${C.borderHi}` : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {s.photo ? (
                  <img src={s.photo} alt={s.name}
                    style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                ) : (
                  <span style={{ fontSize:26 }}>{s.emoji}</span>
                )}
              </div>
            </div>
            <span style={{ fontFamily:F.body, fontSize:10, fontWeight:500, color:C.textSub }}>{s.name}</span>
          </div>
        );
      })}
    </div>
  );
}

function PostCard({ post, onPetClick }) {
  const { C } = useTheme();
  const [liked, setLiked] = useState(false);
  const [burst, setBurst] = useState(false);

  const handleLike = () => {
    if (!liked) { setBurst(true); setTimeout(() => setBurst(false), 700); }
    setLiked(l => !l);
  };
  const postColors = ["#C8F04D", "#F055A3", "#4A9EFF", "#9B6EF5", "#2DD4BF"];
  const bg = postColors[post.id % postColors.length];
  return (
    <div style={{ ...makeCard(C), margin:"0 16px 14px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 14px 10px" }}>
        {/* Zona clicable → perfil de la mascota */}
        <div onClick={onPetClick}
          style={{ display:"flex", alignItems:"center", gap:10, flex:1,
            cursor: onPetClick ? "pointer" : "auto" }}>
          <div style={{ position:"relative" }}>
            <Avatar emoji={post.avatar} size={42} color={C.bgElevated} ring={C.accent} />
            <div style={{ position:"absolute", bottom:-3, right:-3, width:20, height:20, borderRadius:7, background:C.bgCard, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, border:`1px solid ${C.border}` }}>{post.owner_avatar}</div>
          </div>
          <div>
            <div style={{ fontFamily:F.display, fontWeight:700, fontSize:14, color:C.text }}>
              {post.name || post.breed || "Mascota"}
            </div>
            <div style={{ fontFamily:F.body, fontSize:11, color:C.textSub }}>
              {[post.name && post.breed ? post.breed : null, post.owner, post.time_ago]
                .filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>
        <button style={{ background:"none", border:"none", color:C.textMuted, cursor:"pointer", fontSize:18 }}>⋯</button>
      </div>
      {/* Foto del post — usa post.photo (mock local) o post.foto (Supabase).
          El fallback solo aparece si ninguno de los dos existe. */}
      {(post.photo || post.foto) ? (
        <img
          src={post.photo || post.foto}
          alt={post.name ?? "foto"}
          style={{ width:"100%", height:240, objectFit:"cover", display:"block" }}
        />
      ) : (
        <div style={{ margin:"0 14px 12px", borderRadius:14, height:180,
          background:`linear-gradient(135deg, ${bg}18, ${bg}08)`,
          border:`1px solid ${bg}30`, display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:80 }}>
          {["🌿","☀️","🏡"][(post.id ?? 0) % 3]}
        </div>
      )}
      <div style={{ padding:"0 14px 4px" }}>
        <span style={{ fontFamily:F.body, fontSize:13, color:C.text }}>{post.caption} </span>
        <span style={{ fontFamily:F.body, fontSize:13, color:C.accent }}>{post.tag}</span>
      </div>
      <div style={{ display:"flex", alignItems:"center", padding:"10px 14px 14px", gap:4 }}>
        <button onClick={handleLike} style={{ display:"flex", alignItems:"center", gap:6,
          background: liked ? C.pink + "18" : C.bgElevated,
          border:`1px solid ${liked ? C.pink + "44" : C.border}`,
          borderRadius:12, padding:"7px 14px", cursor:"pointer",
          transition:"background 0.2s, border-color 0.2s",
          position:"relative", overflow:"visible" }}>
          {/* Anillo de explosión */}
          {burst && <span style={{ position:"absolute", inset:0, borderRadius:12,
            border:`2px solid ${C.pink}`, animation:"heart-ring 0.6s ease forwards",
            pointerEvents:"none" }} />}
          <span style={{ fontSize:14, display:"inline-block",
            animation: burst ? "heart-pop 0.6s ease" : "none" }}>
            {liked ? "❤️" : "🤍"}
          </span>
          <span style={{ fontFamily:F.body, fontSize:12, fontWeight:600,
            color: liked ? C.pink : C.textSub }}>{post.likes + (liked ? 1 : 0)}</span>
        </button>
        <button style={{ display:"flex", alignItems:"center", gap:6, background:C.bgElevated, border:`1px solid ${C.border}`, borderRadius:12, padding:"7px 14px", cursor:"pointer" }}>
          <span style={{ fontSize:14 }}>💬</span>
          <span style={{ fontFamily:F.body, fontSize:12, fontWeight:600, color:C.textSub }}>{post.comments}</span>
        </button>
        <button style={{ background:C.bgElevated, border:`1px solid ${C.border}`, borderRadius:12, padding:"7px 12px", cursor:"pointer", fontSize:14 }}>📤</button>
        <button style={{ marginLeft:"auto", background:C.bgElevated, border:`1px solid ${C.border}`, borderRadius:12, padding:"7px 12px", cursor:"pointer", fontSize:14 }}>🔖</button>
      </div>
    </div>
  );
}

function FeedTab() {
  const { C, openPetProfile } = useTheme();
  const posts = mockPets;

  return (
    <div>
      {/* Check-in diario */}
      <div style={{ margin:"14px 16px", background:`linear-gradient(135deg, ${C.accent}18, ${C.accent}06)`, border:`1px solid ${C.accent}33`, borderRadius:16, padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ fontSize:28 }}>🌤️</div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:F.display, fontWeight:700, fontSize:13, color:C.accent }}>Check-in diario</div>
          <div style={{ fontFamily:F.body, fontSize:12, color:C.textSub, marginTop:2 }}>¿Cómo amaneció Tobías hoy?</div>
        </div>
        <Btn label="Registrar →" small />
      </div>

      {/* Stories */}
      <div style={{ padding:"0 16px 4px" }}>
        <span style={{ fontFamily:F.display, fontWeight:700, fontSize:13, color:C.textSub, letterSpacing:0.5, textTransform:"uppercase" }}>Stories</span>
      </div>
      <Stories />

      {/* ── Reto de la Semana ── */}
      <WeeklyChallenge />

      {/* Compositor de post */}
      <div style={{ padding:"0 16px 12px" }}>
        <div style={{ background:C.bgElevated, borderRadius:16, padding:"12px 14px", display:"flex", alignItems:"center", gap:10, border:`1px solid ${C.border}` }}>
          <Avatar emoji="🐕" size={36} color={C.bgCard} />
          <div style={{ flex:1, fontFamily:F.body, fontSize:13, color:C.textMuted }}>¿Qué está haciendo tu mascota?</div>
          <span style={{ fontSize:20, cursor:"pointer" }}>📷</span>
        </div>
      </div>

      {/* Posts */}
      {posts.map(p => (
        <PostCard key={p.id} post={p} onPetClick={() => openPetProfile(p)} />
      ))}
    </div>
  );
}

/* ── Walkers Tab ── */
function WalkersTab({ onRegisterWalker }) {
  const { C } = useTheme();
  const { data: walkers, loading } = useData("walkers", mockWalkers);
  const [filter, setFilter] = useState("Todos");
  return (
    <div style={{ padding:"16px" }}>
      <div style={{ background:`linear-gradient(135deg, ${C.teal}22, ${C.teal}08)`, border:`1px solid ${C.teal}44`, borderRadius:18, padding:"16px", marginBottom:16, display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ width:48, height:48, borderRadius:14, background:C.teal + "22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>📍</div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontFamily:F.display, fontWeight:700, fontSize:14, color:C.teal }}>Paseo en curso</span>
            <span style={{ width:8, height:8, borderRadius:"50%", background:C.teal, display:"inline-block" }} />
          </div>
          <div style={{ fontFamily:F.body, fontSize:12, color:C.textSub, marginTop:2 }}>Camila · Tobías · 1.2 km recorridos</div>
        </div>
        <Btn label="Ver mapa" small color={C.teal} />
      </div>
      {/* Banner de registro */}
      <div onClick={onRegisterWalker} style={{
        background: `linear-gradient(135deg, ${C.teal}22, ${C.teal}08)`,
        border: `1px solid ${C.teal}55`, borderRadius: 16, padding: "14px 16px",
        marginBottom: 16, display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
      }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: C.teal + "22",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🦮</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 14, color: C.teal }}>
            ¿Eres paseador?
          </div>
          <div style={{ fontFamily: F.body, fontSize: 12, color: C.textSub, marginTop: 2 }}>
            Regístrate gratis y llega a más dueños →
          </div>
        </div>
      </div>

      <div style={{ marginBottom:14 }}><SearchBar placeholder="Buscar paseadores..." /></div>
      <div style={{ marginBottom:16 }}><FilterRow items={["Todos","Paseos","Guardería","Alojamiento","Cuidado"]} active={filter} setActive={setFilter} color={C.teal} /></div>
      {loading ? <LoadingRows count={3} /> : walkers.map(w => (
        <div key={w.id} style={{ ...makeCard(C), padding:"16px", marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
            <div style={{ position:"relative" }}>
              <Avatar emoji={w.avatar} photo={w.photo} size={54} color={C.bgElevated} />
              {w.badge && <div style={{ position:"absolute", top:-6, right:-6, background: w.badge==="Top" ? C.accent : C.blue, borderRadius:8, padding:"2px 7px", fontFamily:F.body, fontSize:9, fontWeight:700, color: w.badge==="Top" ? C.bg : "#fff" }}>{w.badge}</div>}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontFamily:F.display, fontWeight:700, fontSize:15, color:C.text }}>{w.name}</span>
                {(w.estado === "verificado" || w.verified) && <span style={{ fontSize:13 }}>✅</span>}
                {w.estado === "pendiente" && !w.verified && (
                  <span style={{ background: C.amber + "22", color: C.amber, borderRadius: 6,
                    padding: "2px 7px", fontFamily: F.body, fontSize: 10, fontWeight: 600 }}>
                    Pendiente
                  </span>
                )}
              </div>
              <div style={{ fontFamily:F.body, fontSize:11, color:C.textSub, marginTop:2 }}>⭐ {w.rating} ({w.reviews}) · {w.distance}</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
                {(w.services || []).map(s => <Tag key={s} label={s} color={C.teal} />)}
              </div>
            </div>
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{ fontFamily:F.display, fontWeight:800, fontSize:17, color:C.accent }}>${Number(w.price).toLocaleString()}</div>
              <div style={{ fontFamily:F.body, fontSize:10, color:C.textMuted }}>/ paseo</div>
              <div style={{ fontFamily:F.body, fontSize:11, fontWeight:600, color: w.available ? C.teal : C.textMuted, marginTop:6 }}>
                {w.available ? "● Disponible" : "○ Ocupado"}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:14 }}>
            <Btn label="📅 Reservar" color={w.available ? C.teal : C.textMuted} />
            <Btn label="💬 Mensaje" variant="ghost" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Health Tab ── */
function HealthTab() {
  const { C } = useTheme();
  const [section, setSection] = useState("pasaporte");
  const sColors = { ok:C.accent, soon:C.amber, overdue:C.red };
  const sLabels = { ok:"Al día", soon:"Próximo", overdue:"Vencido" };
  return (
    <div style={{ padding:"16px" }}>
      <div style={{ background:`linear-gradient(135deg, ${C.blue}22, ${C.blue}08)`, border:`1px solid ${C.blue}33`, borderRadius:18, padding:"16px", marginBottom:16, display:"flex", alignItems:"center", gap:14 }}>
        <Avatar emoji="🐕" size={54} color={C.blue + "22"} />
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:F.display, fontWeight:800, fontSize:17, color:C.text }}>Tobías</div>
          <div style={{ fontFamily:F.body, fontSize:12, color:C.textSub }}>Golden Retriever · 3 años · Macho</div>
          <div style={{ fontFamily:F.body, fontSize:11, color:C.textMuted, marginTop:3 }}>Chip: 985141003012345</div>
        </div>
        <Btn label="Cambiar" variant="ghost" small />
      </div>
      <div style={{ background:C.redDim, border:`1px solid ${C.red}44`, borderRadius:14, padding:"12px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:20 }}>⚠️</span>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:F.body, fontWeight:600, fontSize:13, color:C.red }}>Desparasitación vencida</div>
          <div style={{ fontFamily:F.body, fontSize:11, color:C.textSub }}>Venció el 01 May · Agenda cita hoy</div>
        </div>
        <Btn label="Agendar" small color={C.red} />
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:16, background:C.bgElevated, borderRadius:14, padding:4 }}>
        {[["pasaporte","📋 Pasaporte"],["vacunas","💉 Vacunas"],["diario","📓 Diario"]].map(([id, label]) => (
          <button key={id} onClick={() => setSection(id)} style={{ flex:1, border:"none", borderRadius:10, padding:"9px 4px", fontFamily:F.body, fontSize:11, fontWeight:600, cursor:"pointer", background: section===id ? C.blue : "transparent", color: section===id ? "#fff" : C.textSub, transition:"all 0.15s" }}>{label}</button>
        ))}
      </div>
      {section === "pasaporte" && mockHealthRecords.map(r => (
        <div key={r.id} style={{ ...makeCard(C), padding:"14px", marginBottom:10, display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:sColors[r.status] + "18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{r.icon}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:F.body, fontWeight:600, fontSize:13, color:C.text }}>{r.title}</div>
            <div style={{ fontFamily:F.body, fontSize:11, color:C.textSub }}>Próximo: {r.next}</div>
          </div>
          <Tag label={sLabels[r.status]} color={sColors[r.status]} />
        </div>
      ))}
      {section === "vacunas" && (
        <div style={{ ...makeCard(C), padding:"16px" }}>
          {[
            { name:"Séxtuple (DHPPI+L)", dates:["Mar 2023","Mar 2024","Mar 2025"], status:"ok"   },
            { name:"Antirrábica",         dates:["Nov 2023","Nov 2024"],            status:"soon" },
            { name:"Bordetella",          dates:["Jun 2024"],                       status:"ok"   },
          ].map((v, i, arr) => (
            <div key={i}>
              <div style={{ padding:"12px 0" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontFamily:F.body, fontWeight:600, fontSize:13, color:C.text }}>💉 {v.name}</span>
                  <Tag label={sLabels[v.status]} color={sColors[v.status]} />
                </div>
                <div style={{ display:"flex", gap:6, marginTop:8 }}>
                  {v.dates.map((d, j) => (
                    <span key={j} style={{ background:C.bgElevated, borderRadius:8, padding:"4px 10px", fontFamily:F.body, fontSize:11, color:C.textSub, border:`1px solid ${C.border}` }}>D{j+1}: {d}</span>
                  ))}
                </div>
              </div>
              {i < arr.length - 1 && <Divider />}
            </div>
          ))}
          <div style={{ marginTop:12 }}><Btn label="📤 Compartir con veterinario" color={C.blue} /></div>
        </div>
      )}
      {section === "diario" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
            {[
              { icon:"🍽️", label:"Alimentación", value:"2x hoy",  color:C.accent },
              { icon:"💧", label:"Hidratación",  value:"Normal",  color:C.blue   },
              { icon:"⚖️", label:"Peso",          value:"28.5 kg", color:C.purple },
              { icon:"😊", label:"Ánimo",         value:"¡Feliz!", color:C.pink   },
            ].map((s, i) => (
              <div key={i} style={{ ...makeCard(C), padding:"16px", textAlign:"center" }}>
                <div style={{ fontSize:28 }}>{s.icon}</div>
                <div style={{ fontFamily:F.body, fontSize:11, color:C.textSub, marginTop:6 }}>{s.label}</div>
                <div style={{ fontFamily:F.display, fontWeight:700, fontSize:16, color:s.color, marginTop:3 }}>{s.value}</div>
              </div>
            ))}
          </div>
          <Btn label="+ Registrar entrada del día" color={C.accent} />
        </div>
      )}
    </div>
  );
}

/* ── Lost Tab ── */
function LostTab() {
  const { C } = useTheme();
  const { data: lostPets, loading } = useData("lost_pets", mockLostPets);
  const [mode, setMode] = useState("perdidos");
  const [alertSent, setAlertSent] = useState(false);
  return (
    <div style={{ padding:"16px" }}>
      <div style={{ background:`linear-gradient(135deg, ${C.red}22, ${C.red}08)`, border:`1px solid ${C.red}44`, borderRadius:18, padding:"18px", marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontSize:38 }}>🚨</div>
          <div>
            <div style={{ fontFamily:F.display, fontWeight:800, fontSize:17, color:C.red }}>¿Se perdió tu mascota?</div>
            <div style={{ fontFamily:F.body, fontSize:12, color:C.textSub, marginTop:3 }}>Alerta a toda tu comunidad en segundos</div>
          </div>
        </div>
        <button onClick={() => setAlertSent(!alertSent)} style={{ width:"100%", marginTop:14, background: alertSent ? C.teal : C.red, border:"none", borderRadius:12, padding:"13px", fontFamily:F.display, fontSize:14, fontWeight:700, color:"#fff", cursor:"pointer", transition:"all 0.2s" }}>
          {alertSent ? "✓ Alerta enviada a 247 vecinos" : "📢 Activar alerta comunitaria"}
        </button>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:16, background:C.bgElevated, borderRadius:14, padding:4 }}>
        {[["perdidos","🔴 Perdidos"],["encontrados","🟢 Encontrados"],["reportar","📝 Reportar"]].map(([id, label]) => (
          <button key={id} onClick={() => setMode(id)} style={{ flex:1, border:"none", borderRadius:10, padding:"9px 4px", fontFamily:F.body, fontSize:11, fontWeight:600, cursor:"pointer", background: mode===id ? C.red : "transparent", color: mode===id ? "#fff" : C.textSub, transition:"all 0.15s" }}>{label}</button>
        ))}
      </div>
      {mode === "perdidos" && (
        loading ? <LoadingRows count={2} /> : lostPets.map(p => (
          <div key={p.id} style={{ ...makeCard(C, { border:`1px solid ${C.red}33` }), padding:"16px", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
              <Avatar emoji={p.avatar} photo={p.photo} size={56} color={C.red + "18"} />
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:F.display, fontWeight:800, fontSize:16, color:C.text }}>{p.name}</div>
                <div style={{ fontFamily:F.body, fontSize:12, color:C.textSub }}>{p.breed}</div>
                <div style={{ fontFamily:F.body, fontSize:12, color:C.textSub, marginTop:2 }}>📍 {p.zone}{p.time_seen ? ` · ${p.time_seen}` : ''}</div>
                <div style={{ fontFamily:F.body, fontSize:12, color:C.textSub, marginTop:6, fontStyle:"italic" }}>"{p.description}"</div>
              </div>
              {p.reward && <Tag label="💰 Recompensa" color={C.amber} />}
            </div>
            <div style={{ display:"flex", gap:8, marginTop:14 }}>
              <Btn label={`📞 ${p.contact}`} color={C.teal} />
              <Btn label="👀 Lo vi" variant="ghost" />
            </div>
          </div>
        ))
      )}
      {mode === "encontrados" && (
        <div style={{ ...makeCard(C), padding:"32px", textAlign:"center" }}>
          <div style={{ fontSize:52 }}>🎉</div>
          <div style={{ fontFamily:F.display, fontWeight:800, fontSize:18, color:C.accent, marginTop:12 }}>2 mascotas encontradas esta semana</div>
          <div style={{ fontFamily:F.body, fontSize:13, color:C.textSub, marginTop:8 }}>Gracias a la comunidad PetConnect</div>
        </div>
      )}
      {mode === "reportar" && (
        <div style={{ ...makeCard(C), padding:"18px" }}>
          {["Nombre de la mascota","Raza y color","Zona donde se perdió","Señas particulares"].map((ph, i) => (
            <div key={i} style={{ background:C.bgElevated, borderRadius:12, padding:"13px 14px", marginBottom:10, fontFamily:F.body, fontSize:13, color:C.textMuted, border:`1px solid ${C.border}` }}>{ph}</div>
          ))}
          <Btn label="🚨 Publicar alerta" color={C.red} />
        </div>
      )}
    </div>
  );
}

/* ── Adoption Tab ── */
function AdoptionTab() {
  const { C } = useTheme();
  const { data: adoptions, loading } = useData("adoptions", mockAdoption);
  const [filter, setFilter] = useState("Todos");
  const [applied, setApplied] = useState([]);
  const filtered = adoptions.filter(p =>
    filter === "Todos" || (filter === "Urgente" ? p.urgent : p.species === filter)
  );
  return (
    <div style={{ padding:"16px" }}>
      <div style={{ background:`linear-gradient(135deg, ${C.purple}22, ${C.purple}08)`, border:`1px solid ${C.purple}33`, borderRadius:18, padding:"18px", marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ fontSize:42 }}>🏠</div>
          <div>
            <div style={{ fontFamily:F.display, fontWeight:800, fontSize:17, color:C.text }}>Adopción Responsable</div>
            <div style={{ fontFamily:F.body, fontSize:12, color:C.textSub, marginTop:3 }}>{adoptions.length} mascotas esperan un hogar hoy</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:14 }}>
          {[["312","Adoptados\neste año"],["28","Refugios\nasociados"],["100%","Verificados"]].map(([n, l], i) => (
            <div key={i} style={{ flex:1, background:C.bgCard + "88", borderRadius:12, padding:"10px", textAlign:"center", border:`1px solid ${C.border}` }}>
              <div style={{ fontFamily:F.display, fontWeight:800, fontSize:18, color:C.purple }}>{n}</div>
              <div style={{ fontFamily:F.body, fontSize:9, color:C.textSub, marginTop:2, whiteSpace:"pre-line", lineHeight:1.3 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginBottom:14 }}><SearchBar placeholder="Buscar por raza, zona, edad..." /></div>
      <div style={{ marginBottom:16 }}><FilterRow items={["Todos","Perros","Gatos","Urgente"]} active={filter} setActive={setFilter} color={C.purple} /></div>
      {loading ? <LoadingRows count={3} /> : filtered.map(p => (
        <div key={p.id} style={{ ...makeCard(C, { border: p.urgent ? `1px solid ${C.red}44` : `1px solid ${C.border}` }), marginBottom:14 }}>
          <div style={{ height:180, position:"relative", overflow:"hidden",
            background:`linear-gradient(135deg, ${C.purple}18, ${C.purple}06)` }}>
            {p.photo ? (
              <img src={p.photo} alt={p.name}
                style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
            ) : (
              <div style={{ height:"100%", display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:76 }}>{p.avatar}</div>
            )}
            {p.urgent && <div style={{ position:"absolute", top:10, left:10, background:C.red, borderRadius:10, padding:"4px 10px", fontFamily:F.body, fontSize:11, fontWeight:700, color:"#fff" }}>🚨 URGENTE</div>}
            <div style={{ position:"absolute", top:10, right:10, background:"rgba(0,0,0,0.45)", backdropFilter:"blur(8px)", borderRadius:10, padding:"4px 10px", fontFamily:F.body, fontSize:11, fontWeight:600, color:"#fff", border:`1px solid rgba(255,255,255,0.2)` }}>{p.age} · {p.gender}</div>
          </div>
          <div style={{ padding:"14px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <div>
                <div style={{ fontFamily:F.display, fontWeight:800, fontSize:18, color:C.text }}>{p.name}</div>
                <div style={{ fontFamily:F.body, fontSize:12, color:C.textSub }}>{p.breed} · {p.zone}</div>
                <div style={{ fontFamily:F.body, fontSize:11, color:C.purple, marginTop:3, fontWeight:600 }}>📋 {p.org}</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {p.vaccinated  && <Tag label="💉 Vacunado"  color={C.teal} />}
                {p.castrated   && <Tag label="✂️ Castrado"  color={C.blue} />}
              </div>
            </div>
            <div style={{ fontFamily:F.body, fontSize:12, color:C.textSub, fontStyle:"italic", marginBottom:14 }}>"{p.description}"</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setApplied(prev => prev.includes(p.id) ? prev : [...prev, p.id])} style={{ flex:2, border:"none", borderRadius:12, padding:"12px", fontFamily:F.body, fontSize:13, fontWeight:600, cursor:"pointer", background: applied.includes(p.id) ? C.teal : C.purple, color:"#fff", transition:"all 0.2s" }}>
                {applied.includes(p.id) ? "✓ Solicitud enviada" : "❤️ Quiero adoptarlo"}
              </button>
              <Btn label="💬 Consultar" variant="ghost" />
            </div>
          </div>
        </div>
      ))}
      <div style={{ background:C.purple + "11", border:`1px dashed ${C.purple}44`, borderRadius:16, padding:"18px", textAlign:"center" }}>
        <div style={{ fontSize:28 }}>🏢</div>
        <div style={{ fontFamily:F.display, fontWeight:700, fontSize:14, color:C.purple, marginTop:8 }}>¿Eres un refugio u ONG?</div>
        <div style={{ fontFamily:F.body, fontSize:12, color:C.textSub, marginTop:4 }}>Publica tus mascotas gratis</div>
        <div style={{ marginTop:12 }}><Btn label="Registrar mi refugio" color={C.purple} /></div>
      </div>
    </div>
  );
}

/* ── Lodging Tab ── */
function LodgingTab() {
  const { C } = useTheme();
  const { data: lodgings, loading } = useData("lodging", mockLodging);
  const [type, setType] = useState("Todo");
  return (
    <div style={{ padding:"16px" }}>
      <div style={{ background:`linear-gradient(135deg, ${C.blue}22, ${C.blue}08)`, border:`1px solid ${C.blue}33`, borderRadius:18, padding:"18px", marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ fontSize:42 }}>🏡</div>
          <div>
            <div style={{ fontFamily:F.display, fontWeight:800, fontSize:17, color:C.text }}>Alojamiento</div>
            <div style={{ fontFamily:F.body, fontSize:12, color:C.textSub, marginTop:3 }}>Tu mascota, en un hogar de confianza</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:14 }}>
          {[["📅","15–20 Jun"],["🐕","Tobías"],["📍","Tu zona"]].map(([icon, val], i) => (
            <div key={i} style={{ flex:1, background:C.bgCard + "88", borderRadius:12, padding:"10px 12px", border:`1px solid ${C.border}`, cursor:"pointer" }}>
              <div style={{ fontFamily:F.body, fontSize:10, color:C.textMuted, fontWeight:600, textTransform:"uppercase", letterSpacing:0.5 }}>{icon}</div>
              <div style={{ fontFamily:F.body, fontSize:12, color:C.text, fontWeight:600, marginTop:3 }}>{val}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginBottom:16 }}><FilterRow items={["Todo","Casa familiar","Hotel","Guardería"]} active={type} setActive={setType} color={C.blue} /></div>
      {loading ? <LoadingRows count={3} /> : lodgings.map(l => (
        <div key={l.id} style={{ ...makeCard(C), marginBottom:14, opacity: l.available ? 1 : 0.55 }}>
          <div style={{ height:120, background:`linear-gradient(135deg, ${C.blue}18, ${C.blue}06)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:60, position:"relative" }}>
            {l.avatar}
            {l.badge && <div style={{ position:"absolute", top:10, left:10, background:C.blue, borderRadius:10, padding:"4px 10px", fontFamily:F.body, fontSize:11, fontWeight:700, color:"#fff" }}>⭐ {l.badge}</div>}
            {!l.available && <div style={{ position:"absolute", top:10, right:10, background:C.bgCard + "cc", borderRadius:10, padding:"4px 10px", fontFamily:F.body, fontSize:11, fontWeight:600, color:C.textSub, border:`1px solid ${C.border}` }}>Sin disponibilidad</div>}
          </div>
          <div style={{ padding:"14px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
              <div>
                <div style={{ fontFamily:F.display, fontWeight:800, fontSize:16, color:C.text }}>{l.name}</div>
                <div style={{ fontFamily:F.body, fontSize:12, color:C.textSub }}>Con {l.host} · {l.zone}</div>
                <div style={{ fontFamily:F.body, fontSize:11, color:C.textSub, marginTop:2 }}>⭐ {l.rating} ({l.reviews} reseñas)</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:F.display, fontWeight:800, fontSize:18, color:C.accent }}>${Number(l.price).toLocaleString()}</div>
                <div style={{ fontFamily:F.body, fontSize:10, color:C.textMuted }}>/ noche</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
              {(l.amenities || []).map((a, i) => <Tag key={i} label={"✓ " + a} color={C.blue} />)}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <Btn label={l.available ? "📅 Reservar" : "No disponible"} color={l.available ? C.blue : C.textMuted} />
              <Btn label="💬 Chat" variant="ghost" />
            </div>
          </div>
        </div>
      ))}
      <div style={{ background:C.blue + "11", border:`1px dashed ${C.blue}44`, borderRadius:16, padding:"18px", textAlign:"center" }}>
        <div style={{ fontSize:28 }}>💰</div>
        <div style={{ fontFamily:F.display, fontWeight:700, fontSize:14, color:C.blue, marginTop:8 }}>¿Tienes espacio en tu casa?</div>
        <div style={{ fontFamily:F.body, fontSize:12, color:C.textSub, marginTop:4 }}>Gana dinero cuidando mascotas</div>
        <div style={{ marginTop:12 }}><Btn label="Ser anfitrión 🏡" color={C.blue} /></div>
      </div>
    </div>
  );
}

/* ── More Tab ── */
function MoreTab({ onNavigate, onRegisterBusiness }) {
  const { C } = useTheme();
  const items = [
    { id:"adoption", icon:"🏠", label:"Adopción",    desc:"Mascotas buscan hogar hoy",    color:C.purple },
    { id:"lodging",  icon:"🏡", label:"Alojamiento", desc:"Casas y hoteles pet-friendly", color:C.blue   },
    { id:"vets",     icon:"🏥", label:"Veterinarios",desc:"Clínicas y urgencias 24h",     color:C.red    },
    { id:"stores",   icon:"🛒", label:"Tiendas",     desc:"Alimentos y accesorios cerca", color:C.teal   },
    { id:"breeding", icon:"💕", label:"Cruzas",      desc:"Conecta con dueños responsables", color:C.pink },
    { id:"store",    icon:"🏪", label:"PetStore",    desc:"Compras con envío a domicilio", color:C.accent },
  ];
  return (
    <div style={{ padding:"16px" }}>
      <div style={{ ...makeCard(C), padding:"16px", marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <span style={{ fontFamily:F.display, fontWeight:700, fontSize:15, color:C.text }}>🏆 Tus logros</span>
          <span style={{ fontFamily:F.body, fontSize:12, color:C.accent, fontWeight:600 }}>Ver todos →</span>
        </div>
        <div style={{ display:"flex", gap:10, overflowX:"auto", scrollbarWidth:"none" }}>
          {[
            { icon:"💉", label:"Carnet completo", done:true  },
            { icon:"🦮", label:"5 paseos",         done:true  },
            { icon:"📸", label:"10 fotos",          done:true  },
            { icon:"❤️", label:"Primera adopción", done:false },
            { icon:"⭐", label:"Reseña top",        done:false },
          ].map((a, i) => (
            <div key={i} style={{ flexShrink:0, textAlign:"center", width:64 }}>
              <div style={{ width:52, height:52, borderRadius:16, background: a.done ? C.accent + "22" : C.bgElevated, border:`1px solid ${a.done ? C.accent + "44" : C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, margin:"0 auto", filter: a.done ? "none" : "grayscale(1) opacity(0.4)" }}>{a.icon}</div>
              <div style={{ fontFamily:F.body, fontSize:9, color: a.done ? C.accent : C.textMuted, marginTop:5, lineHeight:1.3 }}>{a.label}</div>
            </div>
          ))}
        </div>
      </div>
      {/* CTA registro negocio */}
      <div onClick={onRegisterBusiness} style={{
        background: `linear-gradient(135deg, ${C.accent}22, ${C.accent}08)`,
        border: `1px solid ${C.accent}44`, borderRadius: 18, padding: "18px",
        marginBottom: 20, display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
      }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: C.accent + "22",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🏪</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 16, color: C.text }}>
            ¿Tienes un negocio?
          </div>
          <div style={{ fontFamily: F.body, fontSize: 12, color: C.textSub, marginTop: 3 }}>
            Regístralo y llega a miles de dueños de mascotas →
          </div>
        </div>
      </div>

      <div style={{ fontFamily:F.body, fontSize:11, color:C.textMuted, fontWeight:600, textTransform:"uppercase", letterSpacing:0.8, marginBottom:12 }}>Servicios</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {items.map(item => (
          <div key={item.id} onClick={() => onNavigate(item.id)} style={{ ...makeCard(C), padding:"18px", cursor:"pointer", transition:"border-color 0.15s" }}>
            <div style={{ width:44, height:44, borderRadius:14, background:item.color + "18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, marginBottom:10 }}>{item.icon}</div>
            <div style={{ fontFamily:F.display, fontWeight:700, fontSize:14, color:C.text }}>{item.label}</div>
            <div style={{ fontFamily:F.body, fontSize:11, color:C.textSub, marginTop:4, lineHeight:1.4 }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Sub-tabs ── */
function VetsTab() {
  const { C } = useTheme();
  const [search, setSearch] = useState("");

  // ── Estado siempre inicializado con mock data ──────────────────────────────
  // La tab NUNCA bloquea en loading ni arroja variables indefinidas.
  // Overpass y Supabase son mejoras en background; si fallan, se queda el mock.
  const [osmVets, setOsmVets]         = useState([]);   // empieza vacío, sin mock
  const [bizVets, setBizVets]         = useState([]);
  const [locationSource, setLocSrc]   = useState(null);
  const [osmLoading, setOsmLoading]   = useState(false);

  // Supabase businesses — silent fail, no bloquea render
  useEffect(() => {
    supabase.from("businesses").select("*")
      .eq("active", true).eq("categoria", "veterinaria")
      .then(({ data: rows, error }) => {
        if (!error && Array.isArray(rows) && rows.length > 0) {
          const ord = { premium: 0, basic: 1, free: 2 };
          setBizVets([...rows].sort((a, b) => (ord[a.plan] ?? 3) - (ord[b.plan] ?? 3)));
        }
      })
      .catch(() => {}); // tabla puede no existir aún
  }, []);

  // Overpass — se carga en background, lista vacía visible de inmediato
  useEffect(() => {
    let cancelled = false;
    const FALLBACK = { lat: -33.4569, lon: -70.6483, source: "default" };
    const safety = setTimeout(() => { if (!cancelled) setOsmLoading(false); }, 20_000);

    setOsmLoading(true);
    console.log('[VetsTab] useEffect Nominatim disparado');

    (async () => {
      try {
        const loc = await getLocation().catch(e => {
          console.warn('[VetsTab] getLocation error:', e?.message);
          return FALLBACK;
        });
        if (cancelled) return;

        console.log('[VetsTab] coords:', loc.lat.toFixed(5), loc.lon.toFixed(5), loc.source);
        setLocSrc(loc.source ?? "default");

        const results = await fetchNearbyVets(loc.lat, loc.lon).catch(e => {
          console.warn('[VetsTab] fetchNearbyVets error:', e?.message);
          return [];
        });
        if (cancelled) return;

        console.log('[VetsTab] resultados:', results.length);
        if (Array.isArray(results) && results.length > 0) setOsmVets(results);
      } catch (err) {
        console.warn('[VetsTab] error inesperado:', err?.message);
      } finally {
        clearTimeout(safety);
        if (!cancelled) setOsmLoading(false);
      }
    })();

    return () => { cancelled = true; clearTimeout(safety); };
  }, []);

  // Filtros — siempre arrays, optional chaining para seguridad
  const urgent      = osmVets.filter(v => v?.urgent);
  const filteredBiz = bizVets.filter(b =>
    !search || (b?.nombre ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const filteredOSM = osmVets.filter(v =>
    !search || (v?.name ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const isOSMReal = osmVets !== mockVets;

  return (
    <div style={{ padding:"16px" }}>

      {/* Banner ubicación */}
      {locationSource && (
        <div style={{
          background: locationSource === "gps" ? `${C.teal}18` : `${C.amber}18`,
          border: `1px solid ${locationSource === "gps" ? C.teal : C.amber}44`,
          borderRadius: 14, padding: "10px 14px", marginBottom: 12,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 15 }}>📍</span>
          <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600,
            color: locationSource === "gps" ? C.teal : C.amber, flex: 1 }}>
            {locationSource === "gps"
              ? `${osmVets.length} veterinarias encontradas cerca de ti`
              : "Mostrando resultados en Santiago centro — activa la ubicación para mayor precisión"}
          </span>
        </div>
      )}

      {/* Urgencias */}
      <div style={{ background:C.redDim, border:`1px solid ${C.red}44`, borderRadius:18,
        padding:"16px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ fontSize:36 }}>🚨</div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:F.display, fontWeight:800, fontSize:17, color:C.red }}>URGENCIAS 24H</div>
          <div style={{ fontFamily:F.body, fontSize:12, color:C.textSub, marginTop:2 }}>
            {osmLoading ? "Buscando clínicas cerca…" :
              urgent.length > 0 ? `${urgent.length} con atención 24h · Toca para llamar`
              : "Clínicas abiertas cerca · Toca para llamar"}
          </div>
        </div>
      </div>

      <div style={{ marginBottom:14 }}>
        <SearchBar placeholder="Buscar veterinarios..." value={search} onChange={setSearch} />
      </div>

      {/* Estado: cargando (lista vacía) */}
      {osmLoading && osmVets.length === 0 && bizVets.length === 0 && (
        <DogLoader message="Buscando veterinarias cercanas…" />
      )}

      {/* Estado: actualización silenciosa (ya hay resultados) */}
      {osmLoading && (osmVets.length > 0 || bizVets.length > 0) && (
        <div style={{ textAlign:"center", fontFamily:F.body, fontSize:11, color:C.textMuted,
          marginBottom:10, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
          <span style={{ opacity:0.5 }}>🔄</span> Actualizando…
        </div>
      )}

      {/* Estado: sin resultados */}
      {!osmLoading && filteredBiz.length === 0 && filteredOSM.length === 0 && !search && (
        <div style={{ textAlign:"center", padding:"40px 24px" }}>
          <div style={{ fontSize:52 }}>🏥</div>
          <div style={{ fontFamily:F.display, fontWeight:700, fontSize:17, color:C.text, marginTop:14 }}>
            No se encontraron veterinarias
          </div>
          <div style={{ fontFamily:F.body, fontSize:13, color:C.textSub, marginTop:8,
            lineHeight:1.6, maxWidth:260, margin:"8px auto 0" }}>
            No hay resultados en OpenStreetMap para tu zona.
            Intenta activar la ubicación para buscar más cerca.
          </div>
        </div>
      )}

      {/* Negocios registrados */}
      {filteredBiz.length > 0 && (
        <>
          <SectionLabel label="Negocios registrados" />
          {filteredBiz.map(b => <BusinessCard key={`biz-${b.id}`} biz={b} />)}
        </>
      )}

      {/* Resultados OSM */}
      {filteredOSM.length > 0 && (
        <>
          {filteredBiz.length > 0 && (
            <SectionLabel label={isOSMReal ? "Más cerca (OpenStreetMap)" : "Cerca de ti"} />
          )}
          {filteredOSM.map(v => (
            <div key={v.id} style={{ ...makeCard(C, { border: v.urgent ? `1px solid ${C.red}44` : `1px solid ${C.border}` }),
              padding:"14px", marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                <Avatar emoji={v.urgent ? "🚨" : "🏥"} size={48}
                  color={v.urgent ? C.red + "18" : C.bgElevated} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:F.body, fontWeight:600, fontSize:14, color:C.text }}>
                    {v.name ?? "Veterinaria"}
                  </div>
                  <div style={{ fontFamily:F.body, fontSize:11, color:C.textSub, marginTop:2 }}>
                    {v.specialty ?? "General"}{v.distance ? ` · ${v.distance}` : ""}
                  </div>
                  {v.address && (
                    <div style={{ fontFamily:F.body, fontSize:10, color:C.textMuted, marginTop:3,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {v.address}
                    </div>
                  )}
                  <div style={{ fontFamily:F.body, fontSize:11,
                    color: v.urgent ? C.red : C.teal, fontWeight:600, marginTop:4 }}>
                    {v.urgent ? "● Abierto 24h" : "● Abierto"}
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
                  {v.phone
                    ? <Btn label="📞 Llamar" small color={C.accent}
                        onClick={() => window.open(`tel:${v.phone}`)} />
                    : <Btn label="📅 Cita" small variant="ghost" />}
                  <Btn label="🗺 Ver" small variant="ghost"
                    onClick={() => window.open(
                      v.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((v.name ?? "veterinaria") + " Santiago Chile")}`,
                      "_blank"
                    )} />
                </div>
              </div>
            </div>
          ))}
          {isOSMReal && (
            <div style={{ textAlign:"center", padding:"4px 0 8px" }}>
              <span style={{ fontFamily:F.body, fontSize:10, color:C.textMuted }}>
                Datos OSM: © OpenStreetMap contributors
              </span>
            </div>
          )}
        </>
      )}

      {/* Sin resultados para búsqueda activa */}
      {search && filteredBiz.length === 0 && filteredOSM.length === 0 && (
        <div style={{ ...makeCard(C), padding:"28px", textAlign:"center" }}>
          <div style={{ fontSize:42 }}>🔍</div>
          <div style={{ fontFamily:F.display, fontWeight:700, fontSize:15,
            color:C.textSub, marginTop:10 }}>
            Sin resultados para "{search}"
          </div>
        </div>
      )}
    </div>
  );
}

const STORE_FILTERS = ["Todos", "Tienda", "Grooming", "Acuarios"];

function StoresTab() {
  const { C } = useTheme();
  const [cat, setCat]     = useState("Todos");
  const [search, setSearch] = useState("");

  // ── Estado siempre inicializado con mock data ──────────────────────────────
  const [osmStores, setOsmStores]   = useState([]);   // empieza vacío, sin mock
  const [bizStores, setBizStores]   = useState([]);
  const [locationSource, setLocSrc] = useState(null);
  const [osmLoading, setOsmLoading] = useState(false);

  // Supabase businesses — silent fail
  useEffect(() => {
    supabase.from("businesses").select("*")
      .eq("active", true)
      .in("categoria", ["tienda", "farmacia", "grooming", "alojamiento"])
      .then(({ data: rows, error }) => {
        if (!error && Array.isArray(rows) && rows.length > 0) {
          const ord = { premium: 0, basic: 1, free: 2 };
          setBizStores([...rows].sort((a, b) => (ord[a.plan] ?? 3) - (ord[b.plan] ?? 3)));
        }
      })
      .catch(() => {});
  }, []);

  // Overpass — background, mock visible de inmediato
  useEffect(() => {
    let cancelled = false;
    const FALLBACK = { lat: -33.4569, lon: -70.6483, source: "default" };
    const safety = setTimeout(() => { if (!cancelled) setOsmLoading(false); }, 20_000);

    setOsmLoading(true);
    (async () => {
      try {
        const loc = await getLocation().catch(() => FALLBACK);
        if (cancelled) return;
        setLocSrc(loc.source ?? "default");

        const results = await fetchNearbyPetShops(loc.lat, loc.lon).catch(() => []);
        if (cancelled) return;

        if (Array.isArray(results) && results.length > 0) setOsmStores(results);
      } catch {
        // silencio — osmStores ya tiene mockStores
      } finally {
        clearTimeout(safety);
        if (!cancelled) setOsmLoading(false);
      }
    })();

    return () => { cancelled = true; clearTimeout(safety); };
  }, []);

  const isOSMReal = osmStores !== mockStores;

  const filteredBiz = bizStores.filter(b =>
    !search || (b?.nombre ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const filteredOSM = osmStores.filter(s => {
    const matchSearch = !search || (s?.name ?? "").toLowerCase().includes(search.toLowerCase());
    const type = s?.type ?? "";
    const matchCat =
      cat === "Todos"    ? true :
      cat === "Tienda"   ? type.includes("mascota") || type.includes("Animal") || type.includes("Alimento") :
      cat === "Grooming" ? type.includes("room") :
      cat === "Acuarios" ? type.includes("cua") :
      true;
    return matchSearch && matchCat;
  });

  return (
    <div style={{ padding:"16px" }}>

      {/* Banner ubicación */}
      {locationSource && isOSMReal && (
        <div style={{
          background: locationSource === "gps" ? `${C.teal}18` : `${C.amber}18`,
          border: `1px solid ${locationSource === "gps" ? C.teal : C.amber}44`,
          borderRadius: 14, padding: "10px 14px", marginBottom: 12,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 15 }}>📍</span>
          <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600,
            color: locationSource === "gps" ? C.teal : C.amber, flex: 1 }}>
            {locationSource === "gps"
              ? `${osmStores.length} tiendas encontradas cerca de ti`
              : "Mostrando resultados en Santiago centro — activa la ubicación para mayor precisión"}
          </span>
        </div>
      )}

      <div style={{ marginBottom:14 }}>
        <SearchBar placeholder="Buscar tiendas de mascotas..." value={search} onChange={setSearch} />
      </div>

      <div style={{ marginBottom:16 }}>
        <FilterRow items={STORE_FILTERS} active={cat} setActive={setCat} color={C.teal} />
      </div>

      {/* Estado: cargando (lista vacía) */}
      {osmLoading && osmStores.length === 0 && bizStores.length === 0 && (
        <DogLoader message="Buscando tiendas cercanas…" />
      )}

      {/* Estado: actualización silenciosa */}
      {osmLoading && (osmStores.length > 0 || bizStores.length > 0) && (
        <div style={{ textAlign:"center", fontFamily:F.body, fontSize:11, color:C.textMuted,
          marginBottom:10, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
          <span style={{ opacity:0.5 }}>🔄</span> Actualizando…
        </div>
      )}

      {/* Estado: sin resultados */}
      {!osmLoading && filteredBiz.length === 0 && filteredOSM.length === 0 && !search && (
        <div style={{ textAlign:"center", padding:"40px 24px" }}>
          <div style={{ fontSize:52 }}>🛒</div>
          <div style={{ fontFamily:F.display, fontWeight:700, fontSize:17, color:C.text, marginTop:14 }}>
            No se encontraron tiendas
          </div>
          <div style={{ fontFamily:F.body, fontSize:13, color:C.textSub, marginTop:8,
            lineHeight:1.6, maxWidth:260, margin:"8px auto 0" }}>
            No hay resultados en OpenStreetMap para tu zona.
            Intenta activar la ubicación para buscar más cerca.
          </div>
        </div>
      )}

      {/* Negocios registrados */}
      {filteredBiz.length > 0 && (
        <>
          <SectionLabel label="Negocios registrados" />
          {filteredBiz.map(b => <BusinessCard key={`biz-${b.id}`} biz={b} />)}
        </>
      )}

      {/* Resultados OSM */}
      {filteredOSM.length > 0 && (
        <>
          {filteredBiz.length > 0 && (
            <SectionLabel label={isOSMReal ? "Más cerca (OpenStreetMap)" : "Cerca de ti"} />
          )}
          {filteredOSM.map(s => (
            <div key={s.id} style={{ ...makeCard(C), padding:"14px", marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <Avatar emoji={s.icon ?? "🐾"} size={50} color={C.teal + "18"} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:F.body, fontWeight:600, fontSize:14, color:C.text }}>
                    {s.name ?? "Tienda"}
                  </div>
                  <div style={{ fontFamily:F.body, fontSize:11, color:C.textSub }}>
                    {s.type ?? "Productos para mascotas"}
                    {s.distance ? ` · ${s.distance}` : ""}
                  </div>
                  {s.address && (
                    <div style={{ fontFamily:F.body, fontSize:10, color:C.textMuted, marginTop:2,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {s.address}
                    </div>
                  )}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
                  <Btn label="🗺 Ver" small color={C.teal}
                    onClick={() => window.open(
                      s.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((s.name ?? "tienda mascotas") + " Santiago Chile")}`,
                      "_blank"
                    )} />
                  {s.phone && (
                    <Btn label="📞" small variant="ghost"
                      onClick={() => window.open(`tel:${s.phone}`)} />
                  )}
                </div>
              </div>
            </div>
          ))}
          {isOSMReal && (
            <div style={{ textAlign:"center", padding:"4px 0 8px" }}>
              <span style={{ fontFamily:F.body, fontSize:10, color:C.textMuted }}>
                Datos OSM: © OpenStreetMap contributors
              </span>
            </div>
          )}
        </>
      )}

      {/* Sin resultados para búsqueda activa */}
      {search && filteredBiz.length === 0 && filteredOSM.length === 0 && (
        <div style={{ ...makeCard(C), padding:"28px", textAlign:"center" }}>
          <div style={{ fontSize:42 }}>🔍</div>
          <div style={{ fontFamily:F.display, fontWeight:700, fontSize:15,
            color:C.textSub, marginTop:10 }}>
            Sin resultados para "{search}"
          </div>
        </div>
      )}
    </div>
  );
}

function BreedingTab() {
  const { C } = useTheme();
  const [section, setSection] = useState("buscar");
  return (
    <div style={{ padding:"16px" }}>
      <div style={{ background:C.pinkDim, border:`1px solid ${C.pink}33`, borderRadius:18, padding:"18px", marginBottom:16, textAlign:"center" }}>
        <div style={{ fontSize:36 }}>💕</div>
        <div style={{ fontFamily:F.display, fontWeight:800, fontSize:17, color:C.text, marginTop:8 }}>Comunidad de Cruzas</div>
        <div style={{ fontFamily:F.body, fontSize:12, color:C.textSub, marginTop:4 }}>Conecta con dueños responsables</div>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:16, background:C.bgElevated, borderRadius:14, padding:4 }}>
        {["buscar","publicar","mis solicitudes"].map(s => (
          <button key={s} onClick={() => setSection(s)} style={{ flex:1, border:"none", borderRadius:10, padding:"9px 4px", fontFamily:F.body, fontSize:11, fontWeight:600, cursor:"pointer", background: section===s ? C.pink : "transparent", color: section===s ? "#fff" : C.textSub, textTransform:"capitalize", transition:"all 0.15s" }}>{s}</button>
        ))}
      </div>
      {mockBreeding.map(b => (
        <div key={b.id} style={{ ...makeCard(C), padding:"14px", marginBottom:10, display:"flex", alignItems:"center", gap:12 }}>
          <Avatar emoji={b.avatar} size={50} color={C.pink + "18"} />
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontFamily:F.body, fontWeight:600, fontSize:14, color:C.text }}>{b.pet}</span>
              {b.verified && <Tag label="✓ Verificado" color={C.blue} />}
            </div>
            <div style={{ fontFamily:F.body, fontSize:11, color:C.textSub }}>{b.breed} · {b.gender}</div>
          </div>
          <Btn label="💬 Contactar" small color={C.pink} />
        </div>
      ))}
    </div>
  );
}

function StoreTab() {
  const { C } = useTheme();
  const [cart, setCart] = useState([]);
  const addToCart = (id) => setCart(prev => prev.includes(id) ? prev : [...prev, id]);
  return (
    <div style={{ padding:"16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <span style={{ fontFamily:F.display, fontWeight:800, fontSize:18, color:C.text }}>PetStore</span>
        <div style={{ position:"relative" }}>
          <Btn label="🛒 Carrito" color={C.accent} small />
          {cart.length > 0 && <span style={{ position:"absolute", top:-6, right:-6, background:C.red, width:16, height:16, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, color:"#fff", fontWeight:700, border:`2px solid ${C.bg}` }}>{cart.length}</span>}
        </div>
      </div>
      <div style={{ background:`linear-gradient(135deg, ${C.accent}22, ${C.accent}08)`, border:`1px solid ${C.accent}33`, borderRadius:18, padding:"18px", marginBottom:18 }}>
        <div style={{ fontFamily:F.display, fontWeight:800, fontSize:20, color:C.accent }}>🎉 Envío Gratis</div>
        <div style={{ fontFamily:F.body, fontSize:13, color:C.textSub, marginTop:4 }}>En compras sobre $15.000 · Despacho en 24h</div>
      </div>
      <div style={{ fontFamily:F.display, fontWeight:700, fontSize:15, color:C.text, marginBottom:12 }}>Más vendidos 🔥</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {mockProducts.map(p => (
          <div key={p.id} style={{ ...makeCard(C), overflow:"hidden" }}>
            <div style={{ height:90, background:C.bgElevated, display:"flex", alignItems:"center", justifyContent:"center", fontSize:44 }}>{p.icon}</div>
            <div style={{ padding:"12px" }}>
              <div style={{ fontFamily:F.body, fontWeight:600, fontSize:12, color:C.text, marginBottom:4 }}>{p.name}</div>
              <div style={{ fontFamily:F.body, fontSize:10, color:C.textMuted, marginBottom:6 }}>⭐ {p.rating} · {p.sold} vendidos</div>
              <div style={{ fontFamily:F.display, fontWeight:800, fontSize:16, color:C.accent, marginBottom:10 }}>${p.price.toLocaleString()}</div>
              <button onClick={() => addToCart(p.id)} style={{ width:"100%", border:"none", borderRadius:10, padding:"9px", fontFamily:F.body, fontSize:11, fontWeight:600, cursor:"pointer", background: cart.includes(p.id) ? C.teal : C.accent, color: cart.includes(p.id) ? "#fff" : C.bg, transition:"all 0.2s" }}>
                {cart.includes(p.id) ? "✓ Agregado" : "Agregar →"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Root ── */
export default function PetConnect({ isDark, toggleTheme }) {
  const [activeTab,      setActiveTab]      = useState("feed");
  const [subTab,         setSubTab]         = useState(null);
  const [showNotif,      setShowNotif]      = useState(false);
  const [modal,          setModal]          = useState(null);       // null | 'business' | 'walker'
  const [petProfileData, setPetProfileData] = useState(null);      // mascota abierta globalmente
  const unreadCount = mockNotifications.filter(n => n.unread).length;
  const C = isDark ? darkColors : lightColors;
  const openModal      = setModal;
  const openPetProfile = setPetProfileData;

  const currentTab = showNotif ? "notifications" : (subTab || activeTab);

  const content = {
    feed:          <FeedTab />,
    walkers:       <WalkersTab onRegisterWalker={() => openModal("walker")} />,
    health:        <HealthTab />,
    lost:          <LostTab />,
    more:          <MoreTab onNavigate={id => setSubTab(id)} onRegisterBusiness={() => openModal("business")} />,
    vets:          <VetsTab />,
    stores:        <StoresTab />,
    breeding:      <BreedingTab />,
    store:         <StoreTab />,
    adoption:      <AdoptionTab />,
    lodging:       <LodgingTab />,
    notifications: <NotificationsTab />,
  };

  const handleBack = () => {
    if (showNotif) { setShowNotif(false); return; }
    setSubTab(null);
  };

  const needsBack = showNotif || !!subTab;

  return (
    <ThemeContext.Provider value={{ C, isDark, toggleTheme, openModal, openPetProfile }}>
      {/* ── Perfil de mascota global (accesible desde cualquier tab) ── */}
      {petProfileData && (
        <PetProfile
          post={petProfileData}
          allPosts={mockPets}
          onClose={() => setPetProfileData(null)}
        />
      )}
      {/* Modales de registro (full-screen) */}
      {modal === "business" && (
        <div style={{ position:"fixed", inset:0, zIndex:300, background:C.bg, overflowY:"auto" }}>
          <BusinessForm onClose={() => setModal(null)} />
        </div>
      )}
      {modal === "walker" && (
        <div style={{ position:"fixed", inset:0, zIndex:300, background:C.bg, overflowY:"auto" }}>
          <WalkerForm onClose={() => setModal(null)} />
        </div>
      )}
      <div style={{ maxWidth:420, margin:"0 auto", background:C.bg, minHeight:"100vh", display:"flex", flexDirection:"column" }}>
        <style>{`
          * { box-sizing: border-box; }
          body { margin: 0; background: ${C.bg}; }
          input::placeholder { color: ${C.textMuted}; }
          @keyframes heart-pop {
            0%   { transform: scale(1);    }
            35%  { transform: scale(1.65); }
            65%  { transform: scale(0.88); }
            100% { transform: scale(1);    }
          }
          @keyframes heart-ring {
            0%   { opacity: .7; transform: scale(1);   }
            100% { opacity: 0;  transform: scale(2.4); }
          }
        `}</style>
        {/* ── Zona sticky: Header + QuickNav siempre visibles ── */}
        <div style={{ position:"sticky", top:0, zIndex:50, background:C.bg, flexShrink:0 }}>
          <Header
            tab={currentTab}
            onBack={needsBack ? handleBack : null}
            onNotif={() => { setShowNotif(!showNotif); setSubTab(null); }}
            unread={unreadCount}
          />
          {!showNotif && (
            <QuickNav
              currentTab={activeTab}
              currentSub={subTab}
              onNavigate={item => {
                setShowNotif(false);
                // "Mi Mascota" → abre perfil de Tobías desde cualquier tab
                if (item.id === "mymascota") {
                  openPetProfile(mockPets[0]);
                  return;
                }
                if (item.mainTab === "walkers" || item.mainTab === "lost") {
                  setActiveTab(item.mainTab);
                  setSubTab(null);
                } else {
                  setActiveTab("more");
                  setSubTab(item.id);
                }
              }}
            />
          )}
        </div>
        <div style={{ flex:1, overflowY:"auto", paddingBottom:100 }}>
          <TabErrorBoundary key={currentTab}>
            {content[currentTab]}
          </TabErrorBoundary>
        </div>
        {!showNotif && !subTab && (
          <NavBar
            active={activeTab}
            setActive={t => { setActiveTab(t); setSubTab(null); setShowNotif(false); }}
            notifCount={unreadCount}
          />
        )}
      </div>
    </ThemeContext.Provider>
  );
}
