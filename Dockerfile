# syntax=docker/dockerfile:1

# ---- frontend build (SPA estática, Vite) ----
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- backend build (compila TypeScript para JS) ----
FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# ---- runtime (nginx + backend Node no mesmo container, via supervisord) ----
FROM node:20-alpine AS runtime
LABEL maintainer="Movecta"

RUN apk add --no-cache nginx supervisor openssl tzdata \
    && cp /usr/share/zoneinfo/America/Recife /etc/localtime \
    && echo "America/Recife" > /etc/timezone \
    && addgroup -g 10001 -S movesecurity \
    && adduser -u 10001 -S -G movesecurity movesecurity

WORKDIR /app/backend

# Instala só as dependências de produção e gera o Prisma Client direto
# nesta imagem (evita o "npm prune apaga .prisma/client" que acontece se
# a gente tentar herdar o node_modules do estágio de build).
COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

COPY --from=backend-build /app/backend/dist ./dist
COPY --from=frontend-build /app/frontend/dist /var/www/html

COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /docker/entrypoint.sh

RUN mkdir -p /app/backend/uploads \
    && chown -R movesecurity:movesecurity /app/backend/uploads \
    && chmod +x /docker/entrypoint.sh

# Vídeo fixo de treinamento: fica fora de /app/backend/uploads (que em produção
# é um PVC montado por cima, escondendo qualquer coisa da imagem) para poder
# ser copiado ao PVC por um initContainer no primeiro start do Pod.
COPY backend/uploads/treinamentos-dinamicos/videos/treinamento_terminal_rfb.mp4 /app/seed/treinamentos-dinamicos/videos/treinamento_terminal_rfb.mp4

EXPOSE 80 443

ENTRYPOINT ["/docker/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
