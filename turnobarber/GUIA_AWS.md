# Guía para montar TurnoBarber en AWS (región us-east-1, N. Virginia)

Usa siempre la región **US East (N. Virginia)**. Haz primero el paso 0.

## 0. Cuidar los USD 50
- Ve a **Billing > Budgets** y crea un presupuesto de **USD 40** con alerta al correo.
- Cuando no estén probando, **apaguen EC2 y RDS** (Stop) y **borren el balanceador** (el ALB no se puede apagar, cobra mientras exista).

## 1. Red (VPC)
1. **VPC > Create VPC > "VPC and more"**.
2. Nombre `turnobarber`, **2 zonas**, **2 subredes públicas**, **2 subredes privadas**.
3. **NAT gateways: None** y **VPC endpoints: None** (así se ahorra plata). Crear.

## 2. Grupos de seguridad (EC2 > Security Groups, en la VPC turnobarber)
- `sg-alb`: entrada **HTTP 80** desde **Anywhere**.
- `sg-ec2`: entrada **Custom TCP 3000** desde `sg-alb`, y **SSH 22** desde **My IP**.
- `sg-rds`: entrada **PostgreSQL 5432** desde `sg-ec2`.

## 3. Base de datos (RDS)
1. **RDS > Create database > PostgreSQL**, plantilla **Free tier / Dev**.
2. **Single-AZ**, instancia **db.t4g.micro**, almacenamiento **gp3 20 GB**.
3. Usuario `postgres` y una clave (anótala). **Initial database name: `turnobarber`**.
4. Red: VPC turnobarber, **Public access: No**, grupo `sg-rds`. Si pide subnet group, crea uno con las 2 subredes **privadas**.
5. Cuando esté lista, copia el **Endpoint**.

## 4. Servidor (EC2)
1. **EC2 > Launch instance**: Amazon Linux 2023, **t3.micro**, crea un key pair (.pem).
2. Red: VPC turnobarber, **una subred pública**, **Auto-assign public IP: Enable**, grupo `sg-ec2`.
3. Conéctate (botón **Connect > EC2 Instance Connect**) y ejecuta:
   ```
   sudo dnf install -y nodejs npm git postgresql15
   ```
4. Sube el proyecto (por ejemplo, desde un repositorio de GitHub con `git clone`) y entra a la carpeta:
   ```
   cd turnobarber
   npm install
   npm run build
   psql "host=ENDPOINT_RDS dbname=turnobarber user=postgres sslmode=require" -f server/schema.sql
   ```
5. Arranca la app de forma que no se cierre:
   ```
   sudo npm install -g pm2
   DATABASE_URL="postgres://postgres:CLAVE@ENDPOINT_RDS:5432/turnobarber" DB_SSL=true pm2 start server/index.js --name turnobarber
   pm2 save
   ```
6. Prueba: `curl http://localhost:3000/api/salud` debe responder `ok`.

## 5. Balanceador (EC2 > Load Balancers)
1. **Target group**: tipo Instances, HTTP **3000**, health check `/api/salud`. Registra tu EC2.
2. **Create load balancer > Application Load Balancer**, **Internet-facing**, VPC turnobarber, **las 2 subredes públicas**, grupo `sg-alb`.
3. Listener **HTTP 80** que envíe al target group.
4. Espera a que el estado sea **Active** y abre en el navegador el **DNS name** del balanceador. Esa es la dirección para mostrarle a la profe.

## 6. Correos reales (opcional, Amazon SES)
1. **SES > Verified identities**: verifica tu correo (el remitente) y el correo donde recibirás las pruebas (SES empieza en modo de prueba).
2. **SES > SMTP settings > Create SMTP credentials** y guarda usuario y clave.
3. Reinicia la app con estas variables más: `SMTP_HOST=email-smtp.us-east-1.amazonaws.com SMTP_USER=... SMTP_PASS=... MAIL_FROM=tucorreo@...`
4. Para la demo, haz una cita para dentro de menos de 24 horas y en un minuto llega el recordatorio.

## 7. Auto Scaling (para mostrar que lo usan)
Cuando todo funcione: crea una **Launch template** a partir de tu EC2 y un **Auto Scaling group** (mínimo 1, máximo 2) conectado al target group. Úsalo solo en la demo y bórralo después.

## Qué no se montó en esta versión
CloudFront, S3, Cognito y el dominio no se usan en la demo (la misma app sirve las pantallas). Después de la presentación se ajusta el documento a lo que sí quedó montado.

## 8. Link personalizado (dominio del GitHub Student Pack)
1. En education.github.com/pack/offers reclama el dominio gratis (por ejemplo `turnobarber.me`). Revisa allí qué terminaciones están incluidas.
2. En el panel DNS del sitio donde quedó el dominio, crea un registro **CNAME**: nombre `app`, valor el **DNS name del balanceador**. El link queda `app.turnobarber.me`. Usa un subdominio (`app`), porque el dominio sin subdominio no se puede apuntar con CNAME.
3. **HTTPS (candado):** en **AWS Certificate Manager (us-east-1) > Request certificate** pide el certificado para `app.turnobarber.me` con validación **DNS**. Agrega en el panel DNS el CNAME que te muestra ACM y espera a que diga **Issued**.
4. En `sg-alb` agrega entrada **HTTPS 443** desde Anywhere.
5. En el balanceador agrega un listener **HTTPS 443** con ese certificado que envíe al mismo target group. Opcional: que el listener 80 redirija a 443.
6. Cuando el DNS actualice (pueden ser unos minutos), abre `https://app.turnobarber.me`.
No se necesita Route 53 para esto: el DNS lo maneja el sitio donde registraron el dominio.
