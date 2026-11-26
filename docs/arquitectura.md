# Arquitectura en AWS

Usuario → app.turnobarber.me (DNS) → Application Load Balancer → EC2 (Node + pm2) → RDS PostgreSQL

- **VPC:** red privada en us-east-1 con 2 subredes públicas y 2 privadas, sin NAT Gateway para no generar costos.
- **ALB (albturnobarber):** recibe el tráfico y lo envía al Target Group `tgturnobarber`, puerto 3000.
- **EC2:** servidor donde corre la aplicación con pm2.
- **RDS (turnobarber-db):** base de datos PostgreSQL administrada. Guarda las citas aparte del servidor.
- **Security Groups:** controlan qué tráfico puede llegar a cada componente.

## Limitaciones
AWS Learner Lab: un solo servidor, sin Auto Scaling ni HTTPS.
