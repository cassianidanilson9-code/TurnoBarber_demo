const horaValida = (hora) => typeof hora === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hora);
const horaOpcional = (hora) => hora === undefined || hora === null || hora === "" ? null : hora;
const idValido = (id) => (
  (typeof id === "string" && /^[1-9]\d*$/.test(id) && Number(id) <= 2147483647) ||
  (Number.isSafeInteger(id) && id > 0 && id <= 2147483647)
);
const emailValido = (email) => typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

function validarHorarios(horarios) {
  if (!Array.isArray(horarios) || horarios.length !== 7) return null;

  const normalizados = [];
  const dias = new Set();

  for (const horario of horarios) {
    if (
      !horario ||
      !Number.isInteger(horario.dia_semana) ||
      horario.dia_semana < 0 ||
      horario.dia_semana > 6 ||
      dias.has(horario.dia_semana) ||
      typeof horario.abierto !== "boolean"
    ) {
      return null;
    }

    dias.add(horario.dia_semana);
    const abre = horaOpcional(horario.abre);
    const cierra = horaOpcional(horario.cierra);
    const descansoInicio = horaOpcional(horario.descanso_inicio);
    const descansoFin = horaOpcional(horario.descanso_fin);

    if (!horario.abierto) {
      if (
        abre !== null ||
        cierra !== null ||
        descansoInicio !== null ||
        descansoFin !== null
      ) {
        return null;
      }
      normalizados.push({
        dia_semana: horario.dia_semana,
        abre: null,
        cierra: null,
        descanso_inicio: null,
        descanso_fin: null,
      });
      continue;
    }

    if (!horaValida(abre) || !horaValida(cierra) || abre >= cierra) return null;

    const tieneDescanso = descansoInicio !== null || descansoFin !== null;
    if (
      tieneDescanso &&
      (
        !horaValida(descansoInicio) ||
        !horaValida(descansoFin) ||
        descansoInicio < abre ||
        descansoFin > cierra ||
        descansoInicio >= descansoFin
      )
    ) {
      return null;
    }

    normalizados.push({
      dia_semana: horario.dia_semana,
      abre,
      cierra,
      descanso_inicio: tieneDescanso ? descansoInicio : null,
      descanso_fin: tieneDescanso ? descansoFin : null,
    });
  }

  return dias.size === 7 ? normalizados.sort((a, b) => a.dia_semana - b.dia_semana) : null;
}

function agregarPunto(puntos, recompensas) {
  const total = puntos + 1;
  return {
    puntos: total % 10,
    recompensas: recompensas + Math.floor(total / 10),
  };
}

function validarResena(datos) {
  if (!datos || typeof datos !== "object") return null;
  const { cita_id, email, calificacion } = datos;
  const comentario = datos.comentario === undefined || datos.comentario === null
    ? ""
    : datos.comentario;

  if (
    !idValido(cita_id) ||
    !emailValido(email) ||
    !Number.isInteger(calificacion) ||
    calificacion < 1 ||
    calificacion > 5 ||
    typeof comentario !== "string" ||
    comentario.trim().length > 1000
  ) {
    return null;
  }

  return {
    cita_id,
    email: email.trim(),
    calificacion,
    comentario: comentario.trim(),
  };
}

module.exports = { agregarPunto, emailValido, idValido, validarHorarios, validarResena };
