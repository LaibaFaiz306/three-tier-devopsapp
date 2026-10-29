pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerhub-creds')
    }

    stages {
        stage('Build & Push Backend') {
            steps {
                sh '''
                    echo "$DOCKERHUB_CREDENTIALS_PSW" | docker login -u "$DOCKERHUB_CREDENTIALS_USR" --password-stdin
                    docker build -t laibafaiz306/galaxy-backend:latest ./backend
                    docker push laibafaiz306/galaxy-backend:latest
                '''
            }
        }

        stage('Build & Push Frontend') {
            steps {
                sh '''
                    docker build -t laibafaiz306/galaxy-frontend:latest ./frontend
                    docker push laibafaiz306/galaxy-frontend:latest
                '''
            }
        }

        stage('Deploy to EC2') {
            steps {
                sh '''
                    # Stop and remove old running containers if they exist
                    docker stop galaxy-backend galaxy-frontend || true
                    docker rm galaxy-backend galaxy-frontend || true

                    # Run backend container
                    docker run -d --name galaxy-backend -p 5000:5000 laibafaiz306/galaxy-backend:latest

                    # Run frontend container
                    docker run -d --name galaxy-frontend -p 80:80 laibafaiz306/galaxy-frontend:latest
                '''
            }
        }
        }
    }
}
