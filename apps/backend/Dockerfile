FROM node:20-alpine AS builder

WORKDIR /app

# Install yarn
RUN apk add --no-cache yarn

# Copy workspace files (build context is workspace root)
COPY package.json yarn.lock ./

# Install all workspace dependencies
RUN yarn install --frozen-lockfile

# Copy backend source files to a subdirectory
COPY apps/backend/ ./backend/

# Install backend-specific dependencies and build
RUN cd backend && yarn install --frozen-lockfile && npx tsc --skipLibCheck

FROM node:20-alpine AS runtime

WORKDIR /app

# Copy node_modules from builder stage (which has all dependencies)
COPY --from=builder /app/backend/node_modules ./node_modules

# Copy built backend from builder stage
COPY --from=builder /app/backend/dist ./dist

EXPOSE 3001

CMD ["node", "dist/main.js"]
