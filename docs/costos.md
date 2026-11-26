# Costos y limitaciones

El proyecto corre en AWS Academy Learner Lab con un saldo limitado de USD 50.

- Se evitó el NAT Gateway para no generar costos fijos.
- Lo que más cobra es el balanceador (ALB), RDS y la EC2.
- El laboratorio se apaga a las 4 horas y la IP pública de la EC2 cambia.

## Mejoras futuras
- HTTPS con certificado.
- Auto Scaling con más de un servidor.
- Validar el código de acceso en el servidor.
