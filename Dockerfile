# syntax = docker/dockerfile:1

ARG NODE_VERSION=24.14.1
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

WORKDIR /app

ENV NODE_ENV="production"

# ─────────────────────────────
# BUILD STAGE
# ─────────────────────────────
FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    node-gyp \
    pkg-config \
    python-is-python3 \
    webp \
    ffmpeg \
 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

# ─────────────────────────────
# FINAL STAGE
# ─────────────────────────────
FROM base

WORKDIR /app

COPY --from=build /app /app

# runtime deps (caso não estejam no build final)
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    ffmpeg \
    webp \
 && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /data
VOLUME /data

EXPOSE 3000

ENV DATABASE_URL="file:///data/sqlite.db"

CMD [ "npm", "run", "start" ]