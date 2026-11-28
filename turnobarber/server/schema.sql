CREATE TABLE IF NOT EXISTS servicios (id SERIAL PRIMARY KEY, nombre TEXT NOT NULL, precio INT NOT NULL, duracion_min INT NOT NULL DEFAULT 30);
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS duracion_min INT NOT NULL DEFAULT 30;
CREATE TABLE IF NOT EXISTS barberos  (id SERIAL PRIMARY KEY, nombre TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS citas (
  id SERIAL PRIMARY KEY,
  cliente TEXT NOT NULL,
  email TEXT NOT NULL,
  servicio_id INT REFERENCES servicios(id),
  barbero_id INT REFERENCES barberos(id),
  inicio TIMESTAMP NOT NULL,
  duracion_min INT NOT NULL DEFAULT 30,
  estado TEXT NOT NULL DEFAULT 'activa',
  recordado BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE citas ADD COLUMN IF NOT EXISTS duracion_min INT;
UPDATE citas c
SET duracion_min = COALESCE(s.duracion_min, 30)
FROM servicios s
WHERE s.id = c.servicio_id AND c.duracion_min IS NULL;
UPDATE citas SET duracion_min = 30 WHERE duracion_min IS NULL;
ALTER TABLE citas ALTER COLUMN duracion_min SET DEFAULT 30;
ALTER TABLE citas ALTER COLUMN duracion_min SET NOT NULL;
-- Evita que dos personas tomen la misma hora con el mismo barbero
CREATE UNIQUE INDEX IF NOT EXISTS una_cita_por_hora ON citas (barbero_id, inicio) WHERE estado = 'activa';
CREATE TABLE IF NOT EXISTS lista_espera (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  barbero_id INT REFERENCES barberos(id),
  servicio_id INT REFERENCES servicios(id),
  inicio TIMESTAMP NOT NULL
);
ALTER TABLE lista_espera ADD COLUMN IF NOT EXISTS servicio_id INT REFERENCES servicios(id);
INSERT INTO servicios (nombre, precio, duracion_min)
SELECT * FROM (VALUES ('Corte', 20000, 30), ('Barba', 12000, 20), ('Corte y barba', 30000, 45)) v
  WHERE NOT EXISTS (SELECT 1 FROM servicios);
INSERT INTO barberos (nombre) SELECT * FROM (VALUES ('Carlos'), ('Andrés'), ('Luis')) v
  WHERE NOT EXISTS (SELECT 1 FROM barberos);
UPDATE servicios
SET duracion_min = CASE nombre
  WHEN 'Corte' THEN 30
  WHEN 'Barba' THEN 20
  WHEN 'Corte y barba' THEN 45
  ELSE duracion_min
END
WHERE nombre IN ('Corte', 'Barba', 'Corte y barba');

CREATE OR REPLACE FUNCTION horarios_disponibles(
  p_barbero INT,
  p_fecha DATE,
  p_duracion INT
)
RETURNS TABLE(inicio TIMESTAMP, libre BOOLEAN)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    slot.inicio,
    NOT EXISTS (
      SELECT 1
      FROM citas c
      JOIN servicios s ON s.id = c.servicio_id
      WHERE c.barbero_id = p_barbero
        AND c.estado = 'activa'
        AND c.inicio < slot.inicio + p_duracion * INTERVAL '1 minute'
        AND c.inicio + COALESCE(c.duracion_min, s.duracion_min, 30) * INTERVAL '1 minute' > slot.inicio
    ) AS libre
  FROM generate_series(
    p_fecha + TIME '09:00',
    p_fecha + TIME '18:00' - p_duracion * INTERVAL '1 minute',
    INTERVAL '30 minutes'
  ) AS slot(inicio)
  ORDER BY slot.inicio;
$$;
  