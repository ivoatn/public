pipeline {
    agent any

    environment {
        SONAR_TOKEN = credentials('SONAR_TOKEN')
        DOCKER_REGISTRY = "registry.digitalocean.com/jenkins-test-repository"
        DOCKER_IMAGE_NAME = "nginx-simple"
        DOCKER_TAG = "latest"
        KUBE_DEPLOYMENT_NAMESPACE = "default"
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
                    sh "docker build -t ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${DOCKER_TAG} ."
                    sh "doctl registry login"
                    sh "docker push ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${DOCKER_TAG}"
                }
            }
        }

        stage('Security Scan with Trivy') {
            steps {
                script {
                    sh "trivy image ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${DOCKER_TAG}"
                }
            }
        }

        stage('Canary Deployment') {
            steps {
                script {
                    def activeDeployment = sh(script: 'kubectl get deployments --sort-by="{.spec.replicas}" -o=jsonpath="{.items[1].metadata.name}"', returnStdout: true).trim()
                    def inactiveDeployment = sh(script: 'kubectl get deployments --sort-by="{.spec.replicas}" -o=jsonpath="{.items[0].metadata.name}"', returnStdout: true).trim()

                    deployCanary(activeDeployment, inactiveDeployment)
                }
            }
        }

        stage('Performance Test') {
            steps {
                script {
                    sh 'k6 run basic-perftest.js'
                }
            }
        }

        stage('Verify Image') {
            steps {
                script {
                    def activeDeployment = sh(script: "kubectl get deployment -n ${KUBE_DEPLOYMENT_NAMESPACE} -l app=${DOCKER_IMAGE_NAME} -o=jsonpath='{.items[0].metadata.name}'", returnStdout: true).trim()
                    assert sh(script: "kubectl get deployment ${activeDeployment} -o=jsonpath='{.spec.template.spec.containers[0].image}' | grep -q ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${DOCKER_TAG}", returnStatus: true) == 0
                }
            }
        }

        stage('Verify Deployment Scaling') {
            steps {
                script {
                    def activeDeployment = sh(script: "kubectl get deployment -n ${KUBE_DEPLOYMENT_NAMESPACE} -l app=${DOCKER_IMAGE_NAME} -o=jsonpath='{.items[0].metadata.name}'", returnStdout: true).trim()
                    assert sh(script: "kubectl get deployment ${activeDeployment} -o=jsonpath='{.spec.replicas}' | grep -q '0'", returnStatus: true) == 0
                }
            }
        }

        stage('Verify Endpoint') {
            steps {
                script {
                    sh 'curl -I http://spicy.kebab.solutions:31000 | grep -q "200 OK"'
                }
            }
        }
    }
}

def deployCanary(activeDeployment, inactiveDeployment) {
    sh "kubectl scale deployment ${activeDeployment} --replicas=2"
    sh "kubectl scale deployment ${inactiveDeployment} --replicas=1"
    sleep 10
    sh "kubectl scale deployment ${activeDeployment} --replicas=1"
    sh "kubectl scale deployment ${inactiveDeployment} --replicas=2"
    sleep 10
    sh "kubectl scale deployment ${activeDeployment} --replicas=0"
    sh "kubectl scale deployment ${inactiveDeployment} --replicas=3"
}
