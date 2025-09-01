#!/bin/bash

# Build script for Rust WASM module

set -e

echo "🦀 Building Rust WASM module..."

# Install wasm-pack if not available
if ! command -v wasm-pack &> /dev/null; then
    echo "📦 Installing wasm-pack..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

# Build WASM package
echo "🔨 Compiling Rust to WASM..."
wasm-pack build --target web --out-dir pkg --release

# Create build output directory
mkdir -p build

# Copy WASM files to build directory
cp pkg/*.wasm build/
cp pkg/*.js build/
cp pkg/*.ts build/ 2>/dev/null || true

echo "✅ Rust WASM build complete!"
echo "📦 Output files:"
ls -la build/

echo ""
echo "🎉 Rust WASM module ready for integration!"
echo "   Files available in: ./build/"