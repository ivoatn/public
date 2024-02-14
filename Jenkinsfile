pipeline {
    agent any
   
    triggers {
        githubPush()
    }
    
    parameters {
        string(name: 'RELEASE_VERSION', defaultValue: 'latest', description: 'Release version to deploy')
        string(name: 'KUBE_DEPLOYMENT_NAMESPACE', defaultValue: 'default', description: 'Kubernetes namespace for deployment')
        booleanParam(defaultValue: false, description: 'Fail the pipeline?', name: 'FAIL_PIPELINE')
    }
    
    environment {
        SONAR_TOKEN = credentials('SONAR_TOKEN')
        DOCKER_REGISTRY = "registry.digitalocean.com/jenkins-test-repository"
        DOCKER_IMAGE_NAME = "nginx-simple"
        PREVIOUS_DIGEST = sh(script: "docker image inspect --format='{{index .RepoDigests 0}}' ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${RELEASE_VERSION}", returnStdout: true).trim()
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
                    sh "docker build -t ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${RELEASE_VERSION} ."

                    // Log in to Digital Ocean registry
                    sh "doctl registry login"

                    // Push Docker image to Digital Ocean registry
                    sh "docker push ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${RELEASE_VERSION}"
                }
            }
        }

        stage('Security Scan with Trivy') {
            steps {
                script {
                    // Scan Docker image for vulnerabilities using Trivy
                    sh "trivy image ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${RELEASE_VERSION}"
                }
            }
        }

        stage('Canary Deployment') {
            steps {
                script {
                    try {
                        // Determine active deployment
                        ACTIVE_DEPLOYMENT = sh(script: 'kubectl get deployments --sort-by="{.spec.replicas}" -o=jsonpath="{.items[1].metadata.name}"', returnStdout: true).trim()

                        // Determine inactive deployment
                        INACTIVE_DEPLOYMENT = sh(script: 'kubectl get deployments --sort-by="{.spec.replicas}" -o=jsonpath="{.items[0].metadata.name}"', returnStdout: true).trim()

                        // Gradually scale down the active deployment and scale up the inactive deployment
                        sh "kubectl scale deployment $ACTIVE_DEPLOYMENT --replicas=2"
                        sh "kubectl scale deployment $INACTIVE_DEPLOYMENT --replicas=1"
                        sleep 60
                        sh "kubectl scale deployment $ACTIVE_DEPLOYMENT --replicas=1"
                        sh "kubectl scale deployment $INACTIVE_DEPLOYMENT --replicas=2"
                        sleep 60
                        sh "kubectl scale deployment $ACTIVE_DEPLOYMENT --replicas=0"
                        sh "kubectl scale deployment $INACTIVE_DEPLOYMENT --replicas=3"
                    } catch (Exception e) {
                        echo "Canary deployment failed: ${e.message}"
                        // Revert to the previous digest if canary deployment fails
                        rollBackDeployment()
                    }
                }
            }
        }

        stage('Performance Test') {
            parallel {
                stage('Performance Tests with k6') {
                    steps {
                        script {
                            try {
                                // Run k6 performance tests
                                sh 'k6 run basic-perftest.js'
                            } catch (Exception e) {
                                echo "k6 performance test failed: ${e.message}"
                                rollBackDeployment()
                            }
                        }
                    }
                }
            }
                stage('Performance Tests with JMeter') {
                    steps {
                        script {
                            try {
                                // Run JMeter test with Performance Plugin
                                performance tests([
                                    jmxFile: 'performance-test.jmx', // This assumes the file is in the root of the workspace
                                    scenarioName: 'My Performance Test',
                                    reportsDirectory: 'performance_reports'
                                ])

                    // Check for failures in reports
                                if (findMatches(text: readFile('performance_reports/summary.txt'), pattern: 'FAILED').count > 0) {
                                    echo "Performance test failed!"
                                    rollBackDeployment()
                                } else {
                                    echo "Performance test passed."
                                }
                            } catch (Exception e) {
                                echo "JMeter test failed: ${e.message}"
                                rollBackDeployment()
                        }
                    }
                }
            }
        }
        stage('Verify Deployment') {
            steps {
                script {
                    try {
                        // Verify deployment
                        sh "kubectl get deployment $ACTIVE_DEPLOYMENT -o=jsonpath='{.spec.replicas}' | grep -q '0'"
                    } catch (Exception e) {
                        echo "Deployment verification failed: ${e.message}"
                        rollBackDeployment()
                    }
                }
            }
        }
        stage('Verify Endpoint') {
            steps {
                script {
                    try {
                        // Verify endpoint availability
                        sh 'curl -I http://spicy.kebab.solutions:31000 | grep -q "200 OK"'
                    } catch (Exception e) {
                        echo "Endpoint verification failed: ${e.message}"
                        if (params.FAIL_PIPELINE) {
                            echo "Failing the pipeline as per request..."
                            failPipeline()
                        } else {
                            echo "Rolling back deployment..."
                            rollBackDeployment()
                            currentBuild.result = 'FAILURE'
                            error "Pipeline failed due to endpoint verification failure"
                        }
                    }
                }
            }
        }
    }
}

def rollBackDeployment() {
    sh "kubectl set image deployment/${ACTIVE_DEPLOYMENT} ${DOCKER_IMAGE_NAME}=${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}@${PREVIOUS_DIGEST}"
}

def failPipeline() {
    error 'Pipeline failed as per request.'
}
