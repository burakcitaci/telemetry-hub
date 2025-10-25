# Local Observability Platform

## Project Overview

A complete local observability platform built with NestJS, React, OpenTelemetry, ClickHouse, and Kubernetes Kind for distributed tracing and real-time monitoring.

## Architecture

```
React (Vite Frontend) [Port 5000]
   ↓ (port-forward)
Backend API (NestJS, OTel SDK) [in Kind cluster]
   ↓ (OTLP)
OpenTelemetry Collector [in Kind cluster]
   ↓
ClickHouse Database [in Kind cluster]
```

## Project Structure

```
apps/
  backend/          → NestJS API with OpenTelemetry instrumentation
    - Auto-instrumentation for HTTP requests
    - ClickHouse integration for querying traces/logs
    - Server-Sent Events (SSE) for real-time updates
  frontend/         → React + Vite dashboard
    - Traces view with waterfall visualization
    - Logs explorer with severity filtering
    - Services dashboard with metrics
    - Real-time SSE connection
infra/
  charts/           → Helm umbrella chart
    - Backend deployment and service
    - OpenTelemetry Collector configuration
    - ClickHouse database with persistence
  kind/             → Kind cluster configuration
```

## Technology Stack

**Backend:**
- NestJS framework
- OpenTelemetry SDK with auto-instrumentations
- ClickHouse client for time-series queries
- Express for HTTP server
- SSE for real-time streaming

**Frontend:**
- React 18 with TypeScript
- Vite for fast development
- React Router for navigation
- Recharts for data visualization
- Axios for API calls
- date-fns for time formatting

**Infrastructure:**
- Kubernetes Kind for local cluster
- Helm 3 for deployment orchestration
- OpenTelemetry Collector (contrib)
- ClickHouse database
- Docker for containerization

## Key Features

✅ **Full OpenTelemetry Integration** - Auto-instrumentation for NestJS with distributed tracing
✅ **Real-time Updates** - SSE streaming for live trace/log updates without polling
✅ **Waterfall Visualization** - Interactive trace timeline showing span hierarchy and duration
✅ **ClickHouse Storage** - High-performance time-series database optimized for telemetry
✅ **Kubernetes Native** - Production-like infrastructure running locally with Kind
✅ **One-Command Deploy** - Automated setup with Yarn scripts
✅ **Fast Frontend Development** - Vite hot-reload without containerization
✅ **Complete Observability** - Traces, logs, metrics, and service health monitoring

## Quick Start

### Prerequisites
- Docker Desktop running
- Kind CLI installed
- Helm CLI installed
- kubectl configured
- Node.js 18+ and Yarn installed

### Deployment Steps

1. **Create Kind Cluster:**
   ```bash
   yarn kind:create
   ```

2. **Build and Deploy:**
   ```bash
   yarn cluster:up
   ```

3. **Set Up Port Forwarding:**
   ```bash
   # Terminal 1
   yarn port:backend
   
   # Terminal 2 (optional)
   yarn port:clickhouse
   ```

4. **Access Frontend:**
   The frontend workflow is already running on port 5000.
   Open http://localhost:5000 in your browser.

5. **Generate Test Data:**
   ```bash
   curl http://localhost:3001/api/data
   ```

## Recent Changes

- **2025-01-25**: Initial implementation with Nx monorepo structure
- **2025-01-25**: CORS configuration updated to support frontend on port 5000
- **2025-01-25**: TypeScript definitions added for Vite environment variables
- **2025-01-25**: Health check endpoints verified for Kubernetes probes

## User Preferences

*No specific preferences recorded yet*

## Important Notes

- The frontend runs **outside** Kubernetes for fast iteration
- Backend runs **inside** Kind cluster for production-like deployment
- Port-forwarding is required to access backend from local machine
- SSE connection provides real-time updates without manual refresh
- ClickHouse tables are auto-created with 7-day TTL for data retention

## Troubleshooting

**Frontend not connecting to backend:**
- Verify port-forwarding is active: `ps aux | grep port-forward`
- Test backend: `curl http://localhost:3001/api/services/health`
- Restart port-forward: `yarn port:backend`

**Pods not starting:**
- Check status: `yarn status`
- View logs: `yarn logs:backend` or `yarn logs:collector`
- Describe pod: `kubectl describe pod <pod-name> -n observability`

**No traces appearing:**
1. Send test request: `curl http://localhost:3001/api/data`
2. Check collector logs: `yarn logs:collector`
3. Verify ClickHouse: `curl "http://localhost:8123/?query=SELECT COUNT(*) FROM otel_traces"`

## Next Steps

Consider adding:
- Multiple instrumented services for distributed tracing demos
- Custom metrics collection and aggregation
- Alerting based on error rates or latency thresholds
- Span sampling strategies for high-volume scenarios
- Production deployment with Ingress and authentication

## Documentation

- [README.md](README.md) - Project overview and basic setup
- [DEPLOYMENT.md](DEPLOYMENT.md) - Comprehensive deployment guide with troubleshooting
