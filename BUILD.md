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

# para generar datos de prueba

Prisma seeds genera usuarios, proyectos, actores, hitos, observaciones, historial de
estados y anexos de ejemplo. Todo en `hub-backend/prisma`:

```
prisma/seed.ts          # CLI principal
prisma/seed/            # una sección por dominio + utilidades
prisma/fixtures/        # datos mock en JSON y archivos de anexos
prisma/register.cjs     # hook de ts-node para el cliente generado
```

Se ejecuta desde `hub-backend` y requiere Postgres levantado y migrado:

```bash
cd hub-backend

npm run seed                 # todas las secciones
npm run seed:users           # solo usuarios
npm run seed:projects        # solo proyectos
npm run seed:actors          # solo asignaciones de actores
npm run seed:milestones      # solo hitos
npm run seed:observations    # solo observaciones
npm run seed:status          # solo transiciones de estado
npm run seed:attachments     # solo anexos
npm run seed:reset           # borra los datos sembrados y los vuelve a crear
```

También se puede ejecutar con flags:

```bash
npm run seed -- --only=users
npm run seed -- --only=projects,actors,status   # agrega dependencias automáticamente
npm run seed -- --dry-run                        # no escribe en la base
npm run seed -- --strict                         # falla si MinIO no está disponible
npm run seed -- --help
```

Y a través de Prisma CLI:

```bash
npx prisma db seed
```

si se corre varias veces no duplica registros, solo
actualiza lo que ya existe. `npm run seed:reset` elimina únicamente los datos
sembrados (por nombre de proyecto y email del fixture) antes de recrearlos.

## Fixtures

- `prisma/fixtures/users.json`: usuarios con sus roles. El campo
  `defaultPassword` `Capstone123!` se usa para todos, salvo que un usuario
  defina su propia contraseña.
- `prisma/fixtures/projects.json`: proyectos con proponente (natural o legal),
  escuelas, actores, estado objetivo y anexos.
- `prisma/fixtures/milestones.json` y `observations.json`: indexados por el
  nombre del proyecto.
- `prisma/fixtures/attachments/`: archivos de ejemplo que se suben a
  MinIO.

Credenciales de ejemplo (los emails de los fixtures terminan en
`@capstonehub.test`):

```
coord.ana@capstonehub.test   / Capstone123!   (coordinator)
eval.maria@capstonehub.test  / Capstone123!   (evaluator)
advisor.sofia@capstonehub.test / Capstone123! (advisor)
student.juan@capstonehub.test / Capstone123!  (student)
```

Notas:

- El hash de la contraseña solo se guarda en la base; la contraseña en claro
  está en `users.json`, por eso se puede iniciar sesión con esos valores.
- Los anexos requieren el MinIO configurado; sin eso el seed avisa y los omite
  (usar `--strict` para que falle en su lugar).
- Si corres el seed fuera de Docker, `DATABASE_URL` y `S3_ENDPOINT` en
  `hub-backend/.env` deben apuntar a `localhost` en vez del nombre del contenedor.

# Anexos de proyecto (storage)

Los anexos se guardan en MinIO/S3 a través de `StorageService`
(`hub-backend/src/storage`)

Endpoints (requieren autenticación y ser participante del proyecto o admin):
```
POST   /projects/:projectId/attachments             (multipart/form-data, campo "file")
GET    /projects/:projectId/attachments
GET    /projects/:projectId/attachments/:id/download
DELETE /projects/:projectId/attachments/:id
```

Límite de 10 MB por archivo, y se permite PDF, Word, Excel, PNG y JPEG

## MinIO

`compose.yml` y `.devcontainer/docker-compose.yml` levantan `minio` en
`localhost:9000` (API) y `localhost:9001` (consola). Un contenedor de un solo
uso, `minio-init`, espera a MinIO y crea el bucket de forma idempotente antes
de que arranque el backend, así que no hay que crearlo a mano

Credenciales y bucket por defecto (`.env` raíz y `hub-backend/.env`):

```
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="capstonehub"
```

El backend se conecta con (`hub-backend/.env`):

```
S3_ENDPOINT="http://minio:9000" # nombre del servicio dentro de Docker
S3_BUCKET="capstonehub"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_REGION="us-east-1"
S3_FORCE_PATH_STYLE="true" # obligatorio para MinIO
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

## en producción se debería usar S3, aunque no está  testeado:

`S3StorageService` usa el SDK de AWS, así que apuntar a S3 es solo cambiar el
entorno: credenciales reales, `S3_REGION`, `S3_BUCKET`, `S3_ENDPOINT` vacío y
`S3_FORCE_PATH_STYLE="false"`. Algunas alternativas compatibles son LocalStack,
SeaweedFS, Garage o `moto server`.
