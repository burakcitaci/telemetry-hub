# Local Observability Platform

A complete local observability platform using OpenTelemetry, ClickHouse, and Kubernetes Kind.

## Architecture

- **Gateway Service** (NestJS): Instrumented service generating traces and logs
- **Backend API** (NestJS): Query layer with ClickHouse integration and SSE streaming
- **OpenTelemetry Collector**: Central telemetry pipeline
- **ClickHouse**: Time-series storage for traces and logs
- **React UI**: Real-time dashboard with trace visualization (runs locally)

## Prerequisites

- Docker Desktop running
- Kind CLI installed
- Helm CLI installed
- kubectl CLI installed
- Node.js 18+ and Yarn installed

## Quick Start

### 1. Create Kind Cluster

```bash
yarn kind:create
```

### 2. Build and Deploy Backend Services

```bash
yarn deploy
```

This will:
- Build Docker images for Gateway and Backend
- Load images into Kind cluster
- Install Helm chart with all components

### 3. Check Status

```bash
yarn status
```

Wait until all pods are Running.

### 4. Set Up Port Forwarding

Open three terminals and run:

```bash
# Terminal 1: Gateway
yarn forward:gateway

# Terminal 2: Backend API
yarn forward:backend

# Terminal 3 (optional): ClickHouse
yarn forward:clickhouse
```

### 5. Start React UI

```bash
yarn ui
```

Access the dashboard at http://localhost:4000

## Usage

### Generate Traces

Send requests to the Gateway:

```bash
curl http://localhost:3000/api/data
```

### View Logs

```bash
# Gateway logs
yarn logs:gateway

# Backend logs
yarn logs:backend

# Collector logs
yarn logs:collector
```

### Rebuild and Update

```bash
yarn redeploy
```

## Cleanup

```bash
yarn helm:uninstall
yarn kind:delete
```

## Troubleshooting

### Pods not starting

Check pod status: `yarn status`
Check logs: `yarn logs:gateway` or `yarn logs:backend`

### Port-forward connection refused

Ensure pods are Running before port-forwarding.

### ClickHouse connection issues

Check ClickHouse pod logs: `kubectl logs -n observability -l app.kubernetes.io/name=clickhouse`
