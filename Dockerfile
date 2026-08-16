# Fase 1: Installazione dipendenze
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copia i file di dipendenza
COPY package.json package-lock.json* ./
RUN npm install

# Fase 2: Build dell'applicazione
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Se usassi Prisma, questo è il punto corretto per generare il client:
# RUN npx prisma generate

RUN npm run build

# Fase 3: Runner di produzione
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Crea un utente non-root per sicurezza
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia i file necessari dalla fase builder
COPY --from=builder /app/public ./public

# Sfrutta l'output standalone per ridurre drasticamente la dimensione dell'immagine
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Crea e assegna i permessi alla cartella dei dati per SQLite
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

# Avvia l'applicazione usando il server generato dalla modalità standalone
CMD ["node", "server.js"]
