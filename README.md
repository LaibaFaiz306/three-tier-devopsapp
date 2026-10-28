# Stellar: a 3D Galaxy Three-Tier App

Visitors plant a glowing star with a short message. Every star is saved in PostgreSQL and appears in a 3D spiral galaxy (Three.js) that everyone shares.

| Tier | Tech | Folder |
|------|------|--------|
| Presentation | Three.js 3D scene served by Nginx (also reverse-proxies `/api`) | `frontend/` |
| Application  | Node.js + Express REST API | `backend/` |
| Data         | PostgreSQL 15 | `docker-compose.yml`, `k8s/02-postgres.yaml` |

```
Browser ──► Nginx (frontend) ──/api──► Express (backend) ──► PostgreSQL (volume)
```
Three.js is bundled in `frontend/public/vendor/`, so no CDN or internet is needed at runtime.

## 1. Docker Compose (Docker volume)
```bash
docker compose up -d --build
# open http://localhost:8080
docker volume ls
docker compose down        # stars are KEPT (volume)
docker compose up -d
docker compose down -v     # deletes the volume (stars lost)
```

## 2. Build & push images
```bash
export DH=YOUR_DOCKERHUB_USERNAME
docker build -t $DH/galaxy-backend:latest  ./backend
docker build -t $DH/galaxy-frontend:latest ./frontend
docker login
docker push $DH/galaxy-backend:latest
docker push $DH/galaxy-frontend:latest
```

## 3. Kubernetes (minikube / kind / any cluster)
1. Replace `YOUR_DOCKERHUB_USERNAME` in `k8s/backend.yaml` and `k8s/frontend.yaml`.
2. Deploy:
```bash
kubectl apply -f k8s/
kubectl -n galaxy get pods,svc,pvc
```
3. Open:
```bash
minikube service frontend -n galaxy --url     # minikube
# or http://<node-ip>:30080
# or kubectl -n galaxy port-forward svc/frontend 8080:80
```
Demos: scale (`kubectl -n galaxy scale deployment backend --replicas=4`), self-healing (`kubectl -n galaxy delete pod -l app=backend`), persistence (`kubectl -n galaxy delete pod -l app=postgres`: stars survive via the PVC), rolling updates, logs (`kubectl -n galaxy logs deploy/backend`).
Extras in `k8s-optional/`: Ingress and HorizontalPodAutoscaler.

## 4. Jenkins CI/CD
1. Push this repo to GitHub.
2. The Jenkins agent needs Docker, Node.js/npm and kubectl (Jenkins user in the `docker` group).
3. Add credentials: `dockerhub-creds` (Username/Password) and `kubeconfig` (Secret file).
4. Edit `DOCKERHUB_USER` in `Jenkinsfile`.
5. New Item → Pipeline → "Pipeline script from SCM" → your repo URL → branch `*/main` → Script Path `Jenkinsfile`.
6. Build Now. Stages: Checkout → Tests → Build → Push → Deploy to K8s.
   Optional: GitHub webhook (`http://<jenkins>/github-webhook/`) for automatic builds.

## 5. Push to GitHub
```bash
git init && git add . && git commit -m "Stellar 3D galaxy app"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

## API
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | liveness |
| GET | `/api/health/db` | DB connectivity (readiness) |
| GET | `/api/stars` | list stars |
| POST | `/api/stars` | `{ "name", "message", "color": "#rrggbb" }` |
