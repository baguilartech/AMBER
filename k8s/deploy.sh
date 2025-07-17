#!/bin/bash
# Deployment script for AMBER Discord Bot
# This script substitutes environment variables into Kubernetes manifests
# and deploys to the cluster

set -e

# Check required environment variables
REQUIRED_VARS=(
  "ELK_HOST"
  "ELK_PORT"
  "GRAFANA_HOST"
  "SENTRY_DSN"
  "DISCORD_TOKEN"
  "SPOTIFY_CLIENT_ID"
  "SPOTIFY_CLIENT_SECRET"
)

echo "🔍 Checking required environment variables..."
for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var}" ]]; then
    echo "❌ Error: $var is not set"
    exit 1
  fi
  echo "✅ $var is set"
done

# Create temporary directory for processed manifests
TEMP_DIR=$(mktemp -d)
echo "📁 Using temporary directory: $TEMP_DIR"

# Function to substitute environment variables in files
substitute_vars() {
  local input_file="$1"
  local output_file="$2"
  
  envsubst < "$input_file" > "$output_file"
  echo "✅ Processed $input_file -> $output_file"
}

# Process all YAML files
echo "🔄 Processing Kubernetes manifests..."

# Copy and process manifests that need variable substitution
substitute_vars "configmap.yaml" "$TEMP_DIR/configmap.yaml"
substitute_vars "filebeat-sidecar.yaml" "$TEMP_DIR/filebeat-sidecar.yaml"

# Copy manifests that don't need variable substitution
cp namespace.yaml "$TEMP_DIR/"
cp service.yaml "$TEMP_DIR/"
cp pvc.yaml "$TEMP_DIR/"

# Process deployment.yaml to inject environment variables
cat > "$TEMP_DIR/configmap-env.yaml" << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: amber-config-env
  namespace: amber
  labels:
    app: discord-bot
data:
  ELK_HOST: "${ELK_HOST}"
  ELK_PORT: "${ELK_PORT}"
  GRAFANA_HOST: "${GRAFANA_HOST}"
EOF

# Process secrets (with proper base64 encoding)
cat > "$TEMP_DIR/secret-env.yaml" << EOF
apiVersion: v1
kind: Secret
metadata:
  name: amber-secrets-env
  namespace: amber
  labels:
    app: discord-bot
type: Opaque
data:
  DISCORD_TOKEN: $(echo -n "$DISCORD_TOKEN" | base64)
  SPOTIFY_CLIENT_ID: $(echo -n "$SPOTIFY_CLIENT_ID" | base64)
  SPOTIFY_CLIENT_SECRET: $(echo -n "$SPOTIFY_CLIENT_SECRET" | base64)
  SENTRY_DSN: $(echo -n "$SENTRY_DSN" | base64)
EOF

# Copy and modify deployment to use the environment-specific configmap
sed "s/amber-config/amber-config-env/g; s/amber-secrets/amber-secrets-env/g" deployment.yaml > "$TEMP_DIR/deployment.yaml"

# Deploy to Kubernetes
echo "🚀 Deploying to Kubernetes..."

kubectl apply -f "$TEMP_DIR/namespace.yaml"
kubectl apply -f "$TEMP_DIR/configmap.yaml"
kubectl apply -f "$TEMP_DIR/configmap-env.yaml"
kubectl apply -f "$TEMP_DIR/secret-env.yaml"
kubectl apply -f "$TEMP_DIR/service.yaml"
kubectl apply -f "$TEMP_DIR/pvc.yaml"
kubectl apply -f "$TEMP_DIR/deployment.yaml"
kubectl apply -f "$TEMP_DIR/filebeat-sidecar.yaml"

# Wait for deployment to be ready
echo "⏳ Waiting for deployment to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/amber-discord-bot -n amber

# Show deployment status
echo "📊 Deployment status:"
kubectl get pods -n amber
kubectl get services -n amber

# Cleanup
rm -rf "$TEMP_DIR"

echo "✅ AMBER Discord Bot deployed successfully!"
echo "🔗 Check status with: kubectl get pods -n amber"