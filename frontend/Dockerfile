# ── Stage 1: Build React app ────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Build-time env args (injected by docker-compose build args)
ARG VITE_API_URL=http://localhost:3000/api
ARG VITE_WS_URL=http://localhost:3000

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Serve with Nginx ────────────────────────
FROM nginx:alpine AS production

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
