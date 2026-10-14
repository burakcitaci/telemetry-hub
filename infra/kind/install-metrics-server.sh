#!/usr/bin/env bash
set -euo pipefail
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

# This certificate exception is scoped to the local Kind cluster only.
kubectl --context kind-observability apply -k infra/kind/metrics-server
kubectl --context kind-observability rollout status deployment/metrics-server -n kube-system --timeout=3m
kubectl --context kind-observability wait --for=condition=Available apiservice/v1beta1.metrics.k8s.io --timeout=2m
