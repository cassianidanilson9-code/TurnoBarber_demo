# TurnoBarber

Aplicación web para reservar turnos en barberías sin hacer fila. Hay tres tipos de usuario: cliente, barbero y dueño.

- **App en línea:** http://app.turnobarber.me (código de acceso: `BARBER2026`)
- **Curso:** [NOMBRE DE LA ASIGNATURA] | Docente: Kelly Villa
- **Integrantes:** [Danilson Cassiani], [Compañero 2], [Compañero 3]

## Funciones
- Pantalla de acceso con código antes de entrar a la app.
- Reserva de turnos por servicio, barbero y fecha.
- Lista de espera cuando la hora está ocupada.
- Agenda del barbero y cancelación de citas con el número de cita.
- Recordatorios por correo (simulados en el log del servidor).

## Tecnologías
React + Vite (frontend), Node.js (API), PostgreSQL (base de datos), pm2 (proceso en el servidor), GitHub Actions (despliegue).

## Estructura del proyecto
```
turnobarber/
├── index.html          # HTML base
├── vite.config.js      # Configuración de Vite
├── package.json
├── server/
│   ├── index.js        # API y recordatorios
│   └── schema.sql      # Tablas de la base de datos
└── src/
    ├── main.jsx        # Punto de entrada de React
    ├── App.jsx         # Componente principal (reservas)
    ├── Acceso.jsx      # Pantalla de acceso con código
    └── estilos.css     # Estilos
```

## Instalación local
1. Instalar Node.js (LTS) y PostgreSQL.
2. Crear la base de datos `turnobarber` y ejecutar `server/schema.sql`.
3. Desde la carpeta `turnobarber`:
```bash
npm install
npm run build
DATABASE_URL="postgres://usuario:clave@localhost:5432/turnobarber" npm start
```
4. Abrir http://localhost:3000

Variables de entorno: `DATABASE_URL` (conexión a PostgreSQL) y `DB_SSL=true` (solo cuando la base está en RDS).

## Arquitectura en AWS
```
Usuario → app.turnobarber.me (DNS) → Application Load Balancer → EC2 (Node + pm2) → RDS PostgreSQL
```
- **VPC** con subredes públicas y privadas en us-east-1.
- **ALB:** recibe el tráfico y lo envía al Target Group (puerto 3000, health check `/api/salud`).
- **EC2:** ejecuta la aplicación con pm2.
- **RDS:** guarda las citas, aparte del servidor.
- **Security Groups:** controlan quién puede hablar con quién.
- **Limitaciones (AWS Learner Lab):** un solo servidor, sin Auto Scaling ni HTTPS.

## Despliegue automático (CI/CD)
El workflow `.github/workflows/deploy.yml` se ejecuta en cada push a `main`: descarga el código, se conecta por SSH a la EC2, copia los archivos, instala dependencias, compila y reinicia la app con pm2. La llave SSH y la IP están en los *secrets* de GitHub (`EC2_SSH_KEY`, `EC2_USER`, `EC2_HOST`), no en el código.

## Flujo de trabajo
Ramas por funcionalidad (`feature/acceso`, `feature/cicd`, ...), commits con Conventional Commits (`feat:`, `fix:`, `docs:`) y Pull Requests aprobados por otro integrante antes del merge.

## Dominio
`app.turnobarber.me`, dominio gratuito del GitHub Student Pack, apuntado por DNS al balanceador de carga.
