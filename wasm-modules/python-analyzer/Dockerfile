# Python WASM Build Container
FROM python:3.11-slim

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Pyodide for WASM compilation
RUN pip install --no-cache-dir \
    pyodide-build \
    micropip

# Copy source files
COPY src/ ./src/
COPY build.py ./
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Build WASM module
RUN python build.py

# Create output directory
RUN mkdir -p /output

# Copy built WASM files to output
RUN cp -r build/* /output/

# Create non-root user
RUN adduser --disabled-password --gecos '' wasmuser && \
    chown -R wasmuser:wasmuser /app /output
USER wasmuser

# Default command
CMD ["python", "build.py"]