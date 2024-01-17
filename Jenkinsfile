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

        stage('Canary Deployment') {
            steps {
                script {
                    // Determine active deployment
                    ACTIVE_DEPLOYMENT = sh(script: 'kubectl get deployments -o=jsonpath="{.items[0].metadata.name}"', returnStdout: true).trim()

                    // Determine inactive deployment
                    INACTIVE_DEPLOYMENT = sh(script: 'kubectl get deployments -o=jsonpath="{.items[1].metadata.name}"', returnStdout: true).trim()

                    // Gradually scale down the active deployment and scale up the inactive deployment
                        sh "kubectl scale deployment $ACTIVE_DEPLOYMENT --replicas=2"
                        sh "kubectl scale deployment $INACTIVE_DEPLOYMENT --replicas=1"
                        sh "wait 10"
                        sh "kubectl scale deployment $ACTIVE_DEPLOYMENT --replicas=1"
                        sh "kubectl scale deployment $INACTIVE_DEPLOYMENT --replicas=2"
                        sh "wait 10"
                        sh "kubectl scale deployment $ACTIVE_DEPLOYMENT --replicas=0"
                        sh "kubectl scale deployment $INACTIVE_DEPLOYMENT --replicas=3"
                    // Switch active and inactive deployments
                    sh "kubectl patch service nginx-nodeport-service -p '{\"spec\":{\"selector\":{\"app\":\"nginx-canary\"}}}'"
                }
            }
        }

        stage('Performance Test') {
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

        stage('Verify Deployment Scaling') {
            steps {
                script {
                    // Verify deployment
                    sh "kubectl get deployment $ACTIVE_DEPLOYMENT -o=jsonpath='{.spec.replicas}' | grep -q '0'"
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
