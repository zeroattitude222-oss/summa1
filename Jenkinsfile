pipeline {
    agent any
    
    environment {
        DOCKER_REGISTRY = credentials('docker-registry-url')
        DOCKER_CREDENTIALS = credentials('docker-registry-credentials')
        KUBECONFIG = credentials('kubeconfig')
        APP_NAME = 'exam-converter'
        NAMESPACE = 'exam-converter'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.BUILD_VERSION = sh(
                        script: "echo ${BUILD_NUMBER}-${GIT_COMMIT.take(7)}",
                        returnStdout: true
                    ).trim()
                }
            }
        }
        
        stage('Build WASM Modules') {
            parallel {
                stage('Build Python WASM') {
                    steps {
                        script {
                            def pythonImage = docker.build(
                                "${DOCKER_REGISTRY}/${APP_NAME}/python-wasm:${BUILD_VERSION}",
                                "-f wasm-modules/python-analyzer/Dockerfile wasm-modules/python-analyzer"
                            )
                            docker.withRegistry("https://${DOCKER_REGISTRY}", DOCKER_CREDENTIALS) {
                                pythonImage.push()
                                pythonImage.push("latest")
                            }
                        }
                    }
                }
                
                stage('Build Rust WASM') {
                    steps {
                        script {
                            def rustImage = docker.build(
                                "${DOCKER_REGISTRY}/${APP_NAME}/rust-wasm:${BUILD_VERSION}",
                                "-f wasm-modules/rust-converter/Dockerfile wasm-modules/rust-converter"
                            )
                            docker.withRegistry("https://${DOCKER_REGISTRY}", DOCKER_CREDENTIALS) {
                                rustImage.push()
                                rustImage.push("latest")
                            }
                        }
                    }
                }
            }
        }
        
        stage('Build Frontend') {
            steps {
                script {
                    def frontendImage = docker.build(
                        "${DOCKER_REGISTRY}/${APP_NAME}/frontend:${BUILD_VERSION}",
                        "."
                    )
                    docker.withRegistry("https://${DOCKER_REGISTRY}", DOCKER_CREDENTIALS) {
                        frontendImage.push()
                        frontendImage.push("latest")
                    }
                }
            }
        }
        
        stage('Update Kubernetes Manifests') {
            steps {
                script {
                    // Update image tags in Kubernetes manifests
                    sh """
                        # Update frontend deployment
                        sed -i 's|image: exam-converter/frontend:.*|image: ${DOCKER_REGISTRY}/${APP_NAME}/frontend:${BUILD_VERSION}|g\' k8s/frontend-deployment.yaml
                        
                        # Update WASM module deployments
                        sed -i 's|image: exam-converter/python-wasm:.*|image: ${DOCKER_REGISTRY}/${APP_NAME}/python-wasm:${BUILD_VERSION}|g\' k8s/wasm-deployments.yaml
                        sed -i 's|image: exam-converter/rust-wasm:.*|image: ${DOCKER_REGISTRY}/${APP_NAME}/rust-wasm:${BUILD_VERSION}|g\' k8s/wasm-deployments.yaml
                    """
                }
            }
        }
        
        stage('Deploy to Kubernetes') {
            steps {
                script {
                    withKubeConfig([credentialsId: 'kubeconfig']) {
                        sh '''
                            # Apply namespace first
                            kubectl apply -f k8s/namespace.yaml
                            
                            # Apply ConfigMap
                            kubectl apply -f k8s/configmap.yaml
                            
                            # Apply WASM module deployments (for serving WASM files)
                            kubectl apply -f k8s/wasm-deployments.yaml
                            
                            # Apply frontend deployment
                            kubectl apply -f k8s/frontend-deployment.yaml
                            
                            # Apply ingress
                            kubectl apply -f k8s/ingress.yaml
                            
                            # Wait for deployments to be ready
                            kubectl rollout status deployment/frontend -n ${NAMESPACE} --timeout=300s
                            kubectl rollout status deployment/wasm-server -n ${NAMESPACE} --timeout=300s
                            
                            # Verify deployment
                            kubectl get pods -n ${NAMESPACE}
                            kubectl get services -n ${NAMESPACE}
                            kubectl get ingress -n ${NAMESPACE}
                        '''
                    }
                }
            }
        }
        
        stage('Health Check') {
            steps {
                script {
                    sh '''
                        # Wait for services to be ready
                        sleep 30
                        
                        # Get ingress URL
                        INGRESS_URL=$(kubectl get ingress exam-converter-ingress -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}' || echo "localhost")
                        
                        # Check frontend health
                        curl -f http://${INGRESS_URL}/ || echo "Frontend health check failed"
                        
                        # Check WASM modules availability
                        curl -f http://${INGRESS_URL}/wasm/python/ || echo "Python WASM not accessible"
                        curl -f http://${INGRESS_URL}/wasm/rust/ || echo "Rust WASM not accessible"
                    '''
                }
            }
        }
    }
    
    post {
        always {
            // Clean up Docker images to save space
            sh '''
                docker system prune -f
                docker image prune -f
            '''
        }
        success {
            echo "🎉 Deployment successful!"
            script {
                // Send success notification
                sh '''
                    echo "✅ Exam Document Converter deployed successfully!"
                    echo "🌐 Version: ${BUILD_VERSION}"
                    echo "📅 Deployed at: $(date)"
                '''
            }
        }
        failure {
            echo "❌ Deployment failed!"
            script {
                // Optionally rollback to previous version
                sh '''
                    echo "🔄 Consider rolling back to previous version if needed:"
                    echo "kubectl rollout undo deployment/frontend -n ${NAMESPACE}"
                '''
            }
        }
    }
}