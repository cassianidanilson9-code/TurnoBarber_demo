CREATE TABLE IF NOT EXISTS servicios (id SERIAL PRIMARY KEY, nombre TEXT NOT NULL, precio INT NOT NULL);
CREATE TABLE IF NOT EXISTS barberos  (id SERIAL PRIMARY KEY, nombre TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS citas (
  id SERIAL PRIMARY KEY,
  cliente TEXT NOT NULL,
  email TEXT NOT NULL,
  servicio_id INT REFERENCES servicios(id),
  barbero_id INT REFERENCES barberos(id),
  inicio TIMESTAMP NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activa',
  recordado BOOLEAN NOT NULL DEFAULT false
);
-- Evita que dos personas tomen la misma hora con el mismo barbero
CREATE UNIQUE INDEX IF NOT EXISTS una_cita_por_hora ON citas (barbero_id, inicio) WHERE estado = 'activa';
CREATE TABLE IF NOT EXISTS lista_espera (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  barbero_id INT REFERENCES barberos(id),
  inicio TIMESTAMP NOT NULL
);
INSERT INTO servicios (nombre, precio) SELECT * FROM (VALUES ('Corte', 20000), ('Barba', 12000), ('Corte y barba', 30000)) v
  WHERE NOT EXISTS (SELECT 1 FROM servicios);
INSERT INTO barberos (nombre) SELECT * FROM (VALUES ('Carlos'), ('Andrés'), ('Luis')) v
  WHERE NOT EXISTS (SELECT 1 FROM barberos);
