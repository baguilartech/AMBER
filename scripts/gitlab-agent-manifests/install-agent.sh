#!/bin/bash
# GitLab Agent Installation Script for Production Kubernetes Cluster
# This script installs the GitLab agent for Kubernetes integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AGENT_NAME="production"
GITLAB_PROJECT="baguilartech/amber"
NAMESPACE="gitlab-agent-production"

echo -e "${BLUE}🔧 GitLab Agent Installation for Production Kubernetes${NC}"
echo "=================================================="

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl is not installed or not in PATH${NC}"
    exit 1
fi

# Check if we can connect to the cluster
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}❌ Cannot connect to Kubernetes cluster${NC}"
    echo "Please ensure your kubeconfig is properly configured."
    exit 1
fi

echo -e "${GREEN}✅ Connected to Kubernetes cluster${NC}"
kubectl cluster-info | head -1

# Check if GitLab agent token is provided
if [ -z "$GITLAB_AGENT_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  GitLab agent token not provided as environment variable${NC}"
    echo ""
    echo "To get your GitLab agent token:"
    echo "1. Go to your GitLab project: https://gitlab.com/${GITLAB_PROJECT}"
    echo "2. Navigate to Infrastructure → Kubernetes clusters"
    echo "3. Click 'Connect a cluster (agent)'"
    echo "4. Select 'production' agent"
    echo "5. Copy the token from the registration command"
    echo ""
    read -p "Please enter your GitLab agent token: " GITLAB_AGENT_TOKEN
    
    if [ -z "$GITLAB_AGENT_TOKEN" ]; then
        echo -e "${RED}❌ Token is required to proceed${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}🚀 Installing GitLab Agent...${NC}"

# Apply namespace
echo "Creating namespace..."
kubectl apply -f namespace.yaml

# Apply RBAC
echo "Setting up RBAC permissions..."
kubectl apply -f rbac.yaml

# Create token secret
echo "Creating agent token secret..."
kubectl create secret generic gitlab-agent-token \
    --from-literal=token="$GITLAB_AGENT_TOKEN" \
    --namespace="$NAMESPACE" \
    --dry-run=client -o yaml | kubectl apply -f -

# Apply deployment
echo "Deploying GitLab agent..."
kubectl apply -f deployment.yaml

# Wait for deployment to be ready
echo "Waiting for agent to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/gitlab-agent -n "$NAMESPACE"

# Check status
echo -e "\n${GREEN}✅ GitLab Agent Installation Complete!${NC}"
echo ""
echo "Agent Status:"
kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=gitlab-agent

echo ""
echo "Agent Logs (last 10 lines):"
kubectl logs -n "$NAMESPACE" deployment/gitlab-agent --tail=10

echo ""
echo -e "${BLUE}🔗 Next Steps:${NC}"
echo "1. Verify the agent appears as connected in GitLab:"
echo "   https://gitlab.com/${GITLAB_PROJECT}/-/clusters"
echo ""
echo "2. The agent now provides:"
echo "   ✅ GitOps - Automatic sync from k8s/ directory"
echo "   ✅ CI/CD Access - Deploy via 'deploy_production' job"
echo "   ✅ User Access - Team members can use kubectl via GitLab UI"
echo "   ✅ Environment Integration - Production environment tracking"
echo ""
echo "3. Access Kubernetes via GitLab:"
echo "   - Go to Infrastructure → Kubernetes clusters → production"
echo "   - Use 'Kubernetes dashboard' or 'Terminal' for direct access"
echo "   - Reference: https://docs.gitlab.com/user/clusters/agent/user_access/"

echo ""
echo -e "${GREEN}🎉 Production Kubernetes cluster is now connected to GitLab!${NC}" 