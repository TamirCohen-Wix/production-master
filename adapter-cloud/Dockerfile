# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app
ENV NODE_OPTIONS="--max-old-space-size=4096"

COPY .npmrc package*.json ./
RUN npm install

COPY src/ ./src/
COPY tsconfig.json ./
RUN npx tsc

# Stage 2: Production dependencies only
FROM node:22-alpine AS deps

WORKDIR /app
ENV NODE_OPTIONS="--max-old-space-size=4096"

COPY .npmrc package*.json ./
RUN npm install --omit=dev

# Stage 3: Run
FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "dist/api/server.js"]
