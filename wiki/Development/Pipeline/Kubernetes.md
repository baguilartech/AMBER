# Kubernetes Deployment for AMBER Discord Bot

This directory contains Kubernetes manifests for deploying AMBER with full observability integration.

## 🔐 Security Notice

**No hardcoded IP addresses or secrets are stored in these files.** All sensitive values are injected via CI/CD variables during deployment.

## 📋 Required GitLab CI/CD Variables

Configure these in GitLab Project → Settings → CI/CD → Variables:

### Observability Stack
| Variable | Type | Description |
|----------|------|-------------|
| `ELK_HOST` | Masked | ELK stack IP address |
| `ELK_PORT` | Normal | ELK HTTP input port (default: 8080) |
| `GRAFANA_HOST` | Masked | Grafana IP address |
| `GRAFANA_API_TOKEN` | Masked | Grafana API token for annotations |

### GitLab Agent
| Variable | Type | Description |
|----------|------|-------------|
| `GITLAB_AGENT_TOKEN` | Masked | GitLab Agent token for cluster connection |

### Application Secrets
| Variable | Type | Description |
|----------|------|-------------|
| `DISCORD_TOKEN` | Masked | Discord bot token |
| `SPOTIFY_CLIENT_ID` | Masked | Spotify API client ID |
| `SPOTIFY_CLIENT_SECRET` | Masked | Spotify API client secret |
| `SENTRY_DSN` | Masked | Sentry error tracking DSN |

### Error Tracking
| Variable | Type | Description |
|----------|------|-------------|
| `SENTRY_AUTH_TOKEN` | Masked | Sentry CLI authentication token |
| `SENTRY_ORG` | Masked | Sentry organization name |
| `SENTRY_PROJECT` | Masked | Sentry project name |

## 🏗️ Files Overview

### Core Manifests
- `namespace.yaml` - Creates the `amber` namespace
- `configmap.yaml` - Application configuration (no secrets)
- `secret.yaml` - Template for secrets (populated by CI/CD)
- `deployment.yaml` - Main application deployment
- `service.yaml` - Kubernetes services with monitoring annotations
- `pvc.yaml` - Persistent volume claim for data storage

### Observability
- `filebeat-sidecar.yaml` - Log shipping to ELK stack

### Deployment
- `deploy.sh` - Deployment script that injects CI/CD variables
- `README.md` - This documentation

## 🚀 Deployment Process

### Manual Deployment
```bash
# Set environment variables
export ELK_HOST="your-elk-ip"
export ELK_PORT="8080"
export GRAFANA_HOST="your-grafana-ip"
export DISCORD_TOKEN="your-discord-token"
export SPOTIFY_CLIENT_ID="your-spotify-id"
export SPOTIFY_CLIENT_SECRET="your-spotify-secret"
export SENTRY_DSN="your-sentry-dsn"

# Deploy
./deploy.sh
```

### CI/CD Deployment
The deployment happens via GitLab Agent when:
1. Code is pushed to `main` branch (GitOps sync)
2. `deploy_production` job is manually triggered (CI/CD deployment)
3. CI/CD variables are properly configured
4. GitLab Agent is connected to the cluster

## 🔍 Verification

After deployment, verify everything is working:

```bash
# Check pods
kubectl get pods -n amber

# Check services
kubectl get services -n amber

# Check logs
kubectl logs -f deployment/amber-discord-bot -n amber

# Check health
kubectl port-forward svc/amber-discord-bot 3001:3001 -n amber
curl http://localhost:3001/health
```

## 📊 Monitoring Integration

The deployment automatically integrates with your observability stack:

- **Prometheus** scrapes metrics from `/metrics` endpoint
- **Grafana** displays dashboards and receives pipeline annotations
- **ELK Stack** receives logs via Filebeat
- **Sentry** tracks errors and releases
- **GitLab Agent** manages GitOps deployment and CI/CD integration

## 🔒 Security Best Practices

1. All secrets are stored as GitLab CI/CD variables (masked)
2. No IP addresses are committed to the repository
3. Environment variables are injected during deployment
4. Temporary files are cleaned up after deployment
5. RBAC is configured for least privilege access