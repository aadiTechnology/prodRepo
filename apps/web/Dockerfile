# ============================================================
# Rashmi / Aadi Technology React Web Application
# Production Docker image
# ============================================================

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first for better Docker layer caching
COPY package*.json ./
RUN npm ci

# Copy application source
COPY . .

# Vite variables are compiled into the frontend at build time.
ARG VITE_API_BASE_URL
ARG VITE_APP_NAME
ARG VITE_APP_VERSION
ARG VITE_LOGIN_DEFAULT_HOSTS

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_APP_NAME=${VITE_APP_NAME}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}
ENV VITE_LOGIN_DEFAULT_HOSTS=${VITE_LOGIN_DEFAULT_HOSTS}

# Production web build
RUN npm run build

# ============================================================
# Runtime stage
# ============================================================
FROM nginx:1.27-alpine

# Remove default nginx site
RUN rm -f /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
