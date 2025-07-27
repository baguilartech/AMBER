#!/bin/bash
# Deployment script for AMBER Discord Bot
# This script substitutes environment variables into Kubernetes manifests
# and deploys to the cluster

set -e

# Configure kubectl for GitLab Agent (following GitLab documentation)
echo "🔧 Configuring kubectl for GitLab Agent..."

if [ -n "$KUBECONFIG" ]; then
    echo "📄 Using KUBECONFIG: $KUBECONFIG"
    
    # List available contexts (as recommended by GitLab docs)
    echo "🔍 Available contexts:"
    kubectl config get-contexts || {
        echo "❌ Error: No contexts found in KUBECONFIG"
        exit 1
    }
    
    # Get current context
    CURRENT_CONTEXT=$(kubectl config current-context 2>/dev/null || echo "none")
    echo "📍 Current context: $CURRENT_CONTEXT"
    
    # Set context according to GitLab documentation
    if [ -n "$KUBE_CONTEXT" ]; then
        echo "🎯 Setting context to: $KUBE_CONTEXT"
        kubectl config use-context "$KUBE_CONTEXT" || {
            echo "❌ Error: Failed to set context to $KUBE_CONTEXT"
            echo "💡 Make sure KUBE_CONTEXT is in format: path/to/agent/project:agent-name"
            exit 1
        }
    else
        # Auto-select context if not specified
        if [ "$CURRENT_CONTEXT" = "none" ]; then
            # Get the first available context (usually the GitLab agent context)
            FIRST_CONTEXT=$(kubectl config get-contexts -o name | head -n 1)
            if [ -n "$FIRST_CONTEXT" ]; then
                echo "🎯 Auto-setting context to: $FIRST_CONTEXT"
                kubectl config use-context "$FIRST_CONTEXT" || {
                    echo "❌ Error: Failed to set context to $FIRST_CONTEXT"
                    exit 1
                }
            else
                echo "❌ Error: No contexts available in KUBECONFIG"
                exit 1
            fi
        fi
    fi
    
    # Validate connection (with timeout as recommended)
    echo "✅ Testing cluster connection..."
    kubectl cluster-info --request-timeout=10s || {
        echo "❌ Error: Cannot connect to Kubernetes cluster"
        echo "Current context: $(kubectl config current-context 2>/dev/null || echo 'none')"
        echo "Server: $(kubectl config view --minify --output jsonpath='{.clusters[*].cluster.server}' 2>/dev/null || echo 'unknown')"
        echo "💡 Check GitLab Agent configuration and authorization"
        exit 1
    }
    
    echo "✅ Successfully connected to Kubernetes cluster"
    echo "📍 Using context: $(kubectl config current-context)"
else
    echo "❌ Error: No KUBECONFIG provided"
    echo "💡 Ensure GitLab Agent is properly configured and authorized for this project"
    exit 1
fi

# Check required environment variables
REQUIRED_VARS=(
  "ELK_HOST"
  "ELK_PORT"
  "GRAFANA_HOST"
  "SENTRY_DSN"
  "DISCORD_TOKEN"
  "DISCORD_CLIENT_ID"
  "SPOTIFY_CLIENT_ID"
  "SPOTIFY_CLIENT_SECRET"
  "YOUTUBE_API_KEY"
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
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  LOG_FORMAT: "json"
  ENABLE_METRICS: "true"
  METRICS_PORT: "5150"
  HEALTH_CHECK_PORT: "5150"
  SENTRY_ENVIRONMENT: "production"
  MAX_QUEUE_SIZE: "100"
  DEFAULT_VOLUME: "0.5"
  AUTO_LEAVE_TIMEOUT: "300000"
  ELK_HOST: "${ELK_HOST}"
  ELK_PORT: "${ELK_PORT}"
  GRAFANA_HOST: "${GRAFANA_HOST}"
EOF

# Create GitLab registry pull secret
cat > "$TEMP_DIR/registry-secret.yaml" << EOF
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-registry
  namespace: amber
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: $(echo -n "{\"auths\":{\"$REGISTRY_URL\":{\"auth\":\"$(echo -n "gitlab-ci-token:$CI_JOB_TOKEN" | base64 | tr -d '\n')\"}}}" | base64 | tr -d '\n')
EOF

# Process secrets (with proper base64 encoding and YAML escaping)
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
  DISCORD_TOKEN: "$(echo -n "$DISCORD_TOKEN" | base64 | tr -d '\n')"
  DISCORD_CLIENT_ID: "$(echo -n "$DISCORD_CLIENT_ID" | base64 | tr -d '\n')"
  SPOTIFY_CLIENT_ID: "$(echo -n "$SPOTIFY_CLIENT_ID" | base64 | tr -d '\n')"
  SPOTIFY_CLIENT_SECRET: "$(echo -n "$SPOTIFY_CLIENT_SECRET" | base64 | tr -d '\n')"
  SENTRY_DSN: "$(echo -n "$SENTRY_DSN" | base64 | tr -d '\n')"
  YOUTUBE_API_KEY: "$(echo -n "$YOUTUBE_API_KEY" | base64 | tr -d '\n')"
EOF

# Process deployment.yaml with variable substitution and configmap changes
sed "s/amber-config/amber-config-env/g; s/amber-secrets/amber-secrets-env/g" deployment.yaml | envsubst > "$TEMP_DIR/deployment.yaml"

# Deploy to Kubernetes
echo "🚀 Deploying to Kubernetes..."

# Deploy with validation fallback
deploy_with_fallback() {
    local file="$1"
    local filename=$(basename "$file")
    echo "📦 Deploying $filename..."
    
    # Try with validation first
    if kubectl apply -f "$file" --dry-run=server; then
        echo "✅ Validation passed for $filename"
        kubectl apply -f "$file" || {
            echo "❌ Error: Failed to apply $filename"
            return 1
        }
    else
        echo "⚠️  Server-side validation failed for $filename, trying client-side validation..."
        if kubectl apply -f "$file" --dry-run=client; then
            echo "✅ Client-side validation passed for $filename"
            kubectl apply -f "$file" --validate=false || {
                echo "❌ Error: Failed to apply $filename without validation"
                return 1
            }
        else
            echo "❌ Error: Both server and client validation failed for $filename"
            return 1
        fi
    fi
    
    echo "✅ Successfully applied $filename"
}

deploy_with_fallback "$TEMP_DIR/namespace.yaml"
deploy_with_fallback "$TEMP_DIR/configmap.yaml"
deploy_with_fallback "$TEMP_DIR/configmap-env.yaml"
deploy_with_fallback "$TEMP_DIR/secret-env.yaml"
deploy_with_fallback "$TEMP_DIR/registry-secret.yaml"
deploy_with_fallback "$TEMP_DIR/filebeat-sidecar.yaml"
deploy_with_fallback "$TEMP_DIR/service.yaml"
deploy_with_fallback "$TEMP_DIR/deployment.yaml"

# Discord bot metrics are now exposed via hostNetwork on port 5150
echo "📊 Discord bot metrics exposed via hostNetwork on port 5150 for external Prometheus"

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
echo "📊 Discord bot metrics exposed via hostNetwork on port 5150"
echo ""
echo "🔗 Check status with: kubectl get pods -n amber"
echo "📈 Bot metrics available at: http://kubernetes:5150/metrics"
echo "💡 Your external Prometheus should scrape: kubernetes:5150"