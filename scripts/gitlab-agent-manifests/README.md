# GitLab Agent for Kubernetes Integration

This directory contains the configuration and installation files for connecting your production Kubernetes cluster to GitLab using the GitLab Agent for Kubernetes.

## 🎯 Overview

The GitLab Agent provides:
- **GitOps deployments** - Automatic sync of k8s manifests from your repository
- **CI/CD deployments** - Direct deployment from GitLab CI/CD pipelines
- **Environment integration** - Production environment shown in GitLab
- **Security** - Secure connection from cluster to GitLab (no exposed endpoints)

## 📋 Prerequisites

1. **Kubernetes cluster** running
2. **kubectl** configured to access your cluster
3. **GitLab project** with maintainer/owner access
4. **GitLab.com** account (for using the hosted Agent Server)

## 🚀 Installation Steps

### Step 1: Register the Agent in GitLab

1. Go to your GitLab project: `https://gitlab.com/baguilartech/amber`
2. Navigate to **Infrastructure** → **Kubernetes clusters**
3. Click **Connect a cluster (agent)**
4. Click **Select an agent** and choose **production**
5. Copy the installation token that appears

### Step 2: Install the Agent on Your Cluster

#### Option A: Automated Installation (Recommended)

```bash
# SSH to your Kubernetes server
ssh admin@server

# Clone the repository or copy the agent manifests
git clone https://gitlab.com/baguilartech/amber.git
cd amber/k8s/gitlab-agent-manifests

# Set your GitLab agent token
export GITLAB_AGENT_TOKEN="glagent-your-token-here"

# Run the installation script
./install-agent.sh
```

#### Option B: Manual Installation

```bash
# Create namespace
kubectl apply -f namespace.yaml

# Create RBAC
kubectl apply -f rbac.yaml

# Create the token secret (replace with your actual token)
kubectl create secret generic gitlab-agent-token \
    --from-literal=token="glagent-your-token-here" \
    --namespace=gitlab-agent

# Deploy the agent
kubectl apply -f deployment.yaml

# Check status
kubectl get pods -n gitlab-agent
```

### Step 3: Verify Installation

1. **Check agent status:**
   ```bash
   kubectl get pods -n gitlab-agent
   kubectl logs -n gitlab-agent deployment/gitlab-agent
   ```

2. **Verify in GitLab:**
   - Go to **Infrastructure** → **Kubernetes clusters**
   - Your **production** agent should show as **Connected**

3. **Test GitOps sync:**
   - The agent will automatically sync manifests from your `k8s/` directory
   - Check that your application deployments are managed by the agent

## 🔧 Configuration Details

### Agent Configuration (`.gitlab/agents/production/config.yaml`)

```yaml
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

### Capabilities Enabled

- ✅ **GitOps deployments** - Syncs k8s/ directory automatically
- ✅ **CI/CD access** - Allows deployments from CI/CD pipelines
- ✅ **Environment integration** - Shows production environment in GitLab
- ✅ **Security** - Least privilege access with proper RBAC
- ✅ **Observability** - Agent logs and status monitoring

## 🔄 Migration from ArgoCD

After installing the GitLab agent, you can gradually migrate from ArgoCD:

1. **Phase 1**: Keep both systems running (GitLab agent + ArgoCD)
2. **Phase 2**: Update CI/CD to use GitLab agent for new deployments
3. **Phase 3**: Disable ArgoCD jobs once GitLab agent is fully tested

### Updated CI/CD Job

Replace your `deploy_argocd` job with:

```yaml
deploy_production:
  stage: deploy
  image: bitnami/kubectl:latest
  environment:
    name: production
    url: https://amber.DOMAIN.com
    kubernetes:
      namespace: amber
  script:
    - kubectl config get-contexts
    - kubectl apply -k k8s/
  rules:
    - if: $CI_COMMIT_BRANCH == 'main'
```

## 🛠️ Troubleshooting

### Agent Not Connecting

1. **Check agent logs:**
   ```bash
   kubectl logs -n gitlab-agent deployment/gitlab-agent
   ```

2. **Common issues:**
   - Wrong token (agent shows authentication errors)
   - Network connectivity (check if cluster can reach kas.gitlab.com)
   - RBAC permissions (check if service account has proper roles)

### GitOps Not Syncing

1. **Check agent configuration:**
   - Ensure `.gitlab/agents/production/config.yaml` is committed
   - Verify project ID matches your GitLab project

2. **Check manifest paths:**
   - Ensure your k8s manifests are in paths specified in config
   - Check for YAML syntax errors

### CI/CD Deployments Failing

1. **Verify ci_access configuration:**
   ```yaml
   ci_access:
     projects:
     - id: baguilartech/amber
       default_namespace: amber
   ```

2. **Check CI/CD job configuration:**
   - Use `environment.kubernetes.namespace`
   - Ensure proper kubectl commands

## 📊 Monitoring and Observability

### Agent Health

```bash
# Check agent status
kubectl get pods -n gitlab-agent

# View agent logs
kubectl logs -f -n gitlab-agent deployment/gitlab-agent

# Check resource usage
kubectl top pods -n gitlab-agent
```

### GitOps Status

- View sync status in GitLab: **Infrastructure** → **Kubernetes clusters** → **production**
- Check GitOps events in agent logs
- Monitor application deployments via kubectl

## 🔒 Security Considerations

1. **Agent Token** - Stored as Kubernetes secret, rotatable in GitLab
2. **RBAC** - Least privilege access (can be further restricted if needed)
3. **Network** - Outbound connection only (no inbound ports required)
4. **Container Security** - Agent runs as non-root with read-only filesystem

## 📚 Additional Resources

- [GitLab Agent Documentation](https://docs.gitlab.com/ee/user/clusters/agent/)
- [GitOps Workflow](https://docs.gitlab.com/ee/user/clusters/agent/gitops.html)
- [CI/CD Deployments](https://docs.gitlab.com/ee/user/clusters/agent/ci_cd_workflow.html)
- [Troubleshooting Guide](https://docs.gitlab.com/ee/user/clusters/agent/troubleshooting.html) 