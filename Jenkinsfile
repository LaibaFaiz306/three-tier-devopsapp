pipeline {
    agent any

    environment {
        DOCKERHUB_USER = 'laibafaiz306'          // <-- change this
        BACKEND_IMAGE  = "${DOCKERHUB_USER}/galaxy-backend"
        FRONTEND_IMAGE = "${DOCKERHUB_USER}/galaxy-frontend"
        IMAGE_TAG      = "${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Backend Tests') {
            steps {
                dir('backend') {
                    sh 'npm install'
                    sh 'npm test'
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh 'docker build -t $BACKEND_IMAGE:$IMAGE_TAG -t $BACKEND_IMAGE:latest ./backend'
                sh 'docker build -t $FRONTEND_IMAGE:$IMAGE_TAG -t $FRONTEND_IMAGE:latest ./frontend'
            }
        }

        stage('Push to Docker Hub') {
            steps {
                // Jenkins credential (Username with password), ID: dockerhub-creds
                withCredentials([usernamePassword(credentialsId: 'dockerhub-creds',
                                                  usernameVariable: 'DH_USER',
                                                  passwordVariable: 'DH_PASS')]) {
                    sh 'echo $DH_PASS | docker login -u $DH_USER --password-stdin'
                    sh 'docker push $BACKEND_IMAGE:$IMAGE_TAG'
                    sh 'docker push $BACKEND_IMAGE:latest'
                    sh 'docker push $FRONTEND_IMAGE:$IMAGE_TAG'
                    sh 'docker push $FRONTEND_IMAGE:latest'
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                // Jenkins credential (Secret file), ID: kubeconfig
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')]) {
                    sh '''
                        rm -rf k8s-out && cp -r k8s k8s-out
                        sed -i "s|YOUR_DOCKERHUB_USERNAME/galaxy-backend:latest|$BACKEND_IMAGE:$IMAGE_TAG|g" k8s-out/backend.yaml
                        sed -i "s|YOUR_DOCKERHUB_USERNAME/galaxy-frontend:latest|$FRONTEND_IMAGE:$IMAGE_TAG|g" k8s-out/frontend.yaml
                        kubectl apply -f k8s-out/
                        kubectl -n galaxy rollout status deployment/backend --timeout=120s
                        kubectl -n galaxy rollout status deployment/frontend --timeout=120s
                    '''
                }
            }
        }
    }

    post {
        always  { sh 'docker logout || true' }
        success { echo 'Pipeline finished successfully' }
        failure { echo 'Pipeline failed' }
    }
}
