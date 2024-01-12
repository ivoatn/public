pipeline {
    agent any

    environment {
        SONARQUBE_SCANNER_HOME = tool 'SonarCloud'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarCloud') {
                    script {
                        // Run SonarQube analysis
                        sh "${SONARQUBE_SCANNER_HOME}/bin/sonar-scanner -Dsonar.projectKey=Your_Project_Key"
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
