# Deployment Guide (AWS / Azure / GCP / Alibaba)

## 1. Production Baseline

Recommended baseline for any cloud:

- Backend: containerized Django API (Gunicorn) behind HTTPS load balancer
- Database: managed Postgres
- Media uploads: object storage (S3 / Azure Blob / GCS / OSS)
- Frontend: static hosting (CDN + object storage) or containerized Nginx

## 2. Environment Variables

Backend must be configured via environment variables (examples):

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG=false`
- `DJANGO_ALLOWED_HOSTS=yourdomain.com`
- `CORS_ALLOWED_ORIGINS=https://yourdomain.com`
- `JWT_ACCESS_MINUTES=60`
- `JWT_REFRESH_DAYS=7`
- SMTP settings (optional for report share):
  - `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `DEFAULT_FROM_EMAIL`

## 3. Database

Local uses SQLite. For production:

- Use Postgres
- Run migrations during deployment
- Configure backups and PITR

## 4. Frontend Deployment

Option A (static):

1. Run `npm ci && npm run build`
2. Upload `frontend/dist/` to object storage bucket
3. Serve via CDN

Option B (container):

1. Build image with Nginx serving `dist/`
2. Deploy to container service

## 5. Backend Deployment

Use:

- Gunicorn (WSGI) for Django
- Reverse proxy/ingress for HTTPS

Typical pipeline:

1. Build container image
2. Apply migrations
3. Start API service

## 6. AWS (Amazon Cloud)

### Recommended

- Frontend: S3 + CloudFront
- Backend: ECS Fargate (or EKS) + ALB
- DB: RDS Postgres
- Media: S3 bucket

Steps (high-level):

1. Create RDS Postgres and security groups
2. Create S3 bucket for media and another for frontend
3. Build and push backend image to ECR
4. Create ECS Task Definition with env variables and IAM permissions for S3
5. Create ALB + Target Group + Listener (HTTPS)
6. Configure CloudFront to point to S3 (frontend) and/or ALB (API)

## 7. Azure

### Recommended

- Frontend: Azure Static Web Apps (or Blob + CDN)
- Backend: Azure Container Apps (or App Service for Containers)
- DB: Azure Database for PostgreSQL
- Media: Azure Blob Storage

Steps:

1. Provision Postgres and network access
2. Deploy backend container and configure environment variables
3. Upload frontend build to Static Web Apps or Blob container + CDN
4. Configure CORS origins and allowed hosts

## 8. Google Cloud (GCP)

### Recommended

- Frontend: Cloud Storage + Cloud CDN
- Backend: Cloud Run
- DB: Cloud SQL (Postgres)
- Media: Cloud Storage bucket

Steps:

1. Create Cloud SQL Postgres instance
2. Build and push backend container to Artifact Registry
3. Deploy to Cloud Run with env vars and Cloud SQL connection
4. Upload frontend build to Cloud Storage and enable CDN

## 9. Alibaba Cloud

### Recommended

- Frontend: OSS + CDN
- Backend: ACK (Kubernetes) or Serverless App Engine
- DB: ApsaraDB for RDS (Postgres)
- Media: OSS bucket

Steps:

1. Provision RDS Postgres and security settings
2. Deploy backend to ACK/SAE with environment variables
3. Upload frontend build to OSS and enable CDN
4. Configure domain + HTTPS

## 10. Operational Checklist

- Use HTTPS only
- Rotate secrets and JWT signing key
- Use Postgres and object storage
- Set up centralized logs and metrics
- Run migrations as a one-off job
- Configure CORS correctly

