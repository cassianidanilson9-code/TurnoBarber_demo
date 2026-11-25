import { useState } from "react";

const CODIGO = "BARBER2026";

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

  if (autorizado) return children;

  return (
    <main style={{ maxWidth: 360, margin: "20vh auto", padding: 16, textAlign: "center" }}>
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
  );
}