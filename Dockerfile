# DAATHOS — API Fastify + DAATHOS OS (Vite) para deploy em container (ex.: Railway).
# https://railway.com/

FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

# Opcional: injeta a mesma API key no build do Vite (embutida via import.meta.env).
ARG VITE_DAATHOS_API_KEY=
ENV VITE_DAATHOS_API_KEY=$VITE_DAATHOS_API_KEY

RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copia todo o contexto (respeitando .dockerignore). Evita falha silenciosa se paths mudarem.
COPY . .

RUN test -d ./src && test -f ./server.js || \
  (echo "" && \
   echo "=== ERRO: backend ausente no contexto do Docker ===" && \
   echo "1) Railway: Service -> Settings -> Root Directory = vazio (raiz do repo)" && \
   echo "2) Git: confirme que a pasta src/ foi commitada (git add src && git push)" && \
   echo "" && exit 1)

COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# remove peças desnecessárias para reduzir imagem
RUN rm -rf frontend/node_modules frontend/src frontend/public 2>/dev/null || true

EXPOSE 3000
CMD ["node", "server.js"]
