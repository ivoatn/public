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
                        sh "/opt/sonar-scanner/bin/sonar-scanner" +
                           "-Dsonar.organization=ivoatn " +
                           "-Dsonar.projectKey=ivoatn_public " +
                           "-Dsonar.sources=. " +
                           "-Dsonar.host.url=https://sonarcloud.io " +
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
}pipeline {
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
                        sh "/opt/sonar-scanner/bin/sonar-scanner" +
                           "-Dsonar.organization=ivoatn " +
                           "-Dsonar.projectKey=ivoatn_public " +
                           "-Dsonar.sources=. " +
                           "-Dsonar.host.url=https://sonarcloud.io " +
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
