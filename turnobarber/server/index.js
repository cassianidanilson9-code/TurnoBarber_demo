const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const nodemailer = require("nodemailer");
const {
  agregarPunto,
  emailValido,
  idValido,
  validarHorarios,
  validarResena,
} = require("./domain");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});
const q = (sql, p) => pool.query(sql, p).then((r) => r.rows);

// Si no hay SMTP configurado, los correos solo se muestran en la consola.
const mailer = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: 587,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;
async function enviar(to, asunto, texto) {
  if (!mailer) return console.log(`[CORREO SIMULADO] a ${to} | ${asunto} | ${texto}`);
  await mailer.sendMail({ from: process.env.MAIL_FROM, to, subject: asunto, text: texto });
}

const app = express();
app.use(express.json());
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { console.error(e); res.status(500).json({ error: "Error del servidor" }); });

app.get("/api/salud", (_, res) => res.send("ok"));
app.get("/api/servicios", wrap(async (_, res) => res.json(await q("SELECT * FROM servicios ORDER BY id"))));
app.get("/api/barberos", wrap(async (_, res) => res.json(await q("SELECT * FROM barberos ORDER BY id"))));

const fechaVAlida = (fecha) => {
  if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const dia = new Date(`${fecha}T00:00:00.000Z`);
  return Number.isFinite(dia.getTime()) && dia.toISOString().slice(0, 10) === fecha;
};
const horaValida = (hora) => typeof hora === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hora);

app.get("/api/horarios", wrap(async (req, res) => {
  const { barbero } = req.query;
  if (!idValido(barbero)) return res.status(400).json({ error: "Selecciona un barbero válido." });
  const [existe] = await q("SELECT id FROM barberos WHERE id=$1", [barbero]);
  if (!existe) return res.status(404).json({ error: "El barbero seleccionado no existe." });
  const horarios = await q(
    `SELECT dia_semana, abre IS NOT NULL AS abierto,
            to_char(abre, 'HH24:MI') AS abre,
            to_char(cierra, 'HH24:MI') AS cierra,
            to_char(descanso_inicio, 'HH24:MI') AS descanso_inicio,
            to_char(descanso_fin, 'HH24:MI') AS descanso_fin
     FROM horarios_barbero WHERE barbero_id=$1 ORDER BY dia_semana`,
    [barbero]
  );
  res.json(horarios);
}));

app.put("/api/barberos/:id/horarios", wrap(async (req, res) => {
  const { id } = req.params;
  const horarios = validarHorarios(req.body && req.body.horarios);
  if (!idValido(id) || !horarios) {
    return res.status(400).json({ error: "Revisa los siete horarios y descansos del barbero." });
  }

  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;
    const barberResult = await client.query(
      "SELECT id FROM barberos WHERE id=$1 FOR UPDATE",
      [id]
    );
    if (barberResult.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return res.status(404).json({ error: "El barbero seleccionado no existe." });
    }

    for (const horario of horarios) {
      await client.query(
        `INSERT INTO horarios_barbero
           (barbero_id, dia_semana, abre, cierra, descanso_inicio, descanso_fin)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (barbero_id, dia_semana) DO UPDATE SET
           abre=EXCLUDED.abre,
           cierra=EXCLUDED.cierra,
           descanso_inicio=EXCLUDED.descanso_inicio,
           descanso_fin=EXCLUDED.descanso_fin`,
        [
          id,
          horario.dia_semana,
          horario.abre,
          horario.cierra,
          horario.descanso_inicio,
          horario.descanso_fin,
        ]
      );
    }

    await client.query("COMMIT");
    transactionOpen = false;
  } catch (e) {
    if (transactionOpen) await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  res.json({ ok: true });
}));

app.get("/api/disponibilidad", wrap(async (req, res) => {
  const { barbero, fecha, servicio } = req.query;
  if (!idValido(barbero) || !fechaVAlida(fecha) || (servicio !== undefined && !idValido(servicio))) {
    return  res.status(400).json({ error: "Revisa el barbero, el servicio y la fecha."});
  }
  
  const [catalogo] = await q(
    `SELECT b.id, COALESCE(s.duracion_min, 30) AS duracion_min
     FROM barberos b LEFT JOIN servicios s ON s.id = $2
     WHERE b.id = $1 AND ($2::int IS NULL OR s.id IS NOT NULL)`, [barbero, servicio ?? null]);
  if (!catalogo) return res.status(404).json({ error: "Barbero o servicio no disponible." });
  
  const horas = await q(
  `SELECT to_char(inicio, 'HH24:MI') AS hora, libre
     FROM horarios_disponibles($1, $2, $3) ORDER BY inicio`,
    [barbero, fecha, catalogo.duracion_min]);
  res.json(horas);
}));

app.post("/api/citas", wrap(async (req, res) => {
  const { nombre, email, servicio_id, barbero_id, fecha, hora } = req.body;
  if (
    typeof nombre !== "string" || !nombre.trim() ||
    typeof email !== "string" || !email.trim() ||
    !idValido(servicio_id) || !idValido(barbero_id) ||
    !fechaVAlida(fecha) || !horaValida(hora)
  ) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;

    const barberResult = await client.query(
      "SELECT id FROM barberos WHERE id = $1 FOR UPDATE",
      [barbero_id]
    );
    if (barberResult.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return res.status(404).json({ error: "El barbero seleccionado no existe." });
    }

    const serviceResult = await client.query(
      "SELECT id, duracion_min FROM servicios WHERE id = $1",
      [servicio_id]
    );
    if (serviceResult.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return res.status(404).json({ error: "El servicio seleccionado no existe." });
    }

    const availabilityResult = await client.query(
      `SELECT libre
       FROM horarios_disponibles($1, $2, $3)
       WHERE inicio = ($2::date + $4::time)`,
      [barbero_id, fecha, serviceResult.rows[0].duracion_min, hora]
    );
    if (availabilityResult.rowCount === 0 || !availabilityResult.rows[0].libre) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return res.status(409).json({ error: "Ese horario ya no está disponible. Elige otro." });
    }

    const appointmentResult = await client.query(
      `INSERT INTO citas (cliente, email, servicio_id, barbero_id, inicio, duracion_min)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, to_char(inicio + duracion_min * INTERVAL '1 minute', 'HH24:MI') AS fin`,
      [nombre.trim(), email.trim(), servicio_id, barbero_id, `${fecha} ${hora}`, serviceResult.rows[0].duracion_min]
    );
    await client.query("COMMIT");
    transactionOpen = false;
    res.json({ id: appointmentResult.rows[0].id, fin: appointmentResult.rows[0].fin });
  } catch (e) {
    if (transactionOpen) await client.query("ROLLBACK");
    if (e.code === "23505") return res.status(409).json({ error: "Esa hora ya fue tomada. Elige otra." });
    throw e;
  } finally {
    client.release();
  }
}));

app.delete("/api/citas/:id", wrap(async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: "Número de cita no válido." });
  const [existente] = await q(
    "SELECT barbero_id FROM citas WHERE id=$1 AND estado='activa'",
    [req.params.id]
  );
  if (!existente) return res.status(404).json({ error: "No hay una cita activa con ese número." });

  const client = await pool.connect();
  let transactionOpen = false;
  let c;
  let sig;
  try {
    await client.query("BEGIN");
    transactionOpen = true;
    await client.query("SELECT id FROM barberos WHERE id=$1 FOR UPDATE", [existente.barbero_id]);

    const citaResult = await client.query(
      `UPDATE citas
       SET estado='cancelada'
       WHERE id=$1 AND estado='activa'
       RETURNING barbero_id, inicio, duracion_min`,
      [req.params.id]
    );
    [c] = citaResult.rows;
    if (!c) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return res.status(404).json({ error: "No hay una cita activa con ese número." });
    }

    const esperaResult = await client.query(
      `DELETE FROM lista_espera
       WHERE id = (
         SELECT e.id
         FROM lista_espera e
         JOIN servicios s ON s.id = e.servicio_id
         WHERE e.barbero_id = $1
           AND e.inicio >= $2
           AND e.inicio + s.duracion_min * INTERVAL '1 minute'
               <= $2 + $3 * INTERVAL '1 minute'
         ORDER BY e.id
         LIMIT 1
       )
       RETURNING nombre, email`,
      [c.barbero_id, c.inicio, c.duracion_min]
    );
    [sig] = esperaResult.rows;

    await client.query("COMMIT");
    transactionOpen = false;
  } catch (e) {
    if (transactionOpen) await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  if (sig) await enviar(sig.email, "Se liberó un horario en TurnoBarber",
    `Hola ${sig.nombre}, se liberó un horario que permite realizar el servicio que pediste. Entra a TurnoBarber y resérvalo antes de que lo tome otra persona.`);
  res.json({ ok: true, avisado: !!sig });
}));

app.post("/api/lista-espera", wrap(async (req, res) => {
  const { nombre, email, servicio_id, barbero_id, fecha, hora } = req.body;
  if (
    typeof nombre !== "string" || !nombre.trim() ||
    typeof email !== "string" || !email.trim() ||
    !idValido(servicio_id) || !idValido(barbero_id) ||
    !fechaVAlida(fecha) || !horaValida(hora)
  ) {
    return res.status(400).json({ error: "Faltan datos o hay datos no válidos." });
  }

  const [servicio] = await q("SELECT duracion_min FROM servicios WHERE id=$1", [servicio_id]);
  if (!servicio) return res.status(404).json({ error: "El servicio seleccionado no existe." });
  const [barbero] = await q("SELECT id FROM barberos WHERE id=$1", [barbero_id]);
  if (!barbero) return res.status(404).json({ error: "El barbero seleccionado no existe." });

  const [horario] = await q(
    `SELECT libre
     FROM horarios_disponibles($1, $2, $3)
     WHERE inicio=($2::date + $4::time)`,
    [barbero_id, fecha, servicio.duracion_min, hora]
  );
  if (!horario) {
    return res.status(409).json({ error: "Ese horario está fuera del horario laboral." });
  }
  if (horario.libre) {
    return res.status(409).json({ error: "Ese horario está libre; puedes reservarlo directamente." });
  }

  await q(
    `INSERT INTO lista_espera (nombre, email, barbero_id, servicio_id, inicio)
     VALUES ($1, $2, $3, $4, $5)`,
    [nombre.trim(), email.trim(), barbero_id, servicio_id, `${fecha} ${hora}`]
  );
  res.json({ ok: true });
}));

app.get("/api/agenda", wrap(async (req, res) => {
  const { barbero, fecha } = req.query;
  res.json(await q(
    `SELECT c.id, to_char(c.inicio,'HH24:MI') AS hora,
            to_char(c.inicio + c.duracion_min * INTERVAL '1 minute', 'HH24:MI') AS fin,
            c.cliente, s.nombre AS servicio
     FROM citas c JOIN servicios s ON s.id=c.servicio_id
     WHERE c.barbero_id=$1 AND c.inicio::date=$2 AND c.estado='activa' ORDER BY c.inicio`, [barbero, fecha]));
}));

// Recordatorios: cada minuto busca citas de las próximas 24 horas que aún no se han avisado
async function recordatorios() {
  const rows = await q(
    `SELECT id, cliente, email, to_char(inicio,'DD/MM HH24:MI') AS cuando FROM citas
     WHERE estado='activa' AND recordado=false
     AND inicio BETWEEN (now() AT TIME ZONE 'America/Bogota') AND (now() AT TIME ZONE 'America/Bogota') + interval '24 hours'`);
  for (const c of rows) {
    await enviar(c.email, "Recordatorio de tu cita en TurnoBarber",
      `Hola ${c.cliente}, te recordamos tu cita del ${c.cuando}. Tu número de cita es ${c.id}; con ese número puedes cancelarla.`);
    await q("UPDATE citas SET recordado=true WHERE id=$1", [c.id]);
  }
}
setInterval(() => recordatorios().catch(console.error), 60000);

app.use(express.static(path.join(__dirname, "../dist")));
app.get("*", (_, res) => res.sendFile(path.join(__dirname, "../dist/index.html")));
app.listen(process.env.PORT || 3000, () => console.log("TurnoBarber listo en el puerto " + (process.env.PORT || 3000)));
