#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# deploy-staging.sh — Build, push, migrate, and deploy to the staging
# Kubernetes namespace for production-master cloud pipeline.
###############################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ---------------------------------------------------------------------------
# Configuration (override via environment)
# ---------------------------------------------------------------------------
REGISTRY="${REGISTRY:?REGISTRY env var is required (e.g. us-docker.pkg.dev/my-project/pm)}"
IMAGE_TAG="${IMAGE_TAG:-staging}"
NAMESPACE="${NAMESPACE:-production-master-staging}"
RELEASE_NAME="${RELEASE_NAME:-production-master}"
HELM_VALUES="${HELM_VALUES:-${ROOT_DIR}/helm/values-staging.yaml}"
DEPLOYMENT_NAME="${DEPLOYMENT_NAME:-production-master-api}"
ROLLOUT_TIMEOUT="${ROLLOUT_TIMEOUT:-300s}"

IMAGE_LOCAL="production-master:${IMAGE_TAG}"
IMAGE_REMOTE="${REGISTRY}/production-master:${IMAGE_TAG}"

echo "============================================="
echo " Production-Master — Staging Deployment"
echo "============================================="
echo ""
echo "  Registry:   ${REGISTRY}"
echo "  Image tag:  ${IMAGE_TAG}"
echo "  Namespace:  ${NAMESPACE}"
echo "  Helm vals:  ${HELM_VALUES}"
echo ""

# ---------------------------------------------------------------------------
# Step 1 — Build Docker image
# ---------------------------------------------------------------------------
echo ">>> Step 1/6: Building Docker image..."
docker build -t "${IMAGE_LOCAL}" "${ROOT_DIR}"
echo "    Built ${IMAGE_LOCAL}"

# ---------------------------------------------------------------------------
# Step 2 — Tag and push to container registry
# ---------------------------------------------------------------------------
echo ">>> Step 2/6: Tagging and pushing to registry..."
docker tag "${IMAGE_LOCAL}" "${IMAGE_REMOTE}"
docker push "${IMAGE_REMOTE}"
echo "    Pushed ${IMAGE_REMOTE}"

# ---------------------------------------------------------------------------
# Step 3 — Run database migrations
# ---------------------------------------------------------------------------
echo ">>> Step 3/6: Running database migrations..."
"${SCRIPT_DIR}/run-migrations.sh"
echo "    Migrations complete."

# ---------------------------------------------------------------------------
# Step 4 — Helm upgrade / install
# ---------------------------------------------------------------------------
echo ">>> Step 4/6: Deploying via Helm..."
helm upgrade --install "${RELEASE_NAME}" "${ROOT_DIR}/helm/" \
  -f "${HELM_VALUES}" \
  -n "${NAMESPACE}" \
  --create-namespace \
  --set image.repository="${REGISTRY}/production-master" \
  --set image.tag="${IMAGE_TAG}" \
  --wait \
  --timeout "${ROLLOUT_TIMEOUT}"
echo "    Helm release '${RELEASE_NAME}' deployed to namespace '${NAMESPACE}'."

# ---------------------------------------------------------------------------
# Step 5 — Wait for rollout
# ---------------------------------------------------------------------------
echo ">>> Step 5/6: Waiting for rollout to complete..."
kubectl rollout status "deployment/${DEPLOYMENT_NAME}" \
  -n "${NAMESPACE}" \
  --timeout="${ROLLOUT_TIMEOUT}"
echo "    Rollout complete."

# ---------------------------------------------------------------------------
# Step 6 — Print status and health check
# ---------------------------------------------------------------------------
echo ">>> Step 6/6: Deployment status"
kubectl get pods -n "${NAMESPACE}" -l "app.kubernetes.io/name=${RELEASE_NAME}"
echo ""

HEALTH_URL="http://${DEPLOYMENT_NAME}.${NAMESPACE}.svc.cluster.local:3000/health"
READY_URL="http://${DEPLOYMENT_NAME}.${NAMESPACE}.svc.cluster.local:3000/ready"

echo "============================================="
echo " Staging deployment complete!"
echo "============================================="
echo ""
echo "  Health check:    ${HEALTH_URL}"
echo "  Readiness check: ${READY_URL}"
echo "  Metrics:         http://${DEPLOYMENT_NAME}.${NAMESPACE}.svc.cluster.local:3000/metrics"
echo ""
echo "  To port-forward locally:"
echo "    kubectl port-forward -n ${NAMESPACE} svc/${DEPLOYMENT_NAME} 3000:3000"
echo ""
