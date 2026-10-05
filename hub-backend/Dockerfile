# reference source: https://docs.nestjs.com/deployment

FROM node:26-slim

# install libssl for prisma to work fine
RUN apt-get update -y \
&& apt-get install -y --no-install-recommends openssl \
&& rm -rf /var/lib/apt/lists/*


WORKDIR /usr/src/app

COPY ./package.json ./
COPY ./package-lock.json ./

RUN if [ -f package-lock.json ]; then \
    npm ci --ignore-scripts --no-audit --no-fund; \
  else \
    echo "No lockfile found." && exit 1; \
  fi

COPY . .

# Genera el cliente Prisma (necesario para compilar) y compila. `generate` no se
# conecta a la base de datos; se usa el binario local en lugar de npx.
RUN node_modules/.bin/prisma generate && npm run build

# `NODE_ENV=production` solo desde aquí: durante `npm ci` y el build se necesita
# instalar devDependencies (prisma CLI, nest, typescript).
ENV NODE_ENV=production

EXPOSE 3001

CMD ["sh", "-c",  "npm run db:deploy && node dist/src/main"]
