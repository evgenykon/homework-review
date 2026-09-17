# syntax=docker/dockerfile:1

FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --ignore-scripts

FROM base AS development
COPY . .
EXPOSE 3000
CMD ["bun", "run", "dev"]

FROM base AS build
COPY . .
RUN bun run build

FROM oven/bun:1 AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["bun", ".output/server/index.mjs"]
