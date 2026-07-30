# Despliegue a producción (Dinahosting)

Cada push a `main` ejecuta `.github/workflows/deploy.yml`: corre los tests, compila el cliente,
sincroniza los ficheros por SSH y reinicia la app de Passenger. Si los secretos no están
configurados, el workflow se salta el deploy sin fallar.

## Requisitos en Dinahosting

1. **Plan con soporte Node.js** (Hosting Avanzado). La app se crea en
   Panel de Control → Hosting → Servidor → *Otras aplicaciones* → tipo **Node.js**:
   - **Directorio raíz de la aplicación**: el directorio de despliegue (p. ej. `www/homzy`).
   - **Fichero de arranque**: `server/src/index.js`.
   - **Entorno**: `production` (Passenger define `NODE_ENV` y el `PORT`; la app ya los respeta).
2. **Acceso SSH activado** en el plan.
3. **Node 18+** (si el panel lo permite, selecciona una versión 18/20 en
   "Utilizar versión personalizada de NodeJS").

## Configuración una sola vez

### 1. Clave SSH de despliegue

En tu máquina:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/homzy_deploy -N "" -C "github-actions-homzy"
```

Añade la clave pública al hosting (desde tu máquina, te pedirá la contraseña SSH del hosting):

```bash
ssh-copy-id -i ~/.ssh/homzy_deploy.pub TU_USUARIO@TU_HOST_SSH.dinaserver.com
```

### 2. Secretos en GitHub

En `github.com/AlexCasanova2/homzy` → Settings → Secrets and variables → Actions → *New repository secret*:

| Secreto | Valor |
|---|---|
| `DINAHOSTING_SSH_HOST` | Host SSH del hosting (p. ej. `tu-dominio.dinaserver.com`) |
| `DINAHOSTING_SSH_USER` | Usuario SSH |
| `DINAHOSTING_SSH_KEY` | Contenido completo de `~/.ssh/homzy_deploy` (la clave **privada**) |
| `DINAHOSTING_DEPLOY_PATH` | Ruta absoluta del directorio raíz de la app (p. ej. `/home/usuario/www/homzy`) |

### 3. `.env` de producción (solo en el servidor)

El deploy **nunca** toca `server/.env` ni la base de datos (`db/app.db*`) del servidor.
Crea `server/.env` en el hosting una vez, por SSH:

```
JWT_SECRET=<secreto largo y aleatorio, distinto al de local>
AMAZON_STORE_ID=homzy0f-21
DB_PATH=/ruta/absoluta/al/directorio/db/app.db
```

- `JWT_SECRET` es obligatorio: en producción la app no arranca sin él.
- Usa una ruta **absoluta** en `DB_PATH` (bajo Passenger el directorio de trabajo no es `server/`).
- No configures `PORT`: lo asigna Passenger.

## Notas de funcionamiento

- **Publicaciones programadas**: el planificador corre dentro del proceso Node. Passenger puede
  dormir la app si no recibe tráfico, así que un artículo programado podría publicarse con retraso,
  al llegar la siguiente visita. Si esto importa, configura en el panel que la app se mantenga
  siempre activa (min instances / "always running") si tu plan lo permite.
- **Reinicio manual**: `touch tmp/restart.txt` en el directorio raíz de la app.
- **Deploy manual**: pestaña Actions → "Deploy to production" → *Run workflow*.
- **Base de datos**: SQLite vive en el servidor y está excluida del sync. Haz copias periódicas
  (basta con descargar `db/app.db` por SFTP con la app parada, o usar `sqlite3 app.db ".backup"`).
