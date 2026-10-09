#!/usr/bin/env bash

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

docker build -f apps/backend/Dockerfile -t local/backend:latest .
kind load docker-image local/backend:latest --name observability
