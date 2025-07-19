#!/bin/bash
# Script to create Kubernetes secret with DOMAIN Root CA certificate

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

NAMESPACE="gitlab-agent-production"
SECRET_NAME="DOMAIN-ca-certificate"
CA_URL="http://ca.DOMAIN.com:8080/?action=ca-cert"

echo -e "${BLUE}🔧 Creating DOMAIN Root CA Certificate Secret${NC}"
echo "=================================================="

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl is not installed or not in PATH${NC}"
    exit 1
fi

# Check if we can connect to the cluster
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}❌ Cannot connect to Kubernetes cluster${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Connected to Kubernetes cluster${NC}"

# Create namespace if it doesn't exist
echo "Ensuring namespace exists..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Download CA certificate
echo "Downloading CA certificate from $CA_URL..."
CA_CERT=$(curl -s "$CA_URL")

if [ -z "$CA_CERT" ]; then
    echo -e "${RED}❌ Failed to download CA certificate${NC}"
    exit 1
fi

echo -e "${GREEN}✅ CA certificate downloaded successfully${NC}"

# Create the secret
echo "Creating Kubernetes secret..."
kubectl create secret generic "$SECRET_NAME" \
    --from-literal=DOMAIN-ca.crt="$CA_CERT" \
    --namespace="$NAMESPACE" \
    --dry-run=client -o yaml | kubectl apply -f -

echo -e "${GREEN}✅ Secret '$SECRET_NAME' created successfully in namespace '$NAMESPACE'${NC}"

echo ""
echo -e "${BLUE}🔗 Next Steps:${NC}"
echo "1. Apply the updated GitLab Agent deployment:"
echo "   kubectl apply -f deployment.yaml"
echo ""
echo "2. Check the agent logs:"
echo "   kubectl logs -n $NAMESPACE deployment/gitlab-agent"
echo ""
echo -e "${GREEN}🎉 CA certificate secret is ready!${NC}" 