# Dockerfile de referencia para booking-web/backend
# Construye e inicia el servidor Express + Prisma. Pensado para Postgres
# en producción (ver README.md); para SQLite monta un volumen persistente
# en /app y cambia DATABASE_URL a "file:./booking.db".

FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
