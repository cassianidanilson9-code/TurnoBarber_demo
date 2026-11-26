# Dominio personalizado

- Dominio: `turnobarber.me`, gratis por un año con el GitHub Student Pack (oferta de Namecheap).
- Subdominio: `app.turnobarber.me`.
- DNS: registro CNAME `app` que apunta al nombre DNS del balanceador de carga (ALB) de AWS.
- No se usa la IP de la EC2 porque cambia cuando se reinicia el Learner Lab.
- HTTPS: no disponible en el Learner Lab, el dominio funciona por HTTP.
