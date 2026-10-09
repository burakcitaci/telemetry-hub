#!/usr/bin/env bash

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

helm upgrade --install observability infra/charts/observability \
  --namespace telemetry-hub --create-namespace \
  --wait --timeout 5m --kube-context kind-observability \
  --set-string "backend.otelServiceName=${BACKEND_SERVICE_NAME:-backend-service}" \
  "$@"
