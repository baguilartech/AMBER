# GitLab-Kubernetes Integration Features

This document covers all the GitLab-Kubernetes integration features enabled by the GitLab Agent, based on the official GitLab documentation.

## 🎯 Overview

The GitLab Agent for Kubernetes provides a comprehensive integration between GitLab and your Kubernetes cluster, enabling:

- **GitOps deployments** - Automatic sync of manifests
- **CI/CD deployments** - Pipeline-based deployments  
- **User access** - Direct kubectl access via GitLab UI
- **Environment tracking** - Visual deployment history
- **Kubernetes dashboard** - Integrated cluster management

## 📋 Current Configuration

### Agent Configuration (`.gitlab/agents/production/config.yaml`)

Our production agent enables four main access patterns:

1. **GitOps Access** - Automatic manifest sync
2. **CI/CD Access** - Pipeline deployments
3. **User Access** - Team member kubectl access
4. **Observability** - Logging and monitoring

## 🚀 GitOps Deployments

**Reference:** [GitLab GitOps Documentation](https://docs.gitlab.com/user/clusters/agent/gitops.html)

### How It Works
- Agent monitors `k8s/` directory for changes
- Automatically syncs manifest changes to cluster
- Supports YAML and JSON Kubernetes manifests
- Provides reconciliation and drift detection

### Configuration
```yaml
gitops:
  manifest_projects:
  - id: baguilartech/amber
    default_namespace: amber
    paths:
    - glob: 'k8s/**/*.yaml'
    - glob: 'k8s/**/*.yml'
```

### Usage
```bash
# Make changes to any file in k8s/ directory
echo "replicas: 2" >> k8s/deployment.yaml

# Commit and push to main branch
git add k8s/deployment.yaml
git commit -m "Scale to 2 replicas"
git push origin main

# Agent automatically syncs within 1-2 minutes
```

## 🔄 CI/CD Deployments

**Reference:** [GitLab CI/CD Kubernetes Documentation](https://docs.gitlab.com/user/clusters/agent/ci_cd_workflow.html)

### How It Works
- CI/CD jobs can deploy directly to cluster via agent
- No need to store kubeconfig or certificates
- Secure authentication through GitLab agent
- Supports both manual and automatic deployments

### Configuration
```yaml
ci_access:
  projects:
  - id: baguilartech/amber
    default_namespace: amber
    access_as:
      agent: {}
```

### Usage
```bash
# In GitLab: CI/CD → Pipelines
# Run "deploy_production" job
# Job connects to cluster via agent automatically
```

## 👥 User Access & kubectl Integration

**Reference:** [User Access Documentation](https://docs.gitlab.com/user/clusters/agent/user_access/)

### How It Works
- GitLab users can access Kubernetes directly through GitLab UI
- No need to configure individual kubeconfig files
- Permissions based on GitLab project/group roles
- Supports both web-based terminal and kubectl commands

### Configuration
```yaml
user_access:
  access_as:
    agent: {}
  projects:
  - id: baguilartech/amber
    default_namespace: amber
  groups:
  - id: baguilartech
    default_namespace: amber
```

### Access Methods

#### 1. Web-Based Terminal
1. Go to **Infrastructure** → **Kubernetes clusters**
2. Select **production** cluster
3. Click **Terminal** button
4. Run kubectl commands directly in browser

#### 2. Local kubectl Access
```bash
# Get agent token for local access (if configured)
kubectl config set-cluster production --server=https://kas.gitlab.com/k8s-proxy/
kubectl config set-credentials gitlab-agent --token=<agent-token>
kubectl config set-context production --cluster=production --user=gitlab-agent
kubectl config use-context production
```

### Permissions

| GitLab Role | Kubernetes Access |
|-------------|------------------|
| Guest | No access |
| Reporter | Read-only access |
| Developer | Read/Write in default namespace |
| Maintainer | Read/Write in all namespaces |
| Owner | Full cluster access |

## 🌍 Environment Integration

**Reference:** [GitLab Environments Documentation](https://docs.gitlab.com/ci/environments/)

### How It Works
- Environments provide visual deployment tracking
- Shows deployment history and status
- Links deployments to GitLab issues and merge requests
- Enables environment-specific deployment strategies

### Current Environment Configuration
```yaml
environment:
  name: production
  url: https://rancher.kubernetes.DOMAIN.com  # Cluster monitoring dashboard
  kubernetes:
    namespace: amber
  deployment_tier: production
  action: start
```

**Note:** AMBER is a Discord bot (not a web application), so the environment URL points to the Rancher cluster management dashboard where you can monitor the bot's pod status, logs, and resource usage.

### Features Available

#### 1. Deployment History
- View all deployments to production environment
- See which commit/pipeline triggered each deployment
- Track deployment duration and status

#### 2. Environment Dashboard
Navigate to **Deployments** → **Environments** to see:
- Current environment status
- Recent deployments
- Environment-specific metrics
- Quick links to logs and monitoring

#### 3. Environment Actions
- **Deploy**: Manual deployment triggers
- **Stop**: Environment shutdown
- **Restart**: Rolling restart of services

## 🎛️ Kubernetes Dashboard Integration

**Reference:** [Kubernetes Dashboard Documentation](https://docs.gitlab.com/ci/environments/kubernetes_dashboard/)

### Access Dashboard

#### Option 1: Through GitLab UI
1. Go to **Infrastructure** → **Kubernetes clusters**
2. Select **production** cluster  
3. Click **Kubernetes dashboard** button
4. GitLab proxies connection securely

#### Option 2: Direct Dashboard Access
```bash
# If you have local kubectl access
kubectl proxy
# Open http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
```

### Dashboard Features
- **Cluster Overview** - Resource usage and health
- **Workload Management** - Deployments, pods, services
- **Configuration** - ConfigMaps, secrets, ingress
- **Storage** - Persistent volumes and claims
- **RBAC** - Roles and permissions

## 🔧 Advanced Features

### 1. Multi-Environment Support
Extend configuration for staging/development:

```yaml
# .gitlab/agents/staging/config.yaml
gitops:
  manifest_projects:
  - id: baguilartech/amber
    default_namespace: amber-staging
    paths:
    - glob: 'k8s/staging/**/*.yaml'
```

### 2. Namespace Isolation
Restrict agent access to specific namespaces:

```yaml
ci_access:
  projects:
  - id: baguilartech/amber
    default_namespace: amber
    environments:
    - name: production
      namespace: amber
    - name: staging  
      namespace: amber-staging
```

### 3. Custom RBAC
Create custom roles for specific access patterns:

```yaml
user_access:
  projects:
  - id: baguilartech/amber
    default_namespace: amber
    access_as:
      ci_user: {}  # Custom service account
```

## 🛠️ Troubleshooting

### Agent Connection Issues

**Check agent status:**
```bash
kubectl get pods -n gitlab-agent
kubectl logs -n gitlab-agent deployment/gitlab-agent
```

**Common issues:**
- Invalid token (regenerate in GitLab)
- Network connectivity (check kas.gitlab.com access)
- RBAC permissions (verify service account)

### User Access Issues

**Verify configuration:**
```bash
# Check if user has access
# Go to Infrastructure → Kubernetes clusters → production
# Look for "Terminal" and "Kubernetes dashboard" buttons
```

**Common issues:**
- Insufficient GitLab role (need Developer+)
- Project/group not in agent config
- Agent not connected

### Environment Not Showing

**Verify environment configuration:**
- Check `environment:` block in CI/CD job
- Ensure agent is connected
- Run deployment job to create environment

## 📊 Monitoring and Observability

### Agent Metrics
Monitor agent health through:
- GitLab cluster dashboard
- Agent pod logs
- GitLab CI/CD environment status

### Deployment Tracking
Track deployments via:
- GitLab Environments dashboard
- Environment deployment history
- Integration with monitoring tools (Grafana, Sentry)

## 📚 Additional Resources

- [GitLab Agent Documentation](https://docs.gitlab.com/user/clusters/agent/)
- [User Access Guide](https://docs.gitlab.com/user/clusters/agent/user_access/)
- [CI/CD Workflow](https://docs.gitlab.com/user/clusters/agent/ci_cd_workflow.html)
- [Environment Management](https://docs.gitlab.com/ci/environments/)
- [Kubernetes Dashboard](https://docs.gitlab.com/ci/environments/kubernetes_dashboard/)

---

**Next Steps:** With this comprehensive integration, your team can now leverage GitLab as a complete Kubernetes management platform, providing GitOps, CI/CD, user access, and environment tracking all in one unified interface. 