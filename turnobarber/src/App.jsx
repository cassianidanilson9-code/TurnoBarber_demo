import { useEffect, useState } from "react";

const api = async (url, opts) => {
  const r = await fetch(url, { headers: { "Content-Type": "application/json" }, ...opts });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Algo salió mal");
  return d;
};
const hoy = () => new Date().toISOString().slice(0, 10);
const post = (url, body) => api(url, { method: "POST", body: JSON.stringify(body) });

function useCatalogo() {
  const [servicios, setS] = useState([]);
  const [barberos, setB] = useState([]);
  useEffect(() => {
    Promise.all([api("/api/servicios"), api("/api/barberos")]).then(([s, b]) => { setS(s); setB(b); });
  }, []);
  return { servicios, barberos };
}

function Reservar() {
  const { servicios, barberos } = useCatalogo();
  const [f, setF] = useState({ nombre: "", email: "", servicio_id: "", barbero_id: "", fecha: hoy() });
  const [horas, setHoras] = useState([]);
  const [msg, setMsg] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const servicio_id = f.servicio_id || servicios[0]?.id;
  const barbero_id = f.barbero_id || barberos[0]?.id;

  const cargar = () => barbero_id && api(`/api/disponibilidad?barbero=${barbero_id}&fecha=${f.fecha}`).then(setHoras);
  useEffect(() => { cargar(); }, [barbero_id, f.fecha]);

  const elegir = async (h) => {
    if (!f.nombre || !f.email) return setMsg("Escribe tu nombre y tu correo primero.");
    const datos = { ...f, servicio_id, barbero_id, hora: h.hora };
    try {
      if (h.libre) {
        const r = await post("/api/citas", datos);
        setMsg(`Cita reservada para las ${h.hora}. Tu número de cita es ${r.id}. Guárdalo por si necesitas cancelar.`);
      } else {
        await post("/api/lista-espera", datos);
        setMsg("Quedaste en la lista de espera. Te avisamos por correo si se libera ese horario.");
      }
    } catch (e) { setMsg(e.message); }
    cargar();
  };

  return (
    <section>
      <label>Nombre<input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} /></label>
      <label>Correo<input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></label>
      <label>Servicio
        <select value={servicio_id || ""} onChange={(e) => set("servicio_id", e.target.value)}>
          {servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre} - ${s.precio.toLocaleString("es-CO")}</option>)}
        </select>
      </label>
      <label>Barbero
        <select value={barbero_id || ""} onChange={(e) => set("barbero_id", e.target.value)}>
          {barberos.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
        </select>
      </label>
      <label>Fecha<input type="date" min={hoy()} value={f.fecha} onChange={(e) => set("fecha", e.target.value)} /></label>
      <p className="sub" style={{ marginTop: 16 }}>Toca una hora libre para reservar. Si está ocupada, te anotas en la lista de espera.</p>
      <div className="horas">
        {horas.map((h) => (
          <button key={h.hora} className={h.libre ? "" : "ocupada"} onClick={() => elegir(h)}>
            {h.hora}{!h.libre && <><br />lista de espera</>}
          </button>
        ))}
      </div>
      {msg && <div className="msg" role="status">{msg}</div>}
    </section>
  );
}

function Cancelar() {
  const [id, setId] = useState("");
  const [msg, setMsg] = useState("");
  const cancelar = async () => {
    try {
      const r = await api(`/api/citas/${id}`, { method: "DELETE" });
      setMsg(r.avisado ? "Cita cancelada. Ya le avisamos al siguiente de la lista de espera." : "Cita cancelada.");
    } catch (e) { setMsg(e.message); }
  };
  return (
    <section>
      <label>Número de cita<input value={id} onChange={(e) => setId(e.target.value)} inputMode="numeric" /></label>
      <button className="boton" onClick={cancelar} disabled={!id}>Cancelar cita</button>
      {msg && <div className="msg" role="status">{msg}</div>}
    </section>
  );
}

function Agenda() {
  const { barberos } = useCatalogo();
  const [barbero, setBarbero] = useState("");
  const [fecha, setFecha] = useState(hoy());
  const [citas, setCitas] = useState([]);
  const bid = barbero || barberos[0]?.id;
  useEffect(() => { if (bid) api(`/api/agenda?barbero=${bid}&fecha=${fecha}`).then(setCitas); }, [bid, fecha]);
  return (
    <section>
      <label>Barbero
        <select value={bid || ""} onChange={(e) => setBarbero(e.target.value)}>
          {barberos.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
        </select>
      </label>
      <label>Fecha<input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
      <div style={{ marginTop: 16 }}>
        {citas.length === 0 && <p className="sub">No hay citas para este día.</p>}
        {citas.map((c) => (
          <div className="cita" key={c.id}><strong>{c.hora}</strong><span>{c.cliente} - {c.servicio}</span></div>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [vista, setVista] = useState("reservar");
  const tabs = [["reservar", "Reservar"], ["cancelar", "Cancelar"], ["agenda", "Agenda del barbero"]];

  const cerrarSesion = () => {
    sessionStorage.removeItem("acceso");
    window.location.reload();
  };

  return (
    <>
      <div className="poste" />
      <div className="poste poste-abajo" />
      <main>
        <header className="encabezado">
          <img src="/logo.png" alt="Logo barbería" className="logo-header logo-claro" />
          <img src="/logo_dark.png" alt="Logo barbería" className="logo-header logo-oscuro" />
          <div>
            <h1>TurnoBarber</h1>
            <p className="sub">Reserva tu corte sin esperar en fila.</p>
          </div>
        </header>
        <nav>
          {tabs.map(([k, t]) => <button key={k} className={vista === k ? "activo" : ""} onClick={() => setVista(k)}>{t}</button>)}
        </nav>
        {vista === "reservar" && <Reservar />}
        {vista === "cancelar" && <Cancelar />}
        {vista === "agenda" && <Agenda />}
      </main>
      <button type="button" className="cerrar" onClick={cerrarSesion}>Cerrar sesión</button>
    </>
  );
}
