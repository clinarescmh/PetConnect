import { useState } from "react";

const darkColors = {
  bg:        "#0D1B2E",
  bgCard:    "#132240",
  bgElevated:"#1A2E50",
  border:    "#ffffff0E",
  borderHi:  "#ffffff1C",
  text:      "#F0EFEA",
  textSub:   "#8BA8C4",
  textMuted: "#4A6480",
  accent:    "#FF8C00",
  red:       "#FF5252",
};

const lightColors = {
  bg:        "#EEF2F7",
  bgCard:    "#FFFFFF",
  bgElevated:"#E1E8F0",
  border:    "#1B3A6B14",
  borderHi:  "#1B3A6B22",
  text:      "#1B3A6B",
  textSub:   "#4A6A8A",
  textMuted: "#8AAAC0",
  accent:    "#E07000",
  red:       "#D43030",
};

const F = {
  display: "'Syne', sans-serif",
  body:    "'DM Sans', sans-serif",
};

export default function LoginScreen({ onGuestAccess, onNewUserRegistered, isDark, toggleTheme }) {
  const C = isDark ? darkColors : lightColors;
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(null);

  const handleEmailAuth = (e) => {
    e.preventDefault();
    if (mode === "signup") {
      if (!email.trim() || password.length < 6) {
        setMessage({ type:"error", text:"Ingresa un email válido y contraseña de al menos 6 caracteres." });
        return;
      }
      // Flujo demo: simula registro exitoso y lleva al setup de usuario nuevo
      setMessage({ type:"success", text:"¡Cuenta creada! Configurando tu perfil…" });
      setTimeout(() => onNewUserRegistered?.(), 800);
      return;
    }
    if (mode === "forgot") {
      setMessage({ type:"success", text:"Te enviamos un enlace para restablecer tu contraseña." });
      return;
    }
    // Login — mostrar "próximamente" solo para login
    setMessage({ type:"error", text:"La autenticación con email estará disponible próximamente." });
  };

  const inputStyle = {
    width: "100%",
    background: C.bgElevated,
    border: `1px solid ${C.borderHi}`,
    borderRadius: 14,
    padding: "14px 16px",
    fontFamily: F.body,
    fontSize: 14,
    color: C.text,
    outline: "none",
    boxSizing: "border-box",
  };

  const titles = {
    login: "Bienvenido de vuelta",
    signup: "Crea tu cuenta",
    forgot: "Recuperar contraseña",
  };

  const subtitles = {
    login: "Inicia sesión para acceder a tu comunidad",
    signup: "Únete a miles de dueños de mascotas",
    forgot: "Te enviaremos un enlace a tu correo",
  };

  return (
    <div style={{
      maxWidth: 420, margin: "0 auto", background: C.bg, minHeight: "100vh",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "32px 24px",
    }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; }
        input::placeholder { color: ${C.textMuted}; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px ${C.bgElevated} inset !important;
          -webkit-text-fill-color: ${C.text} !important;
        }
      `}</style>

      {/* Theme toggle — top right */}
      <button onClick={toggleTheme} title={isDark ? "Modo claro" : "Modo oscuro"} style={{
        position: "fixed", top: 16, right: 16,
        background: C.bgCard, border: `1px solid ${C.borderHi}`,
        borderRadius: 10, width: 36, height: 36,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", fontSize: 16,
      }}>
        {isDark ? "☀️" : "🌙"}
      </button>

      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <img
          src="/logo.jpeg"
          alt="PetConnect"
          style={{
            maxWidth: 260,
            width: "100%",
            height: "auto",
            borderRadius: 16,
            display: "block",
            margin: "0 auto",
          }}
        />
      </div>

      {/* Card */}
      <div style={{
        width: "100%", background: C.bgCard, borderRadius: 24,
        border: `1px solid ${C.borderHi}`, padding: "28px 24px",
      }}>
        <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 20, color: C.text, marginBottom: 4 }}>
          {titles[mode]}
        </div>
        <div style={{ fontFamily: F.body, fontSize: 13, color: C.textSub, marginBottom: 24 }}>
          {subtitles[mode]}
        </div>

        {/* Guest access */}
        {mode !== "forgot" && (
          <>
            <button onClick={onGuestAccess} style={{
              width: "100%", background: C.accent, border: "none",
              borderRadius: 14, padding: "14px 16px",
              fontFamily: F.display, fontWeight: 700, fontSize: 15,
              color: isDark ? "#0D1B2E" : "#fff", cursor: "pointer", marginBottom: 16,
              transition: "opacity 0.15s",
            }}>
              Continuar sin cuenta →
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted }}>o inicia sesión con email</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>
          </>
        )}

        {/* Form */}
        <form onSubmit={handleEmailAuth} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          {mode !== "forgot" && (
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          )}

          {message && (
            <div style={{
              borderRadius: 12, padding: "11px 14px",
              background: message.type === "error" ? C.red + "18" : C.accent + "18",
              border: `1px solid ${message.type === "error" ? C.red + "44" : C.accent + "44"}`,
              fontFamily: F.body, fontSize: 13,
              color: message.type === "error" ? C.red : C.accent,
            }}>
              {message.text}
            </div>
          )}

          <button type="submit" style={{
            background: C.bgElevated, color: C.textSub,
            border: `1px solid ${C.border}`, borderRadius: 14,
            padding: "14px", fontFamily: F.display, fontSize: 15, fontWeight: 700,
            cursor: "pointer", marginTop: 4, transition: "opacity 0.15s",
          }}>
            {mode === "login" ? "Iniciar sesión"
              : mode === "signup" ? "Crear cuenta"
              : "Enviar enlace"}
          </button>
        </form>

        {/* Footer links */}
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          {mode === "login" && (
            <>
              <button onClick={() => { setMode("forgot"); setMessage(null); }} style={{ background: "none", border: "none", fontFamily: F.body, fontSize: 13, color: C.textSub, cursor: "pointer" }}>
                ¿Olvidaste tu contraseña?
              </button>
              <button onClick={() => { setMode("signup"); setMessage(null); }} style={{ background: "none", border: "none", fontFamily: F.body, fontSize: 13, cursor: "pointer" }}>
                <span style={{ color: C.textSub }}>¿No tienes cuenta? </span>
                <span style={{ color: C.accent, fontWeight: 600 }}>Regístrate</span>
              </button>
            </>
          )}
          {(mode === "signup" || mode === "forgot") && (
            <button onClick={() => { setMode("login"); setMessage(null); }} style={{ background: "none", border: "none", fontFamily: F.body, fontSize: 13, cursor: "pointer" }}>
              <span style={{ color: C.accent, fontWeight: 600 }}>← Volver al inicio de sesión</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
