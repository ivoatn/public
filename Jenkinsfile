pipeline {
    agent any

    environment {
        SONAR_TOKEN = credentials('SONAR_TOKEN')
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
                    withSonarQubeEnv('SonarCloud') {
                        // Run SonarQube analysis
                        sh "${SONARQUBE_SCANNER_HOME}/bin/sonar-scanner " +
                           "-Dsonar.organization=ivoatn " +
                           "-Dsonar.projectKey=ivoatn_public " +
                           "-Dsonar.sources=. " +
                           "-Dsonar.host.url=https://sonarcloud.io " +
                           "-Dsonar.login=${SONAR_TOKEN}"
                    }
                }
            }
        }

        stage('Build') {
            steps {
                echo 'Building...'
                // Your build steps here
            }
        }

        // ... (additional stages)
    }
}
