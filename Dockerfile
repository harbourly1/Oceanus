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
COPY apps/api/start.sh ./apps/api/start.sh

# Install all dependencies (npm workspaces resolves @oceanus/shared)
RUN npm install

# Generate Prisma client
WORKDIR /app/apps/api
RUN npx prisma generate

# Build shared package
WORKDIR /app/packages/shared
RUN npx tsc

# Build API (tsc outputs to dist/src/ due to include having both src/ and prisma/)
WORKDIR /app/apps/api
RUN npx tsc -p tsconfig.json
RUN chmod +x start.sh

EXPOSE 4000

CMD ["sh", "start.sh"]
