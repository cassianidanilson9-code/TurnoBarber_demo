import { useState } from "react";
import BotonTema from "./BotonTema.jsx";

const CODIGO = "BARBER2026";

const franja = {
  position: "fixed",
  left: 0,
  width: "100%",
  height: 10,
  backgroundImage:
    "repeating-linear-gradient(135deg, #C8102E 0 14px, #fff 14px 28px, #1D4E89 28px 42px, #fff 42px 56px)",
};

export default function Acceso({ children }) {
  const [autorizado, setAutorizado] = useState(
    sessionStorage.getItem("acceso") === "ok"
  );
  const [valor, setValor] = useState("");
  const [error, setError] = useState(false);

  function entrar(e) {
    e.preventDefault();
    if (valor === CODIGO) {
      sessionStorage.setItem("acceso", "ok");
      setAutorizado(true);
    } else {
      setError(true);
    }
  }

  if (autorizado) {
    return (
      <>
        {children}
        <BotonTema />
      </>
    );
  }

  return (
    <>
      <div style={{ ...franja, top: 0 }} />
      <div style={{ ...franja, bottom: 0 }} />
      <BotonTema />

      <main style={{ maxWidth: 360, margin: "8vh auto", padding: 16, textAlign: "center" }}>
        <img src="/logo.png" alt="Logo barbería" className="logo-claro"
          style={{ width: 170, height: 170, objectFit: "contain", marginBottom: 8 }} />
        <img src="/logo_dark.png" alt="Logo barbería" className="logo-oscuro"
          style={{ width: 170, height: 170, objectFit: "contain", marginBottom: 8 }} />
        <h1>ACCESO</h1>
        <form onSubmit={entrar}>
          <input
            type="password"
            placeholder="Ingrese su código de acceso"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 8 }}
          />
          <button type="submit" style={{ width: "100%", padding: 10 }}>ACCEDER</button>
        </form>
        {error && <p style={{ color: "crimson" }}>Código incorrecto</p>}
      </main>
    </>
  );
}
