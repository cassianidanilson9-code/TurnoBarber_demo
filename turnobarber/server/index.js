const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const nodemailer = require("nodemailer");

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

app.get("/api/disponibilidad", wrap(async (req, res) => {
  const { barbero, fecha } = req.query;
  const rows = await q(
    `SELECT to_char(inicio,'HH24:MI') AS hora FROM citas WHERE barbero_id=$1 AND inicio::date=$2 AND estado='activa'`,
    [barbero, fecha]);
  const ocupadas = rows.map((r) => r.hora);
  const horas = [];
  for (let h = 9; h < 18; h++) for (const m of ["00", "30"]) horas.push(`${String(h).padStart(2, "0")}:${m}`);
  res.json(horas.map((hora) => ({ hora, libre: !ocupadas.includes(hora) })));
}));

app.post("/api/citas", wrap(async (req, res) => {
  const { nombre, email, servicio_id, barbero_id, fecha, hora } = req.body;
  if (!nombre || !email || !servicio_id || !barbero_id || !fecha || !hora)
    return res.status(400).json({ error: "Faltan datos" });
  try {
    const [c] = await q(
      `INSERT INTO citas (cliente, email, servicio_id, barbero_id, inicio) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [nombre, email, servicio_id, barbero_id, `${fecha} ${hora}`]);
    res.json({ id: c.id });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Esa hora ya fue tomada. Elige otra." });
    throw e;
  }
}));

app.delete("/api/citas/:id", wrap(async (req, res) => {
  const [c] = await q(
    `UPDATE citas SET estado='cancelada' WHERE id=$1 AND estado='activa' RETURNING barbero_id, inicio`, [req.params.id]);
  if (!c) return res.status(404).json({ error: "No hay una cita activa con ese número." });
  // Lista de espera: se avisa al primero que pidió ese mismo horario
  const [sig] = await q(
    `DELETE FROM lista_espera WHERE id = (SELECT id FROM lista_espera WHERE barbero_id=$1 AND inicio=$2 ORDER BY id LIMIT 1)
     RETURNING nombre, email`, [c.barbero_id, c.inicio]);
  if (sig) await enviar(sig.email, "Se liberó un horario en TurnoBarber",
    `Hola ${sig.nombre}, se liberó el horario que querías. Entra a TurnoBarber y resérvalo antes de que lo tome otra persona.`);
  res.json({ ok: true, avisado: !!sig });
}));

app.post("/api/lista-espera", wrap(async (req, res) => {
  const { nombre, email, barbero_id, fecha, hora } = req.body;
  if (!nombre || !email || !barbero_id || !fecha || !hora) return res.status(400).json({ error: "Faltan datos" });
  await q(`INSERT INTO lista_espera (nombre, email, barbero_id, inicio) VALUES ($1,$2,$3,$4)`,
    [nombre, email, barbero_id, `${fecha} ${hora}`]);
  res.json({ ok: true });
}));

app.get("/api/agenda", wrap(async (req, res) => {
  const { barbero, fecha } = req.query;
  res.json(await q(
    `SELECT c.id, to_char(c.inicio,'HH24:MI') AS hora, c.cliente, s.nombre AS servicio
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
