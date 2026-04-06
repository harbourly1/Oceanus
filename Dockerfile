FROM node:22-slim
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json turbo.json ./

# Copy workspace packages
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src

COPY apps/api/package.json apps/api/tsconfig.json apps/api/nest-cli.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/src ./apps/api/src

# Install all dependencies (npm workspaces resolves @oceanus/shared)
RUN npm install

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Build shared package
RUN cd packages/shared && npx tsc

# Build API using tsc directly (nest build has workspace resolution issues)
RUN cd apps/api && npx tsc -p tsconfig.json

# Verify dist output exists
RUN ls apps/api/dist/main.js

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["node", "dist/main"]
