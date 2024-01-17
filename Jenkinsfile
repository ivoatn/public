pipeline {
    agent any

    environment {
        SONAR_TOKEN = credentials('SONAR_TOKEN')
        DOCKER_REGISTRY = "registry.digitalocean.com/jenkins-test-repository"
        DOCKER_IMAGE_NAME = "nginx-simple"
        DOCKER_TAG = "latest"  // You can use any tag you prefer
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('SonarQube Analysis') {
            steps {
                script {
                    // Run SonarQube analysis
                    sh "/opt/sonar-scanner/bin/sonar-scanner " +
                       "-Dsonar.organization=ivoatn " +
                       "-Dsonar.projectKey=ivoatn_public " +
                       "-Dsonar.sources=. " +
                       "-Dsonar.host.url=https://sonarcloud.io " +
                       "-Dsonar.login=${SONAR_TOKEN}"
                }
            }
        }

        stage('Build and Push Docker Image') {
            steps {
                script {
                    // Build and tag Docker image
                    sh "docker build -t ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${DOCKER_TAG} ."

                    // Log in to Digital Ocean registry
                    sh "doctl registry login"

                    // Push Docker image to Digital Ocean registry
                    sh "docker push ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${DOCKER_TAG}"
                }
            }
        }

        stage('Security Scan with Trivy') {
            steps {
                script {
                    // Scan Docker image for vulnerabilities using Trivy
                    sh "trivy image ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${DOCKER_TAG}"
                }
            }
        }

        stage('Deploy to Kubernetes - Apply') {
            steps {
                script {
                    // Apply Kubernetes manifest
                    sh 'kubectl apply -f kubernetes/pod.yaml'
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                script {
                    // Wait for pods to be ready
                    sh 'kubectl wait --for=condition=ready pod -l app=nginx --timeout=30s'
                }
            }
        }

        stage('Canary Deployment') {
            steps {
                script {
                    // Determine active deployment
                    ACTIVE_DEPLOYMENT = sh(script: 'kubectl get deployments -o=jsonpath="{.items[0].metadata.name}"', returnStdout: true).trim()

                    // Determine inactive deployment
                    INACTIVE_DEPLOYMENT = sh(script: 'kubectl get deployments -o=jsonpath="{.items[1].metadata.name}"', returnStdout: true).trim()

                    // Gradually scale down the active deployment and scale up the inactive deployment
                    for (def i = 0; i < 3; i++) {
                        sh "kubectl scale deployment $ACTIVE_DEPLOYMENT --replicas=\$((${3 - i}))"
                        sh "kubectl scale deployment $INACTIVE_DEPLOYMENT --replicas=\$((${4 - i}))"
                        sleep 30
                    }

                    // Switch active and inactive deployments
                    sh "kubectl patch service nginx-nodeport-service -p '{\"spec\":{\"selector\":{\"app\":\"nginx-canary\"}}}'"
                }
            }
        }

        stage('Parallel Steps') {
            parallel {
                stage('Performance Tests with k6') {
                    steps {
                        script {
                            // Run k6 performance tests
                            sh 'k6 run basic-perftest.js'
                        }
                    }
                }
            }
        }

        stage('Verify Image') {
            steps {
                script {
                    // Verify image by SHA256
                    sh "kubectl get deployment $ACTIVE_DEPLOYMENT -o=jsonpath='{.spec.template.spec.containers[0].image}' | grep -q ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${DOCKER_TAG}"
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                script {
                    // Verify deployment
                    sh "kubectl get deployment $ACTIVE_DEPLOYMENT -o=jsonpath='{.spec.replicas}' | grep -q '2'"
                }
            }
        }

        stage('Verify Endpoint') {
            steps {
                script {
                    // Verify endpoint availability
                    sh 'curl -I http://spicy.kebab.solutions:31000 | grep -q "200 OK"'
                }
            }
        }
    }
}
