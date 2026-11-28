# TurnoBarber (demo)

App para reservar citas en barberías. React (pantallas) + Node.js (API) + PostgreSQL (datos).

## Qué hace
- **Reservar:** elegir servicio, barbero, fecha y una hora libre.
- **Lista de espera:** si la hora está ocupada, la persona se anota; si alguien cancela, se le avisa por correo.
- **Cancelar:** con el número de cita que se da al reservar.
- **Agenda del barbero:** citas del día.
- **Horarios:** cada barbero puede configurar sus días de apertura, horas y descanso; inicialmente todos abren de 09:00 a 18:00.
- **Fidelidad:** cada reserva confirmada suma un punto; al llegar a diez se habilita un servicio gratis. Las citas de lista de espera y las reservas que usan una recompensa no suman puntos; cancelar una cita no elimina el punto ya otorgado.
- **Reseñas:** una persona puede dejar una reseña de una cita completada usando el número de cita y el correo de la reserva.
- **Recordatorios:** cada minuto el servidor revisa las citas de las próximas 24 horas y manda un correo.
  Si no se configura SES, el correo aparece en la consola con la palabra `[CORREO SIMULADO]` (sirve para la demo).

Las citas se marcan como realizadas automáticamente al pasar su hora final. Para actualizar una base de datos existente, vuelve a ejecutar `server/schema.sql`; los horarios iniciales se agregan solo para los días que aún no tienen configuración.

## Probarla en tu computador (Windows)
1. Instala **Node.js** (versión LTS) desde nodejs.org y **PostgreSQL** desde postgresql.org (anota la clave que pongas).
2. Abre **SQL Shell (psql)** y escribe:
   ```
   CREATE DATABASE turnobarber;
   \c turnobarber
   \i 'C:/ruta/a/turnobarber/server/schema.sql'
   ```
3. En la carpeta del proyecto, abre PowerShell y ejecuta:
   ```
   npm install
   npm run build
   $env:DATABASE_URL="postgres://postgres:TU_CLAVE@localhost:5432/turnobarber"
   npm start
   ```
4. Abre http://localhost:3000

Para ejecutar las pruebas de reglas de horarios y fidelidad, usa `npm test`.

## Estructura
- `src/` pantallas en React (`App.jsx`)
- `server/index.js` API en Node.js y recordatorios
- `server/schema.sql` tablas y datos de ejemplo
- `GUIA_AWS.md` cómo montarla en AWS
