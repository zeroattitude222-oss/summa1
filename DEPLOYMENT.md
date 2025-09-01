# Client-Side WASM Exam Document Converter - Deployment Guide

## Overview

This guide covers deploying a fully client-side document converter that uses WebAssembly (WASM) modules for document processing. The application runs entirely in the browser with no traditional backend server.

## Architecture

- **Frontend**: React TypeScript application with WASM integration
- **Python WASM**: Document analysis and intelligent file renaming (client-side)
- **Rust WASM**: High-performance document conversion and formatting (client-side)
- **No Backend**: All processing happens in the browser using WebAssembly

## Key Features

🌐 **100% Client-Side Processing** - No server uploads, complete privacy
🐍 **Python WASM** - Intelligent document analysis and file renaming
🦀 **Rust WASM** - High-performance document conversion and compression
🔒 **Privacy-First** - Files never leave the user's browser
⚡ **Fast Processing** - WebAssembly performance for document operations

## Prerequisites

### Local Development
- Docker Desktop
- Node.js 18+
- Python 3.11+ (for WASM building)
- Rust 1.75+ (for WASM building)
- wasm-pack (Rust WASM toolchain)

### Kubernetes Deployment
- Kubernetes cluster
- kubectl configured
- Ingress controller (NGINX recommended)
- Docker registry access

## Quick Start (Development)

```bash
# 1. Clone and setup
git clone <repository>
cd exam-document-converter

# 2. Run setup script
chmod +x scripts/local-setup.sh
./scripts/local-setup.sh

# 3. Choose option 1 (Development Mode)
```

## WASM Module Development

### Python WASM Module

The Python module handles document analysis and intelligent file renaming:

```bash
cd wasm-modules/python-analyzer

# Install dependencies
pip install -r requirements.txt

# Build WASM module
python build.py

# Test locally
python analyzer.py
```

**Key Functions:**
- `analyze_document_wasm(filename)` - Main WASM export
- Document type detection (marksheet, certificate, photo, etc.)
- Education level detection (10th, 12th, graduation, etc.)
- Intelligent file renaming with confidence scoring

### Rust WASM Module

The Rust module handles high-performance document conversion:

```bash
cd wasm-modules/rust-converter

# Install wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Build WASM module
./build.sh

# Output will be in ./build/ directory
```

**Key Functions:**
- `convert_documents(request_json)` - Main WASM export
- Format conversion (PDF, JPEG, PNG, DOCX)
- Size optimization and compression
- Exam-specific format compliance

## Local Deployment Options

### Option 1: Development Mode (Recommended for development)

```bash
# Build WASM modules
./scripts/local-setup.sh
# Choose option 1

# Manual steps:
npm install
npm run dev
```

Access: http://localhost:5173

### Option 2: Docker Compose (Quick containerized setup)

```bash
# Build and run all services
docker-compose up --build

# Access application
open http://localhost:5173
```

### Option 3: Minikube (Full Kubernetes locally)

```bash
# Start Minikube
minikube start --memory=4096 --cpus=2
minikube addons enable ingress

# Build and deploy
./scripts/local-setup.sh
# Choose option 3

# Access application
open http://exam-converter.local
```

### Option 4: Kind (Lightweight Kubernetes)

```bash
# Setup Kind cluster
./scripts/local-setup.sh
# Choose option 4

# Access application
open http://exam-converter.local
```

## Production Deployment

### 1. Build Pipeline (Jenkins)

The Jenkinsfile handles:
- Building WASM modules
- Creating Docker images
- Deploying to Kubernetes
- Health checks and rollback

```bash
# Trigger deployment
git push origin main
```

### 2. Kubernetes Manifests

Key components:
- `frontend-deployment.yaml` - React app with WASM integration
- `wasm-deployments.yaml` - WASM file serving
- `ingress.yaml` - Routing and CORS for WASM
- `configmap.yaml` - Application configuration

### 3. WASM File Serving

WASM modules are served as static files with proper MIME types:

```nginx
location ~* \.wasm$ {
    add_header Content-Type application/wasm;
    add_header Access-Control-Allow-Origin *;
    add_header Cache-Control "public, max-age=3600";
}
```

## Application Workflow

### 1. Initialization
```javascript
// Frontend loads WASM modules
await wasmService.initialize();
```

### 2. Document Analysis (Python WASM)
```javascript
// Analyze uploaded file
const analysis = await wasmService.analyzeDocument(file);
// Returns: { suggestedName, confidence, documentType }
```

### 3. Document Conversion (Rust WASM)
```javascript
// Convert documents to exam formats
const result = await wasmService.convertDocuments(
  files, examType, targetFormats, maxSizes
);
```

### 4. Download
```javascript
// Download converted files
files.forEach(file => {
  const link = document.createElement('a');
  link.href = file.convertedUrl; // Blob URL
  link.download = file.name;
  link.click();
});
```

## Supported Exam Types

| Exam | Formats | Max Sizes | Requirements |
|------|---------|-----------|--------------|
| NEET | PDF, JPEG | PDF: 2MB, JPEG: 500KB | 10th/12th Marksheet, Photo, Signature |
| JEE | PDF, JPEG, PNG | PDF: 1MB, JPEG/PNG: 300KB | Certificates, Photo, Signature |
| UPSC | PDF, JPEG, PNG | PDF: 3MB, Images: 1MB | Educational Certificates, Experience |
| CAT | PDF, JPEG | PDF: 1.5MB, JPEG: 400KB | Graduation Certificate, Photo |
| GATE | PDF, JPEG, PNG | PDF: 2MB, Images: 500KB | Degree Certificate, Photo |

## Troubleshooting

### WASM Loading Issues

```bash
# Check WASM files are accessible
curl -I http://localhost:5173/wasm/python/
curl -I http://localhost:5173/wasm/rust/

# Verify MIME types
curl -H "Accept: application/wasm" http://localhost:5173/wasm/rust/document_converter_wasm.wasm
```

### Browser Console Errors

Common issues:
- CORS errors: Ensure proper headers for WASM files
- MIME type errors: Verify `application/wasm` content type
- Module loading: Check browser developer tools Network tab

### Kubernetes Debugging

```bash
# Check pod status
kubectl get pods -n exam-converter

# Check WASM file serving
kubectl logs -f deployment/wasm-server -n exam-converter

# Check frontend logs
kubectl logs -f deployment/frontend -n exam-converter

# Test ingress
kubectl describe ingress exam-converter-ingress -n exam-converter
```

## Performance Optimization

### WASM Module Optimization

1. **Rust WASM**:
   ```bash
   # Build with optimizations
   wasm-pack build --target web --release --out-dir pkg
   ```

2. **Python WASM**:
   ```bash
   # Minimize Python module size
   pyodide build --optimize
   ```

### Frontend Optimization

1. **Lazy Loading**:
   ```javascript
   // Load WASM modules only when needed
   const wasmModule = await import('./wasm/module.js');
   ```

2. **Caching**:
   ```javascript
   // Cache WASM modules in browser
   const cache = await caches.open('wasm-modules');
   ```

## Security Considerations

1. **Client-Side Only**: No server-side vulnerabilities
2. **File Validation**: Validate file types and sizes in WASM
3. **Memory Safety**: Rust provides memory safety for document processing
4. **CORS**: Proper CORS headers for WASM module loading
5. **CSP**: Content Security Policy for WASM execution

## Monitoring

### Application Metrics

- WASM module load times
- Document processing performance
- Conversion success rates
- Browser compatibility metrics

### Kubernetes Metrics

```bash
# Resource usage
kubectl top pods -n exam-converter

# Service availability
kubectl get endpoints -n exam-converter
```

## Browser Compatibility

| Browser | WASM Support | Status |
|---------|--------------|--------|
| Chrome 57+ | ✅ Full | Recommended |
| Firefox 52+ | ✅ Full | Supported |
| Safari 11+ | ✅ Full | Supported |
| Edge 16+ | ✅ Full | Supported |

## Development Tips

1. **WASM Debugging**: Use browser developer tools for WASM debugging
2. **Hot Reload**: WASM modules require page refresh during development
3. **Error Handling**: Implement proper error boundaries for WASM failures
4. **Testing**: Test with various document types and sizes
5. **Performance**: Monitor memory usage during large file processing

## Contributing

1. **WASM Modules**: Add new document types or conversion formats
2. **Frontend**: Improve UI/UX for document processing
3. **Testing**: Add automated tests for WASM functions
4. **Documentation**: Update guides for new features

## Support

For issues and questions:
- Check browser console for WASM errors
- Verify WASM module loading in Network tab
- Test with different document types
- Review Kubernetes logs for deployment issues