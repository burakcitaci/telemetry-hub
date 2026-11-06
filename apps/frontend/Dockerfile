FROM node:24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache yarn
COPY package.json yarn.lock ./
COPY apps/frontend/package.json ./apps/frontend/
RUN yarn install --frozen-lockfile --non-interactive
COPY tsconfig.base.json tsconfig.browser.json tsconfig.node.json ./
COPY apps/frontend/ ./apps/frontend/
ARG VITE_BACKEND_URL=/
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
RUN yarn workspace frontend build

FROM nginxinc/nginx-unprivileged:1.28-alpine
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
