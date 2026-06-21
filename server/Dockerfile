# Clearway API container (works on Railway, Render, Fly, etc.)
FROM node:20-slim AS base
WORKDIR /app

# Prisma needs OpenSSL at runtime
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev && npx prisma generate

COPY . .

ENV NODE_ENV=production
EXPOSE 4000

# Apply migrations on boot, then start.
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
