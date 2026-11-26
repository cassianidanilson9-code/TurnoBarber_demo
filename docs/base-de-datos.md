# Base de datos

- Motor: PostgreSQL en Amazon RDS (`turnobarber-db`, región us-east-1).
- Las tablas están definidas en `server/schema.sql`.
- El servidor se conecta con la variable de entorno `DATABASE_URL`.
- `DB_SSL=true` se activa cuando la base está en RDS.
- La base solo debe ser accesible desde la EC2, no desde internet.
- Las citas se guardan aquí, separadas del servidor, para no perderlas si la EC2 se reinicia.
