# Con Devcontainers

La manera recomendada de trabajar en el proyecto es por medio de devcontainers:

```bash
docker compose -f .devcontainer/docker-compose.yml up --build
```

Si se utiliza VS Code, el workflow es:

- abrir el proyecto en VS Code
- instalar la extensión **Dev Containers**
- ejecutar el comando "Dev Containers: Reopen in Container"
- luego las terminales de VS Code serán en el contenedor

Luego instalar las dependencias dentro del contenedor:

```bash
cd /workspace/hub-backend && npm ci
cd /workspace/hub-frontend && npm ci
```

Postgresql se ejecuta automáticamente

# ejecutar backend y generar esquemas de prisma orm

```bash
npx prisma generate
npx prisma migrate dev --name [name]
npm start dev
```

ir a [http://localhost:3001/api](http://localhost:3001/api)

# ejecutar el frontend

```bash
npm run dev
```

ir a [http://localhost:3000](http://localhost:3000)

# Admin bootstrap

Estas variables de entorno son necesarias para el primer setup:

```
INITIAL_ADMIN_EMAIL
INITIAL_ADMIN_PASSWORD
INITIAL_ADMIN_NAME
```

# Anexos de proyecto (storage)

Los anexos se guardan a través de una abstracción `StorageService`
(`hub-backend/src/storage`). El driver se selecciona con `STORAGE_DRIVER`.
En desarrollo el default es MinIO (ver `hub-backend/.env.example`); usa
`STORAGE_DRIVER="local"` para user el disco local.

Endpoints (requieren autenticación y ser participante del proyecto o admin):

```
POST   /projects/:projectId/attachments             (multipart/form-data, campo "file")
GET    /projects/:projectId/attachments
GET    /projects/:projectId/attachments/:id/download
DELETE /projects/:projectId/attachments/:id
```

Límites: 10 MB por archivo. Tipos permitidos: PDF, Word, Excel, PNG y JPEG.

## MinIO (por defecto en desarrollo)

`compose.yml` y `.devcontainer/docker-compose.yml` levantan `minio` en
`localhost:9000` (API) y `localhost:9001` (consola). Un contenedor de un solo
uso, `minio-init`, espera a MinIO y crea el bucket de forma idempotente antes
de que arranque el backend, así que no hay que crearlo a mano.

Credenciales y bucket por defecto (`.env` raíz y `hub-backend/.env`):

```
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="capstonehub"
```

El backend se conecta con (`hub-backend/.env`):

```
STORAGE_DRIVER="s3"
S3_ENDPOINT="http://minio:9000"   # nombre del servicio dentro de Docker
S3_BUCKET="capstonehub"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_REGION="us-east-1"
S3_FORCE_PATH_STYLE="true"        # obligatorio para MinIO
```

Notas:

- Si corres el backend **fuera de Docker** (por ejemplo `npm start dev` en tu
  máquina), cambia `S3_ENDPOINT` a `http://localhost:9000`.
- Consola web: http://localhost:9001 (usuario y clave de arriba).
- El volumen `minio_data` conserva los objetos entre reinicios.
- Verificar el bucket desde el host:

  ```bash
  docker run --rm --entrypoint /bin/sh --network prisma-network quay.io/minio/mc \
    -c 'mc alias set local http://minio:9000 minioadmin minioadmin && mc ls local/capstonehub'
  ```

- Migrar archivos que ya estaban en disco local al bucket:

  ```bash
  docker run --rm --entrypoint /bin/sh --network prisma-network \
    -v "$PWD/hub-backend/uploads:/data" quay.io/minio/mc \
    -c 'mc alias set local http://minio:9000 minioadmin minioadmin && mc mirror /data local/capstonehub'
  ```

## Disco local (fallback)

- Archivos en `UPLOAD_DIR`, o en `<hub-backend>/uploads` si está vacío.
- En `compose.yml` el `backend` monta el volumen `backend_uploads` en
  `/usr/src/app/uploads`; en el Dev Container el bind mount del repo ya
  persiste `hub-backend/uploads`.
- Para volver: `STORAGE_DRIVER="local"` en `hub-backend/.env` y reinicia el
  backend.

## S3 producción, aunque no está  testeado

`S3StorageService` usa el SDK de AWS, así que apuntar a S3 es solo cambiar el
entorno: `STORAGE_DRIVER="s3"`, credenciales reales, `S3_REGION`, `S3_BUCKET`,
`S3_ENDPOINT` vacío y `S3_FORCE_PATH_STYLE="false"`. Algunas alternativas compatibles
son LocalStack, SeaweedFS, Garage o `moto server`.
