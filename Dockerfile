# Multi-stage build for React frontend with WASM modules

# Stage 1: Build Python WASM module
FROM python:3.11-slim as python-builder

WORKDIR /python-build

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python WASM source
COPY wasm-modules/python-analyzer/ ./

# Install Python dependencies and build
RUN pip install --no-cache-dir -r requirements.txt
RUN python build.py

# Stage 2: Build Rust WASM module  
FROM rust:1.75-slim as rust-builder

WORKDIR /rust-build

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install wasm-pack
RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Copy Rust WASM source
COPY wasm-modules/rust-converter/ ./

# Build WASM module
RUN chmod +x build.sh && ./build.sh

# Stage 3: Build React frontend
FROM node:18-alpine as frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./
COPY vite.config.js ./
COPY tailwind.config.js ./

# Copy WASM modules from previous stages
COPY --from=python-builder /python-build/build/ ./public/wasm/python/
COPY --from=rust-builder /rust-build/build/ ./public/wasm/rust/

# Build the application
RUN npm run build

# Stage 4: Production runtime
FROM nginx:alpine

# Copy built application
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create non-root user
RUN adduser -D -s /bin/sh appuser && \
    chown -R appuser:appuser /usr/share/nginx/html
USER appuser

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]