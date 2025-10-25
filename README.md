# Local Observability Platform

A complete local observability platform using **NestJS**, **React (Vite)**, **OpenTelemetry**, **ClickHouse**, and **Kubernetes Kind**.

## 🏗 Architecture

```
React (Vite Frontend)
   ↓ (port-forward)
Backend API (NestJS, OTel SDK) [in Kind]
   ↓ (OTLP)
OTel Collector [in Kind]
   ↓
ClickHouse [in Kind]
```

## 📁 Project Structure

```
apps/
  backend/          → NestJS API with OpenTelemetry instrumentation
  frontend/         → React + Vite UI
infra/
  charts/           → Helm charts for backend, collector, clickhouse
  kind/             → Kind cluster configuration
```

## 🚀 Quick Start

### Prerequisites

- Docker Desktop running
- Kind CLI installed (`brew install kind` or https://kind.sigs.k8s.io/docs/user/quick-start/)
- Helm CLI installed (`brew install helm` or https://helm.sh/docs/intro/install/)
- kubectl CLI installed
- Node.js 18+ and Yarn installed

### 1. Start the Cluster

```bash
yarn cluster:up
```

This will:
- Create a Kind cluster named "observability"
- Build and load the backend Docker image
- Update Helm dependencies (OTel Collector + ClickHouse)
- Deploy everything to Kubernetes

### 2. Set Up Port Forwarding

Open two terminals:

**Terminal 1 - Backend API:**
```bash
yarn port:backend
```

**Terminal 2 (Optional) - ClickHouse:**
```bash
yarn port:clickhouse
```

### 3. Start the Frontend

```bash
yarn dev:frontend
```

Access the dashboard at **http://localhost:5173**

## 📊 Usage

### Generate Traces

Send requests to the backend to generate telemetry:

```bash
curl http://localhost:3001/api/data
```

The backend will automatically:
- Create distributed traces with multiple spans
- Send logs correlated to traces
- Export everything via OTLP to the collector

### View Observability Data

Open the dashboard at http://localhost:5173 to see:

- **Traces View**: Real-time distributed tracing with waterfall visualization
- **Logs View**: Live log streaming with severity filtering
- **Services View**: Service metrics and health status

### Monitor Status

```bash
# Check pod status
yarn status

# View backend logs
yarn logs:backend

# View collector logs
yarn logs:collector
```

## 🔧 Development Workflow

### Backend Development

```bash
# Make changes to apps/backend
yarn kind:load:backend
yarn helm:deploy
```

### Frontend Development

```bash
# Make changes to apps/frontend
# Hot-reload happens automatically
yarn dev:frontend
```

## 🧹 Cleanup

```bash
yarn cluster:down
```

This will:
- Uninstall the Helm release
- Delete the Kind cluster

## 🐛 Troubleshooting

### Pods Not Starting

Check pod status and logs:
```bash
kubectl get pods -n observability
kubectl describe pod <pod-name> -n observability
kubectl logs <pod-name> -n observability
```

### ClickHouse Connection Issues

Ensure ClickHouse pod is running:
```bash
kubectl get pods -n observability -l app.kubernetes.io/name=clickhouse
```

### Frontend Can't Connect to Backend

Verify port-forwarding is active:
```bash
# Should show: Forwarding from 127.0.0.1:3001 -> 3001
ps aux | grep "port-forward"
```

Restart if needed:
```bash
yarn port:backend
```

## 📚 Key Features

- ✅ **Full OpenTelemetry Integration**: Auto-instrumentation for NestJS with traces and logs
- ✅ **Real-time Updates**: Server-Sent Events (SSE) for live trace/log streaming
- ✅ **Waterfall Visualization**: Interactive trace timeline with span hierarchy
- ✅ **ClickHouse Storage**: High-performance time-series database for telemetry
- ✅ **Kubernetes Native**: Production-like infrastructure running locally
- ✅ **One-Command Deploy**: Automated cluster setup with Yarn scripts
- ✅ **Fast Frontend Development**: Vite hot-reload with no containerization

## 🛠 Tech Stack

**Backend:**
- NestJS
- OpenTelemetry SDK (auto-instrumentations)
- ClickHouse Client

**Frontend:**
- React 18
- Vite
- React Router
- Recharts
- Axios

**Infrastructure:**
- Kubernetes Kind
- Helm
- OpenTelemetry Collector
- ClickHouse
- Docker

## 📖 Next Steps

- Add more instrumented services to demonstrate distributed tracing
- Implement custom metrics collection
- Add alerting based on error rates or latency thresholds
- Create custom dashboards for specific use cases
