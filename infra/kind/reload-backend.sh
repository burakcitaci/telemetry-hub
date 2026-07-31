#!/usr/bin/env bash

set -euo pipefail

readonly KUBE_CONTEXT="kind-observability"
readonly NAMESPACE="telemetry-hub"
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "$REPO_ROOT"

yarn kind:load:backend
kubectl --context "$KUBE_CONTEXT" rollout restart deployment/backend --namespace "$NAMESPACE"
kubectl --context "$KUBE_CONTEXT" rollout status deployment/backend --namespace "$NAMESPACE" --timeout=3m
