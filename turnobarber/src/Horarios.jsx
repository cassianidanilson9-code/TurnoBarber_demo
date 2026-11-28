import { useEffect, useState } from "react";
import { api } from "./api.js";

const DIAS = [
  { numero: 1, nombre: "Lunes" },
  { numero: 2, nombre: "Martes" },
  { numero: 3, nombre: "Miércoles" },
  { numero: 4, nombre: "Jueves" },
  { numero: 5, nombre: "Viernes" },
  { numero: 6, nombre: "Sábado" },
  { numero: 0, nombre: "Domingo" },
];

const crearHorariosBase = () => DIAS.map(({ numero }) => ({
  dia_semana: numero,
  abierto: true,
  abre: "09:00",
  cierra: "18:00",
  descanso_inicio: null,
  descanso_fin: null,
}));

const combinarHorarios = (datos) => {
  if (!Array.isArray(datos)) throw new Error("La API devolvió horarios con formato inválido.");
  const guardados = new Map(datos.map((horario) => [horario.dia_semana, horario]));
  return crearHorariosBase().map((base) => ({
    ...base,
    ...guardados.get(base.dia_semana),
  }));
};

export default function Horarios({ barberos }) {
  const [barbero, setBarbero] = useState("");
  const [horarios, setHorarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const idBarbero = barbero || barberos[0]?.id;

  useEffect(() => {
    if (!idBarbero) return;
    let vigente = true;
    setCargando(true);
    setMensaje("");
    setHorarios(crearHorariosBase());

    api(`/api/horarios?barbero=${idBarbero}`)
      .then((datos) => {
        if (vigente) {
          setHorarios(combinarHorarios(datos));
          if (datos.length !== 7) {
            setMensaje("Faltan horarios guardados; se muestran los valores base de 09:00 a 18:00.");
          }
        }
      })
      .catch((error) => {
        if (vigente) {
          setHorarios(crearHorariosBase());
          setMensaje(`No se pudieron cargar los horarios guardados. Se muestran valores base de 09:00 a 18:00. ${error.message}`);
        }
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [idBarbero]);

  const actualizar = (dia, campo, valor) => {
    setHorarios((actuales) => actuales.map((horario) =>
      horario.dia_semana === dia
        ? { ...horario, [campo]: valor }
        : horario
    ));
    setMensaje("");
  };

  const cambiarApertura = (horario, abierto) => {
    setHorarios((actuales) => actuales.map((actual) =>
      actual.dia_semana === horario.dia_semana
        ? abierto
          ? {
              ...actual,
              abierto: true,
              abre: actual.abre || "09:00",
              cierra: actual.cierra || "18:00",
            }
          : {
              dia_semana: actual.dia_semana,
              abierto: false,
              abre: null,
              cierra: null,
              descanso_inicio: null,
              descanso_fin: null,
            }
        : actual
    ));
    setMensaje("");
  };

  const guardar = async () => {
    if (!idBarbero) return;
    setGuardando(true);
    setMensaje("");
    try {
      await api(`/api/barberos/${idBarbero}/horarios`, {
        method: "PUT",
        body: JSON.stringify({ horarios }),
      });
      setMensaje("Horarios guardados.");
    } catch (error) {
      setMensaje(error.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section>
      <h2>Horarios del barbero</h2>
      <p className="sub">Los descansos son opcionales; deja ambas horas vacías si no hay descanso.</p>
      <label>Barbero
        <select value={idBarbero || ""} onChange={(e) => setBarbero(e.target.value)}>
          {barberos.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
        </select>
      </label>
      {barberos.length === 0 && (
        <p className="sub" role="alert">No se pudo cargar la lista de barberos.</p>
      )}
      {cargando && <p className="sub" role="status">Cargando horarios...</p>}
      {!cargando && horarios.length === 0 && !mensaje && (
        <p className="sub">No hay horarios para mostrar.</p>
      )}
      {!cargando && horarios.length > 0 && (
        <div className="horarios-editor">
          {DIAS.map(({ numero, nombre }) => {
            const horario = horarios.find((item) => item.dia_semana === numero);
            if (!horario) return null;
            return (
              <fieldset className="horario-dia" key={numero}>
                <legend>{nombre}</legend>
                <label className="check-horario">
                  <input
                    type="checkbox"
                    checked={horario.abierto}
                    onChange={(e) => cambiarApertura(horario, e.target.checked)}
                  />
                  Abierto
                </label>
                {horario.abierto && (
                  <div className="horario-campos">
                    <label>Apertura
                      <input
                        type="time"
                        value={horario.abre || ""}
                        onChange={(e) => actualizar(numero, "abre", e.target.value)}
                      />
                    </label>
                    <label>Cierre
                      <input
                        type="time"
                        value={horario.cierra || ""}
                        onChange={(e) => actualizar(numero, "cierra", e.target.value)}
                      />
                    </label>
                    <label>Inicio del descanso
                      <input
                        type="time"
                        value={horario.descanso_inicio || ""}
                        onChange={(e) => actualizar(numero, "descanso_inicio", e.target.value)}
                      />
                    </label>
                    <label>Fin del descanso
                      <input
                        type="time"
                        value={horario.descanso_fin || ""}
                        onChange={(e) => actualizar(numero, "descanso_fin", e.target.value)}
                      />
                    </label>
                  </div>
                )}
              </fieldset>
            );
          })}
        </div>
      )}
      <button
        type="button"
        className="boton"
        onClick={guardar}
        disabled={cargando || guardando || horarios.length !== 7}
      >
        {guardando ? "Guardando..." : "Guardar horarios"}
      </button>
      {mensaje && <div className="msg" role="status">{mensaje}</div>}
    </section>
  );
}
