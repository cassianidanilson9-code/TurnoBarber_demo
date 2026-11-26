# CI/CD con GitHub Actions

El workflow `.github/workflows/deploy.yml` se ejecuta en cada push a `main`.

Pasos del job `deploy`:
1. Descarga el código del repositorio.
2. Configura la conexión SSH usando los secrets.
3. Copia los archivos a la EC2.
4. En el servidor instala dependencias, compila con `npm run build` y reinicia la app con pm2.

## Secrets
- `EC2_HOST`: IP pública de la EC2 (cambia cuando se reinicia el Learner Lab).
- `EC2_USER`: usuario SSH.
- `EC2_SSH_KEY`: llave privada SSH.

Los secrets no están en el código para que nadie pueda usarlos.
