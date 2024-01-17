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

        stage('Deploy to Kubernetes - Apply') {
            steps {
                script {
                    // Apply Kubernetes manifest
                    sh 'kubectl apply -f kubernetes/pod.yaml'
                }
            }
        }

        stage('Verify Deployment and Service') {
            steps {
                script {
                    // Wait for pods to be ready
                    sh 'kubectl wait --for=condition=ready pod -l app=nginx --timeout=300s'

                    // Wait for NodePort to be ready
                    sh 'kubectl wait --for=condition=ready svc/nginx-nodeport-service --timeout=300s'
                }
            }
        }

        stage('Performance Tests with k6') {
            steps {
                script {
                    // Run k6 performance tests
                    sh 'k6 run basic-perftest.js'
                }
            }
        }

        stage('Clean up') {
            steps {
                script {
                    // Clean up resources
                    sh 'kubectl delete -f kubernetes/pod.yaml'
                }
            }
        }
    }
}
