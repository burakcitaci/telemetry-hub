#!/usr/bin/env bash

set -euo pipefail

readonly KUBE_CONTEXT="kind-observability"
readonly NAMESPACE="telemetry-hub"
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "$REPO_ROOT"

# One-time, WAL-aware migration before restarting an ephemeral backend.
# Node invokes kubectl directly, avoiding MSYS path conversion of container paths.
node infra/kind/migrate-platform-store.mjs

bash infra/kind/load-backend.sh
kubectl --context "$KUBE_CONTEXT" rollout restart deployment/backend --namespace "$NAMESPACE"
kubectl --context "$KUBE_CONTEXT" rollout status deployment/backend --namespace "$NAMESPACE" --timeout=3m
