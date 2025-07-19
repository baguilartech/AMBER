# GitLab Agent Setup for Production Environment

This guide walks through setting up the GitLab Agent for Kubernetes to enable proper environment integration with your production Kubernetes cluster.

## 🎯 Overview

The GitLab Agent provides native GitLab integration for Kubernetes deployments:

- **Environment Tracking** - Production environment visible in GitLab UI
- **Deployment History** - Track deployments in GitLab Environments
- **GitOps Integration** - Automatic sync from repository
- **Security** - No inbound connections to cluster required
- **Observability** - Native GitLab monitoring integration

## 📋 Prerequisites

✅ **Infrastructure Ready:**
- Kubernetes cluster (deployed via Terraform)
- GitLab project: `baguilartech/amber`

✅ **Access Requirements:**
- SSH access to Kubernetes server
- GitLab project maintainer/owner permissions
- kubectl configured on the cluster

## 🚀 Step-by-Step Setup

### Phase 1: Register GitLab Agent

#### 1.1 Create Agent Registration

1. **Go to GitLab Project:** https://gitlab.com/baguilartech/amber
2. **Navigate to:** Infrastructure → Kubernetes clusters
3. **Click:** "Connect a cluster (agent)"
4. **Agent name:** `production`
5. **Copy the generated token** (starts with `glagent-`)

#### 1.2 Verify Agent Configuration

The agent configuration is already committed to your repository at:
```
.gitlab/agents/production/config.yaml
```

This configuration enables:
- GitOps sync from `k8s/` directory
- CI/CD deployments
- Environment integration

### Phase 2: Install Agent on Cluster

#### 2.1 Connect to Your Cluster

```bash
# SSH to your Kubernetes server
ssh admin@server

# Verify cluster access
kubectl cluster-info
```

#### 2.2 Install GitLab Agent

```bash
# Clone repository (if not already present)
git clone https://gitlab.com/baguilartech/amber.git
cd amber/scripts/gitlab-agent-manifests

# Set your GitLab agent token (from step 1.1)
export GITLAB_AGENT_TOKEN="glagent-your-actual-token-here"

# Run automated installation
./install-agent.sh
```

#### 2.3 Verify Installation

```bash
# Check agent status
kubectl get pods -n gitlab-agent

# View agent logs
kubectl logs -n gitlab-agent deployment/gitlab-agent

# Expected output: "Connected to GitLab"
```

### Phase 3: Configure GitLab Environment

#### 3.1 Environment Auto-Creation

Once the agent connects, GitLab will automatically:
- Create the **production** environment
- Link it to your Kubernetes cluster
- Show deployment history and status

#### 3.2 Verify Environment Setup

1. **Go to:** Deployments → Environments
2. **Check:** Production environment appears
3. **Status:** Should show "Available" with cluster connection

#### 3.3 Environment Settings (Optional Customization)

Navigate to: **Settings** → **CI/CD** → **Environments**

Configure production environment:
- **Name:** `production`
- **External URL:** `https://rancher.kubernetes.DOMAIN.com` (monitoring dashboard)
- **Deployment strategy:** Manual or Automatic
- **Protected:** ✅ (only allow deployments from main branch)

**Note:** AMBER is a Discord music bot, not a web application. The environment URL points to your cluster monitoring dashboard (Rancher) where you can track the bot's status.

### Phase 4: Update CI/CD Pipeline

#### 4.1 New Deployment Job Active

Your `.gitlab-ci.yml` now includes:

```yaml
deploy_production:
  stage: deploy
  image: bitnami/kubectl:latest
  environment:
    name: production
    url: https://rancher.kubernetes.DOMAIN.com  # Monitoring dashboard
    kubernetes:
      namespace: amber
  # ... deployment logic
```

#### 4.2 Deployment Strategy

**Current State:**
- ✅ GitLab Agent job: `deploy_production` (ready to use)
- ✅ ArgoCD completely removed from pipeline

**Deployment Methods:**
1. **GitOps**: Automatic sync when manifests change in `k8s/` directory
2. **CI/CD**: Manual trigger of `deploy_production` job for controlled deployments

### Phase 5: Testing and Validation

#### 5.1 Test GitOps Deployment

The GitLab agent will automatically sync manifests from your `k8s/` directory:

```bash
# Make a change to any k8s manifest
# Commit and push to main branch
# Agent will sync changes within 1-2 minutes

# Verify sync in agent logs
kubectl logs -f -n gitlab-agent deployment/gitlab-agent
```

#### 5.2 Test CI/CD Deployment

1. **Trigger Pipeline:** Push to main branch or manual trigger
2. **Run Job:** `deploy_production` job
3. **Check Environment:** Deployments → Environments → production
4. **Verify:** Application pods and services updated

#### 5.3 Environment Integration Verification

**GitLab UI Should Show:**
- 🔗 **Environment:** Production environment linked to cluster
- 📊 **Deployment History:** Recent deployments visible
- ⚡ **Resource Status:** Pods, services, ingress status
- 📈 **Monitoring:** Metrics and logs integration

## 🔧 Configuration Reference

### Agent Configuration
```yaml
# .gitlab/agents/production/config.yaml
gitops:
  manifest_projects:
  - id: baguilartech/amber
    default_namespace: amber
    paths:
    - glob: 'k8s/**/*.yaml'
    - glob: 'k8s/**/*.yml'

ci_access:
  projects:
  - id: baguilartech/amber
    default_namespace: amber
    access_as:
      agent: {}
```

### Environment Variables

Ensure these are configured in **Settings** → **CI/CD** → **Variables**:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DISCORD_TOKEN` | ✅ | Bot authentication |
| `SPOTIFY_CLIENT_ID` | ✅ | Music service API |
| `SPOTIFY_CLIENT_SECRET` | ✅ | Music service API |
| `SENTRY_DSN` | ✅ | Error tracking |
| `ELK_HOST` | ✅ | Logging integration |
| `ELK_PORT` | ✅ | Logging integration |
| `GRAFANA_HOST` | ✅ | Monitoring integration |

## 🛠️ Troubleshooting

### Agent Connection Issues

**Problem:** Agent not showing as connected
```bash
# Check agent logs
kubectl logs -n gitlab-agent deployment/gitlab-agent

# Common fixes:
# 1. Verify token is correct
# 2. Check network connectivity to kas.gitlab.com
# 3. Ensure proper RBAC permissions
```

### GitOps Sync Issues

**Problem:** Manifests not syncing automatically
```bash
# Check agent configuration
# Ensure .gitlab/agents/production/config.yaml is committed
# Verify project ID matches your GitLab project

# Force sync
kubectl logs -n gitlab-agent deployment/gitlab-agent | grep -i sync
```

### Environment Not Visible

**Problem:** Production environment not appearing in GitLab

1. **Check agent connection** - Must be connected first
2. **Verify environment job** - Must have `environment:` block in CI/CD
3. **Run deployment** - Environment appears after first deployment

### CI/CD Deployment Failures

**Problem:** `deploy_production` job failing

```bash
# Common checks:
# 1. Verify ci_access in agent config
# 2. Check kubectl permissions
# 3. Ensure environment variables are set
# 4. Verify deploy.sh script permissions
```



## 📊 Benefits of GitLab Agent

**GitLab Agent Advantages:**
- ✅ **Native GitLab integration** - Unified UI and workflow
- ✅ **Automatic environment tracking** - Production environment visible in GitLab
- ✅ **Simplified security model** - Outbound-only connections
- ✅ **GitOps and CI/CD combined** - Single tool for both deployment methods
- ✅ **Minimal resource footprint** - Lightweight agent running in cluster
- ✅ **Cost effective** - No additional infrastructure required

## 📚 Additional Resources

- [GitLab-Kubernetes Integration Features](GitLab-Kubernetes-Integration.md) - Complete feature overview
- [GitLab Agent Documentation](https://docs.gitlab.com/ee/user/clusters/agent/)
- [User Access Guide](https://docs.gitlab.com/user/clusters/agent/user_access/)
- [Environment Management](https://docs.gitlab.com/ee/ci/environments/)
- [Kubernetes Dashboard](https://docs.gitlab.com/ci/environments/kubernetes_dashboard/)
- [GitOps with GitLab](https://docs.gitlab.com/ee/user/clusters/agent/gitops.html)

---

**Next Steps:** After completing this setup, your production Kubernetes environment will be fully integrated with GitLab, providing native environment tracking, deployment history, and GitOps capabilities. 