#!/bin/bash

# Local Development Setup Script for Client-Side WASM Exam Document Converter

set -e

echo "🚀 Setting up Client-Side WASM Exam Document Converter locally..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}📋 Checking prerequisites...${NC}"
    
    local missing_deps=()
    
    if ! command -v docker &> /dev/null; then
        missing_deps+=("Docker Desktop")
    fi
    
    if ! command -v kubectl &> /dev/null; then
        missing_deps+=("kubectl")
    fi
    
    if ! command -v node &> /dev/null; then
        missing_deps+=("Node.js 18+")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        echo -e "${RED}❌ Missing dependencies:${NC}"
        printf '%s\n' "${missing_deps[@]}"
        echo -e "${YELLOW}Please install the missing dependencies and run this script again.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed!${NC}"
}

# Build WASM modules
build_wasm_modules() {
    echo -e "${BLUE}🔨 Building WASM modules...${NC}"
    
    # Build Python WASM module
    echo -e "${YELLOW}🐍 Building Python WASM module...${NC}"
    cd wasm-modules/python-analyzer
    python build.py
    cd ../..
    echo -e "${GREEN}✅ Python WASM module built${NC}"
    
    # Build Rust WASM module
    echo -e "${YELLOW}🦀 Building Rust WASM module...${NC}"
    cd wasm-modules/rust-converter
    chmod +x build.sh
    ./build.sh
    cd ../..
    echo -e "${GREEN}✅ Rust WASM module built${NC}"
    
    # Copy WASM modules to public directory
    echo -e "${YELLOW}📦 Copying WASM modules to public directory...${NC}"
    mkdir -p public/wasm/python public/wasm/rust
    cp -r wasm-modules/python-analyzer/build/* public/wasm/python/
    cp -r wasm-modules/rust-converter/build/* public/wasm/rust/
    echo -e "${GREEN}✅ WASM modules copied to public directory${NC}"
}

# Setup with Docker Compose (Quick Start)
setup_docker_compose() {
    echo -e "${BLUE}🐳 Setting up with Docker Compose...${NC}"
    
    # Build WASM modules first
    build_wasm_modules
    
    # Build and start services
    docker-compose up --build -d
    
    echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
    sleep 30
    
    echo -e "${GREEN}✅ Docker Compose setup complete!${NC}"
    echo -e "${GREEN}🌐 Frontend: http://localhost:5173${NC}"
    echo -e "${BLUE}📄 Python WASM: http://localhost:8080/python/${NC}"
    echo -e "${BLUE}🦀 Rust WASM: http://localhost:8081/rust/${NC}"
}

# Setup with Minikube
setup_minikube() {
    echo -e "${BLUE}☸️  Setting up with Minikube...${NC}"
    
    # Start Minikube
    echo -e "${YELLOW}🚀 Starting Minikube...${NC}"
    minikube start --memory=4096 --cpus=2
    
    # Enable addons
    minikube addons enable ingress
    
    # Build WASM modules
    build_wasm_modules
    
    # Build Docker images
    echo -e "${YELLOW}🏗️  Building Docker images...${NC}"
    eval $(minikube docker-env)
    
    docker build -t exam-converter/frontend:latest .
    docker build -t exam-converter/python-wasm:latest ./wasm-modules/python-analyzer
    docker build -t exam-converter/rust-wasm:latest ./wasm-modules/rust-converter
    
    echo -e "${GREEN}✅ Docker images built${NC}"
    
    # Deploy to Kubernetes
    echo -e "${YELLOW}🚀 Deploying to Kubernetes...${NC}"
    kubectl apply -f k8s/
    
    # Wait for deployments
    echo -e "${YELLOW}⏳ Waiting for deployments to be ready...${NC}"
    kubectl wait --for=condition=available --timeout=300s deployment --all -n exam-converter
    
    # Setup ingress
    MINIKUBE_IP=$(minikube ip)
    echo -e "${YELLOW}🌐 Adding exam-converter.local to /etc/hosts...${NC}"
    
    # Check if entry already exists
    if ! grep -q "exam-converter.local" /etc/hosts; then
        echo "$MINIKUBE_IP exam-converter.local" | sudo tee -a /etc/hosts
    else
        echo -e "${YELLOW}⚠️  exam-converter.local already exists in /etc/hosts${NC}"
    fi
    
    echo -e "${GREEN}✅ Minikube setup complete!${NC}"
    echo -e "${GREEN}🌐 Application: http://exam-converter.local${NC}"
}

# Setup with Kind
setup_kind() {
    echo -e "${BLUE}🔧 Setting up with Kind...${NC}"
    
    # Create Kind cluster with ingress support
    echo -e "${YELLOW}🚀 Creating Kind cluster...${NC}"
    cat <<EOF | kind create cluster --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
EOF
    
    # Install NGINX Ingress Controller
    echo -e "${YELLOW}📡 Installing NGINX Ingress Controller...${NC}"
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
    
    # Wait for ingress controller
    kubectl wait --namespace ingress-nginx \
      --for=condition=ready pod \
      --selector=app.kubernetes.io/component=controller \
      --timeout=90s
    
    # Build WASM modules
    build_wasm_modules
    
    # Build and load images
    echo -e "${YELLOW}🏗️  Building Docker images...${NC}"
    docker build -t exam-converter/frontend:latest .
    docker build -t exam-converter/python-wasm:latest ./wasm-modules/python-analyzer
    docker build -t exam-converter/rust-wasm:latest ./wasm-modules/rust-converter
    
    echo -e "${YELLOW}📦 Loading images into Kind...${NC}"
    kind load docker-image exam-converter/frontend:latest
    kind load docker-image exam-converter/python-wasm:latest
    kind load docker-image exam-converter/rust-wasm:latest
    
    # Deploy application
    echo -e "${YELLOW}🚀 Deploying to Kubernetes...${NC}"
    kubectl apply -f k8s/
    
    # Wait for deployments
    kubectl wait --for=condition=available --timeout=300s deployment --all -n exam-converter
    
    # Setup hosts file
    echo -e "${YELLOW}🌐 Adding exam-converter.local to /etc/hosts...${NC}"
    if ! grep -q "exam-converter.local" /etc/hosts; then
        echo "127.0.0.1 exam-converter.local" | sudo tee -a /etc/hosts
    else
        echo -e "${YELLOW}⚠️  exam-converter.local already exists in /etc/hosts${NC}"
    fi
    
    echo -e "${GREEN}✅ Kind setup complete!${NC}"
    echo -e "${GREEN}🌐 Application: http://exam-converter.local${NC}"
}

# Development mode (local npm dev server)
setup_development() {
    echo -e "${BLUE}💻 Setting up development environment...${NC}"
    
    # Build WASM modules
    build_wasm_modules
    
    # Install npm dependencies
    echo -e "${YELLOW}📦 Installing npm dependencies...${NC}"
    npm install
    
    # Start development server
    echo -e "${YELLOW}🚀 Starting development server...${NC}"
    npm run dev &
    
    echo -e "${GREEN}✅ Development setup complete!${NC}"
    echo -e "${GREEN}🌐 Application: http://localhost:5173${NC}"
    echo -e "${BLUE}💡 WASM modules are served from public/wasm/ directory${NC}"
}

# Cleanup function
cleanup() {
    echo -e "${BLUE}🧹 Cleanup options:${NC}"
    echo "1) Stop Docker Compose"
    echo "2) Delete Minikube cluster"
    echo "3) Delete Kind cluster"
    echo "4) Clean WASM build files"
    echo "5) Remove /etc/hosts entries"
    echo ""
    read -p "Enter your choice (1-5): " cleanup_choice
    
    case $cleanup_choice in
        1)
            docker-compose down
            echo -e "${GREEN}✅ Docker Compose stopped${NC}"
            ;;
        2)
            minikube delete
            echo -e "${GREEN}✅ Minikube cluster deleted${NC}"
            ;;
        3)
            kind delete cluster
            echo -e "${GREEN}✅ Kind cluster deleted${NC}"
            ;;
        4)
            rm -rf wasm-modules/*/build public/wasm
            echo -e "${GREEN}✅ WASM build files cleaned${NC}"
            ;;
        5)
            sudo sed -i '/exam-converter.local/d' /etc/hosts
            echo -e "${GREEN}✅ /etc/hosts entries removed${NC}"
            ;;
        *)
            echo -e "${RED}❌ Invalid choice${NC}"
            ;;
    esac
}

# Main menu
main() {
    check_prerequisites
    
    echo ""
    echo -e "${BLUE}🎯 Exam Document Converter - Client-Side WASM Application${NC}"
    echo -e "${BLUE}Choose deployment method:${NC}"
    echo "1) Development Mode (npm dev server)"
    echo "2) Docker Compose (Quick Start)"
    echo "3) Minikube (Full Kubernetes)"
    echo "4) Kind (Lightweight Kubernetes)"
    echo "5) Cleanup"
    echo ""
    read -p "Enter your choice (1-5): " choice
    
    case $choice in
        1)
            setup_development
            ;;
        2)
            setup_docker_compose
            ;;
        3)
            setup_minikube
            ;;
        4)
            setup_kind
            ;;
        5)
            cleanup
            ;;
        *)
            echo -e "${RED}❌ Invalid choice. Please run the script again.${NC}"
            exit 1
            ;;
    esac
    
    if [ $choice -ne 5 ]; then
        echo ""
        echo -e "${GREEN}🎉 Setup complete! Your Client-Side WASM Exam Document Converter is ready!${NC}"
        echo ""
        echo -e "${BLUE}📚 How it works:${NC}"
        echo "1. 🎯 Select an exam type (NEET, JEE, UPSC, CAT, GATE)"
        echo "2. 📁 Upload your documents (drag & drop or click to browse)"
        echo "3. 🔄 Click 'Convert Documents' to process them client-side"
        echo "4. 📥 Download the converted files"
        echo ""
        echo -e "${BLUE}🔧 Key Features:${NC}"
        echo "• 🌐 100% Client-Side Processing (No server uploads)"
        echo "• 🐍 Python WASM for intelligent file analysis & renaming"
        echo "• 🦀 Rust WASM for high-performance document conversion"
        echo "• 🔒 Privacy-First (Files never leave your browser)"
        echo "• ⚡ Fast processing with WebAssembly"
        echo ""
        echo -e "${BLUE}🔧 Troubleshooting:${NC}"
        echo "- Check browser console for WASM loading errors"
        echo "- Ensure WASM files are served with correct MIME types"
        echo "- Verify CORS headers for WASM module loading"
        echo "- For Kubernetes: kubectl logs -f deployment/<service-name> -n exam-converter"
    fi
}

# Run main function
main "$@"