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

                stage('Canary Deployment') {
                    steps {
                        script {
                            // Determine the active deployment
                            ACTIVE_DEPLOYMENT = sh(script: 'kubectl get deployments -o=jsonpath="{.items[0].metadata.name}"', returnStdout: true).trim()

                            for (int i = 3; i >= 1; i--) {
                                // Determine the inactive deployment
                                INACTIVE_DEPLOYMENT = sh(script: 'kubectl get deployments -o=jsonpath="{.items[0].metadata.name}"', returnStdout: true).trim()

                                // Scale down the active deployment
                                sh "kubectl scale deployment $ACTIVE_DEPLOYMENT --replicas=$i"

                                // Scale up the inactive deployment
                                sh "kubectl scale deployment $INACTIVE_DEPLOYMENT --replicas=$((4 - $i))"

                                // Wait for some time (adjust as needed)
                                sleep 30
                            }
                        }
                    }
                }
            }
        }

        stage('Verify Image') {
            steps {
                script {
                    // Verify the image using SHA256
                    sh "docker pull ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${DOCKER_TAG}"
                    sh "docker inspect --format='{{index .RepoDigests 0}}' ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${DOCKER_TAG} | grep -q SHA256"
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                script {
                    // Verify deployment details
                    sh "kubectl get deployment $ACTIVE_DEPLOYMENT -o=json | jq -r '.spec.replicas' | grep -q 2"
                    sh "kubectl get deployment $INACTIVE_DEPLOYMENT -o=json | jq -r '.spec.replicas' | grep -q 1"
                }
            }
        }

        stage('Verify Endpoint') {
            steps {
                script {
                    // Verify if the endpoint is accessible and returns status code 200
                    sh 'curl -s -o /dev/null -w "%{http_code}" http://spicy.kebab.solutions:31000 | grep -q 200'
                }
            }
        }
    }
}
