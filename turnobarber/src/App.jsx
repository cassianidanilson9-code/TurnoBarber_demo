import { useEffect, useState } from "react";
import { api, post } from "./api.js";
import Horarios from "./Horarios.jsx";
import Resenas from "./Resenas.jsx";
const calendario = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Bogota" });
const hoy = () => calendario.format(new Date());
const NOMBRE_STORAGE_KEY = "turnobarber.nombre";
const EMAIL_STORAGE_KEY = "turnobarber.email";

function useCatalogo() {
  const [servicios, setS] = useState([]);
  const [barberos, setB] = useState([]);
  useEffect(() => {
    Promise.all([api("/api/servicios"), api("/api/barberos")]).then(([s, b]) => { setS(s); setB(b); });
  }, []);
  return { servicios, barberos };
}

function Reservar({ servicios, barberos }) {
  const [f, setF] = useState(() => ({
    nombre: localStorage.getItem(NOMBRE_STORAGE_KEY) || "",
    email: localStorage.getItem(EMAIL_STORAGE_KEY) || "",
    servicio_id: "",
    barbero_id: "",
    fecha: hoy(),
  }));
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [revision, setRevision] = useState(0);
  const [guardado, setGuardado] = useState(false);
  const [msg, setMsg] = useState("");
  const [horaSeleccionada, setHoraSeleccionada] = useState("");
  const [usarRecompensa, setUsarRecompensa] = useState(false);
  const [cuentaFidelidad, setCuentaFidelidad] = useState(null);
  const [errorFidelidad, setErrorFidelidad] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const servicio_id = f.servicio_id || servicios[0]?.id;
  const barbero_id = f.barbero_id || barberos[0]?.id;

  useEffect(() => {
    localStorage.setItem(NOMBRE_STORAGE_KEY, f.nombre);
    localStorage.setItem(EMAIL_STORAGE_KEY, f.email);
  }, [f.nombre, f.email]);

  useEffect(() => {
    setCuentaFidelidad(null);
    setUsarRecompensa(false);
    setErrorFidelidad("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
      return;
    }

    let vigente = true;
    const consultaFidelidad = new URLSearchParams({ email: f.email.trim() }).toString();
    api(`/api/fidelidad?${consultaFidelidad}`)
      .then((cuenta) => {
        if (vigente) {
          setCuentaFidelidad(cuenta);
          setErrorFidelidad("");
        }
      })
      .catch((error) => {
        if (vigente) setErrorFidelidad(error.message);
      });

    return () => {
      vigente = false;
    };
  }, [f.email, revision]);

  const consulta = barbero_id && servicio_id && f.fecha
    ? new URLSearchParams({
        barbero: barbero_id,
        servicio: servicio_id,
        fecha: f.fecha,
      }).toString()
    : "";
  const resultado = disponibilidad?.consulta === consulta && disponibilidad.revision === revision
    ? disponibilidad
    : null;

  useEffect(() => {
    if (!consulta) return;

    let vigente = true;

    api(`/api/disponibilidad?${consulta}`)
      .then((horas) => {
          if (vigente) {
            setDisponibilidad({
              consulta,
              revision,
              horas: Array.isArray(horas) ? horas : [],
            });
          }
      })
      .catch((e) => {
        if (vigente) {
          setDisponibilidad({ consulta, revision, horas: [], error: e.message });
        }
      });

    return () => {
      vigente = false;
    };
  }, [consulta, revision]);

  useEffect(() => {
    setHoraSeleccionada("");
  }, [consulta]);

  const seleccionarHora = (h) => {
    setHoraSeleccionada((actual) => actual === h.hora ? "" : h.hora);
    setMsg("");
  };

  const confirmarReserva = async () => {
    const hora = resultado?.horas.find((h) => h.hora === horaSeleccionada);
    if (hora) await elegir(hora);
  };

  const elegir = async (h) => {
    if (!f.nombre || !f.email) return setMsg("Debes indicar tu nombre y correo.");

    const datos = { ...f, servicio_id, barbero_id, hora: h.hora };
    setGuardado(true);

    try {
      if (h.libre) {
        const r = await post("/api/citas", {
          ...datos,
          usar_recompensa: usarRecompensa,
        });
        const detalleRecompensa = r.recompensa_fidelidad ? " Usaste tu servicio gratis." : "";
        setMsg(`Cita reservada de ${h.hora} a ${r.fin}. Tu número de cita es ${r.id}. Guárdalo por si necesitas cancelar.${detalleRecompensa}`);
        setUsarRecompensa(false);
      } else {
        await post("/api/lista-espera", datos);
        setMsg("Quedaste en la lista de espera. Te avisamos por correo si se libera ese horario.");
      }
    } catch (e) {
      setMsg(e.message);
    } finally {
      setGuardado(false);
      setHoraSeleccionada("");
      setRevision((x) => x + 1);
    }
  };

  return (
    <section>
      <label>Nombre<input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} /></label>
      <label>Correo<input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></label>
      <p className="sub">Tu nombre y correo se guardan en este navegador para la próxima vez.</p>
      <label>Servicio
        <select value={servicio_id || ""} onChange={(e) => set("servicio_id", e.target.value)}>
          {servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre} - ${s.precio.toLocaleString("es-CO")} · {s.duracion_min} min </option>)}
        </select>
      </label>
      <label>Barbero
        <select value={barbero_id || ""} onChange={(e) => set("barbero_id", e.target.value)}>
          {barberos.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
        </select>
      </label>
      <label>Fecha<input type="date" min={hoy()} value={f.fecha} onChange={(e) => set("fecha", e.target.value)} /></label>
      <p className="sub" style={{ marginTop: 16 }}>
        Selecciona una hora y pulsa confirmar. Puedes cambiarla o desmarcarla antes de confirmar.
      </p>
      {consulta && !resultado && <p className="sub" role="status">Consultando disponibilidad...</p>}
      {resultado?.error && <p className="sub" role="alert">{resultado.error}</p>}
      {errorFidelidad && <p className="sub" role="alert">{errorFidelidad}</p>}

      {cuentaFidelidad && (
        <div className="fidelidad">
          <strong>Fidelidad</strong>
          <span>{cuentaFidelidad.puntos} de 10 puntos</span>
          <span>{cuentaFidelidad.recompensas_disponibles} servicios gratis disponibles</span>
        </div>
      )}
      {cuentaFidelidad && (
        <p className="sub">Cada reserva confirmada suma un punto. Las recompensas aparecen al llegar a diez.</p>
      )}

      {cuentaFidelidad?.recompensas_disponibles > 0 && (
        <label className="check-horario">
          <input
            type="checkbox"
            checked={usarRecompensa}
            onChange={(e) => setUsarRecompensa(e.target.checked)}
            disabled={guardado}
          />
          Usar un servicio gratis en esta reserva
        </label>
      )}

      {resultado && !resultado.error && resultado.horas.length === 0 && (
        <p className="sub">No hay horas disponibles para la fecha seleccionada.</p>
      )}

      <div className="horas">
        {resultado?.horas.map((h) => (
          <button
            key={h.hora}
            className={`${h.libre ? "" : "ocupada"}${horaSeleccionada === h.hora ? " seleccionada" : ""}`}
            onClick={() => seleccionarHora(h)}
            aria-pressed={horaSeleccionada === h.hora}
            disabled={guardado}
          >
            {h.hora}
            {!h.libre && <><br />lista de espera</>}
          </button>
        ))}
      </div>
      {horaSeleccionada && (
        <button
          type="button"
          className="boton"
          onClick={confirmarReserva}
          disabled={guardado}
        >
          Confirmar reserva — {horaSeleccionada}
        </button>
      )}
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

function Agenda({ barberos }) {
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
      <label>
        Fecha<input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </label>

      <div style={{ marginTop: 16 }}>
        {citas.length === 0 && <p className="sub">No hay citas para este día.</p>}

        {citas.map((c) => (
          <div className="cita" key={c.id}>
            <strong>{c.hora}-{c.fin}</strong>
            <span>{c.cliente} - {c.servicio}{c.recompensa_fidelidad ? " · Servicio gratis" : ""}</span>
            <span>{c.estado === "completada" ? "Realizada" : "Pendiente"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [vista, setVista] = useState("reservar");
  const { servicios, barberos } = useCatalogo();
  const tabs = [
    ["reservar", "Reservar"],
    ["cancelar", "Cancelar"],
    ["agenda", "Agenda"],
    ["horarios", "Horarios"],
    ["resenas", "Reseñas"],
  ];

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
        {vista === "reservar" && <Reservar servicios={servicios} barberos={barberos} />}
        {vista === "cancelar" && <Cancelar />}
        {vista === "agenda" && <Agenda barberos={barberos} />}
        {vista === "horarios" && <Horarios barberos={barberos} />}
        {vista === "resenas" && <Resenas />}
      </main>
      <button type="button" className="cerrar" onClick={cerrarSesion}>Cerrar sesión</button>
    </>
  );
}
