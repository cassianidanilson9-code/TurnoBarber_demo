const test = require("node:test");
const assert = require("node:assert/strict");
const { agregarPunto, validarHorarios, validarResena } = require("./domain");

const horariosBase = Array.from({ length: 7 }, (_, dia_semana) => ({
  dia_semana,
  abierto: true,
  abre: "09:00",
  cierra: "18:00",
  descanso_inicio: null,
  descanso_fin: null,
}));

test("validarHorarios ordena y acepta siete días con un descanso válido", () => {
  const horarios = horariosBase.map((horario) => ({ ...horario }));
  horarios[1].descanso_inicio = "12:00";
  horarios[1].descanso_fin = "13:00";

  const resultado = validarHorarios([...horarios].reverse());

  assert.equal(resultado.length, 7);
  assert.deepEqual(resultado.map((horario) => horario.dia_semana), [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(resultado[1].descanso_inicio, "12:00");
});

test("validarHorarios exige siete días únicos y descansos dentro del turno", () => {
  const duplicado = [...horariosBase.slice(0, 6), { ...horariosBase[0] }];
  const descansoInvalido = horariosBase.map((horario) => ({ ...horario }));
  descansoInvalido[2].descanso_inicio = "18:00";
  descansoInvalido[2].descanso_fin = "19:00";

  assert.equal(validarHorarios(duplicado), null);
  assert.equal(validarHorarios(descansoInvalido), null);
});

test("validarHorarios representa un día cerrado sin horas", () => {
  const horarios = horariosBase.map((horario) => ({ ...horario }));
  horarios[0] = {
    dia_semana: 0,
    abierto: false,
    abre: null,
    cierra: null,
    descanso_inicio: null,
    descanso_fin: null,
  };

  assert.equal(validarHorarios(horarios)[0].abre, null);
  assert.equal(validarHorarios([{ ...horarios[0], abre: "09:00" }, ...horarios.slice(1)]), null);
  assert.equal(validarHorarios([{ ...horarios[0], abre: 0 }, ...horarios.slice(1)]), null);
});

test("agregarPunto entrega un servicio gratis cada diez reservas confirmadas", () => {
  assert.deepEqual(agregarPunto(3, 1), { puntos: 4, recompensas: 1 });
  assert.deepEqual(agregarPunto(9, 0), { puntos: 0, recompensas: 1 });
});

test("validarResena normaliza el correo y permite solo calificaciones de 1 a 5", () => {
  assert.deepEqual(
    validarResena({
      cita_id: 12,
      email: "  cliente@example.com ",
      calificacion: 5,
      comentario: "  Excelente  ",
    }),
    {
      cita_id: 12,
      email: "cliente@example.com",
      calificacion: 5,
      comentario: "Excelente",
    }
  );
  assert.equal(validarResena({ cita_id: "12", email: "cliente@example.com", calificacion: 6 }), null);
  assert.equal(validarResena({ cita_id: "12", email: "no-es-correo", calificacion: 4 }), null);
});
