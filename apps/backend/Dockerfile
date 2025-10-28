FROM node:20-alpine AS builder

WORKDIR /app

# Install yarn
RUN apk add --no-cache yarn

# Copy workspace files (build context is workspace root)
COPY package.json yarn.lock ./
COPY apps/backend/package.json ./apps/backend/

# Install all workspace dependencies
RUN yarn install --frozen-lockfile

# Copy backend source files
COPY apps/backend/ ./apps/backend/

# Copy shared config files
COPY tsconfig.base.json ./
COPY nx.json ./

# Build backend
RUN npx nx build backend --skip-nx-cache

FROM node:20-alpine AS runtime

WORKDIR /app

# Copy node_modules from builder stage (which has all dependencies)
COPY --from=builder /app/node_modules ./node_modules

# Copy built backend from builder stage
# Note: TypeScript build outputs to apps/backend/dist/apps/backend/src/
COPY --from=builder /app/apps/backend/dist/apps/backend/src ./dist

EXPOSE 3001

ENV PORT=3001
ENV HOST=0.0.0.0
ENV NODE_ENV=production

CMD ["node", "dist/main.js"]
