# syntax=docker/dockerfile:1

FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --ignore-scripts
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN bunx prisma generate

FROM base AS development
COPY . .
EXPOSE 3001
CMD ["bun", "run", "dev"]

FROM oven/bun:1 AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json bun.lock* ./
RUN bun install --production --ignore-scripts
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN bunx prisma generate
COPY tsconfig.json ./
COPY src ./src
EXPOSE 3001
CMD ["bun", "run", "start"]
