import { useEffect, useState } from "react";
import { api, post } from "./api.js";

export default function Resenas() {
  const [formulario, setFormulario] = useState({
    cita_id: "",
    email: "",
    calificacion: "5",
    comentario: "",
  });
  const [resenas, setResenas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorLista, setErrorLista] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargarResenas = async () => {
    setCargando(true);
    setErrorLista("");
    try {
      const datos = await api("/api/resenas");
      if (!Array.isArray(datos)) throw new Error("La API devolvió reseñas con formato inválido.");
      setResenas(datos);
    } catch (error) {
      setErrorLista(error.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarResenas();
  }, []);

  const actualizar = (campo, valor) => {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
    setMensaje("");
  };

  const enviar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje("");
    try {
      await post("/api/resenas", {
        ...formulario,
        cita_id: formulario.cita_id.trim(),
        calificacion: Number(formulario.calificacion),
      });
      setMensaje("Gracias por compartir tu opinión.");
      setFormulario((actual) => ({ ...actual, cita_id: "", comentario: "" }));
      await cargarResenas();
    } catch (error) {
      setMensaje(error.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section>
      <h2>Comparte tu experiencia</h2>
      <p className="sub">Las reseñas solo se aceptan para citas realizadas. Se verifica el número de cita y el correo.</p>
      <form onSubmit={enviar}>
        <label>Número de cita
          <input
            value={formulario.cita_id}
            onChange={(e) => actualizar("cita_id", e.target.value)}
            inputMode="numeric"
            required
          />
        </label>
        <label>Correo de la reserva
          <input
            type="email"
            value={formulario.email}
            onChange={(e) => actualizar("email", e.target.value)}
            required
          />
        </label>
        <label>Calificación
          <select
            value={formulario.calificacion}
            onChange={(e) => actualizar("calificacion", e.target.value)}
          >
            {[5, 4, 3, 2, 1].map((valor) => (
              <option key={valor} value={valor}>{valor} de 5 estrellas</option>
            ))}
          </select>
        </label>
        <label>Comentario (opcional)
          <textarea
            value={formulario.comentario}
            onChange={(e) => actualizar("comentario", e.target.value)}
            maxLength={1000}
            rows={4}
          />
        </label>
        <button className="boton" type="submit" disabled={guardando}>
          {guardando ? "Enviando..." : "Enviar reseña"}
        </button>
      </form>
      {mensaje && <div className="msg" role="status">{mensaje}</div>}

      <h2>Opiniones de clientes</h2>
      {cargando && <p className="sub" role="status">Cargando reseñas...</p>}
      {errorLista && <p className="sub" role="alert">{errorLista}</p>}
      {!cargando && !errorLista && resenas.length === 0 && (
        <p className="sub">Aún no hay reseñas.</p>
      )}
      <div className="lista-resenas">
        {resenas.map((resena) => (
          <article className="resena" key={resena.id}>
            <div className="resena-cabecera">
              <strong>{resena.cliente}</strong>
              <span aria-label={`${resena.calificacion} de 5 estrellas`}>
                {"★".repeat(resena.calificacion)}{"☆".repeat(5 - resena.calificacion)}
              </span>
            </div>
            <p className="sub">{resena.servicio} · {resena.barbero}</p>
            {resena.comentario && <p>{resena.comentario}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
