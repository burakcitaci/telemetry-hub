#!/usr/bin/env bash

set -euo pipefail

readonly CLUSTER_NAME="observability"
readonly KUBE_CONTEXT="kind-observability"
readonly NAMESPACE="telemetry-hub"
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "$REPO_ROOT"

if ! kind get clusters | grep -Fxq "$CLUSTER_NAME"; then
  kind create cluster --name "$CLUSTER_NAME" --config infra/kind/kind-config.yaml
fi

yarn kind:load:backend
yarn helm:deploy

# Loading a replacement image under the same local tag does not mutate the
# Deployment, so explicitly restart it and wait for the new pod to be ready.
kubectl --context "$KUBE_CONTEXT" rollout restart deployment/backend --namespace "$NAMESPACE"
kubectl --context "$KUBE_CONTEXT" rollout status deployment/backend --namespace "$NAMESPACE" --timeout=3m

kubectl --context "$KUBE_CONTEXT" get pods --namespace "$NAMESPACE"
