# DAATHOS — API Fastify + DAATHOS OS (Vite) para deploy em container (ex.: Railway).
<<<<<<< HEAD
# Documentação da plataforma: https://railway.com/

=======
# https://railway.com/
#
# Se o build falhar com "src: not found":
# - Railway → Settings → Root Directory: deixe VAZIO (raiz do repositório), não "frontend".
# - Confirme no Git que a pasta src/ está commitada junto com server.js.
#
>>>>>>> 16f81b7 (feat: DAATHOS backend, frontend, Docker e Railway)
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
<<<<<<< HEAD
# Incorporada no bundle do Vite em build time (opcional; use o mesmo segredo que DAATHOS_API_KEY no runtime)
=======
>>>>>>> 16f81b7 (feat: DAATHOS backend, frontend, Docker e Railway)
ARG VITE_DAATHOS_API_KEY=
ENV VITE_DAATHOS_API_KEY=$VITE_DAATHOS_API_KEY
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
<<<<<<< HEAD
COPY server.js ./
COPY src ./src
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
=======
# Copia todo o contexto (respeitando .dockerignore). Evita falha silenciosa se paths mudarem.
COPY . .
RUN test -d ./src && test -f ./server.js || \
  (echo "" && \
   echo "=== ERRO: backend ausente no contexto do Docker ===" && \
   echo "1) Railway: Service -> Settings -> Root Directory = vazio (raiz do repo)" && \
   echo "2) Git: confirme que a pasta src/ foi commitada (git add src && git push)" && \
   echo "" && exit 1)
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
RUN rm -rf frontend/node_modules frontend/src frontend/public 2>/dev/null || true
>>>>>>> 16f81b7 (feat: DAATHOS backend, frontend, Docker e Railway)
EXPOSE 3000
CMD ["node", "server.js"]
