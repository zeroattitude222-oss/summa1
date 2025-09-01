# Rust WASM Build Container
FROM rust:1.75-slim as builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install wasm-pack
RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Copy Cargo files
COPY Cargo.toml Cargo.lock ./

# Copy source code
COPY src/ ./src/
COPY build.sh ./

# Make build script executable
RUN chmod +x build.sh

# Build WASM module
RUN ./build.sh

# Runtime stage for serving built files
FROM nginx:alpine

# Copy built WASM files
COPY --from=builder /app/build /usr/share/nginx/html/wasm

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create non-root user
RUN adduser -D -s /bin/sh wasmuser && \
    chown -R wasmuser:wasmuser /usr/share/nginx/html
USER wasmuser

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]