# Solución de problemas

**La página da error 503**
El Target Group puede estar en Unhealthy. En la EC2 correr `pm2 resurrect` y `pm2 list`, y esperar 2 o 3 minutos a que pase a Healthy.

**El deploy de GitHub Actions falla**
Revisar que el secret `EC2_HOST` tenga la IP pública actual de la EC2. Cambia cada vez que se reinicia el Learner Lab.

**No guarda las reservas**
Revisar que RDS (`turnobarber-db`) esté en estado Available.

**La app no responde dentro del servidor**
Probar `curl http://localhost:3000/api/salud` y revisar los logs con `pm2 logs turnobarber`.
