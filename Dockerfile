# Fase 1: Builder
FROM node:22-alpine AS builder

WORKDIR /app

# Dipendenze per moduli nativi
RUN apk add --no-cache libc6-compat python3 make g++

COPY package.json package-lock.json ./

# Installazione dipendenze
RUN npm install

COPY . .

# Generazione Prisma Client (versione 6 per compatibilità schema)
RUN npx prisma@6 generate

# Allineamento Database
RUN npx prisma@6 db push --accept-data-loss

# Build di Next.js
RUN npm run build

# Fase 2: Runner
FROM node:22-alpine AS runner

WORKDIR /app

# Sicurezza: utente non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copiamo i file necessari dal builder
# Standalone include già il server e le dipendenze minime
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./

# Creiamo la cartella data per il database SQLite persistente
RUN mkdir -p data && chown nextjs:nodejs data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

# Avvio
CMD ["node", "server.js"]
