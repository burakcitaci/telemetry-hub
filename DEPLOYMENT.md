# Deployment Guide

Complete step-by-step guide to deploying the Local Observability Platform.

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Docker Desktop installed and running
- [ ] Kind CLI installed
- [ ] Helm CLI installed (version 3+)
- [ ] kubectl CLI installed
- [ ] Node.js 18+ installed
- [ ] Yarn package manager installed

### Installing Prerequisites

**macOS:**
```bash
# Install Kind
brew install kind

# Install Helm
brew install helm

# Install kubectl
brew install kubectl

# Install Yarn
npm install -g yarn
```

**Linux:**
```bash
# Install Kind
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Install Yarn
npm install -g yarn
```

## Step 1: Create Kind Cluster

Create a local Kubernetes cluster using Kind:

```bash
yarn kind:create
```

**Expected Output:**
```
Creating cluster "observability" ...
 ✓ Ensuring node image (kindest/node:v1.27.3) 🖼
 ✓ Preparing nodes 📦  
 ✓ Writing configuration 📜 
 ✓ Starting control-plane 🕹️ 
 ✓ Installing CNI 🔌 
 ✓ Installing StorageClass 💾 
Set kubectl context to "kind-observability"
```

**Verify:**
```bash
kubectl cluster-info --context kind-observability
```

## Step 2: Build Backend Docker Image

Build the backend NestJS service:

```bash
yarn kind:load:backend
```

This will:
1. Build the Docker image from `apps/backend/Dockerfile`
2. Tag it as `local/backend:latest`
3. Load it into the Kind cluster

**Expected Output:**
```
Successfully built <image-id>
Successfully tagged local/backend:latest
Image: "local/backend:latest" with ID "<id>" not yet present on node "observability-control-plane", loading...
```

## Step 3: Update Helm Dependencies

Download the OpenTelemetry Collector and ClickHouse charts:

```bash
yarn helm:deps
```

**Expected Output:**
```
Saving 2 charts
Downloading opentelemetry-collector from repo https://open-telemetry.github.io/opentelemetry-helm-charts
Downloading clickhouse from repo https://charts.bitnami.com/bitnami
Deleting outdated charts
```

## Step 4: Deploy with Helm

Install all components to Kubernetes:

```bash
yarn helm:deploy
```

**Expected Output:**
```
Release "observability" does not exist. Installing it now.
NAME: observability
LAST DEPLOYED: <timestamp>
NAMESPACE: observability
STATUS: deployed
REVISION: 1
```

## Step 5: Verify Deployment

Check that all pods are running:

```bash
yarn status
```

**Expected Output:**
```
NAME                                      READY   STATUS    RESTARTS   AGE
backend-<hash>                            1/1     Running   0          30s
clickhouse-<hash>                         1/1     Running   0          30s
opentelemetry-collector-<hash>            1/1     Running   0          30s
```

**Troubleshooting:**

If pods are not running, check their logs:
```bash
kubectl describe pod <pod-name> -n observability
kubectl logs <pod-name> -n observability
```

Common issues:
- **ImagePullBackOff**: Backend image not loaded properly. Re-run `yarn kind:load:backend`
- **CrashLoopBackOff**: Check logs for application errors
- **Pending**: Check if PVC can be bound (for ClickHouse)

## Step 6: Set Up Port Forwarding

**Terminal 1 - Backend API:**
```bash
yarn port:backend
```

Expected: `Forwarding from 127.0.0.1:3001 -> 3001`

**Terminal 2 (Optional) - ClickHouse:**
```bash
yarn port:clickhouse
```

Expected: `Forwarding from 127.0.0.1:8123 -> 8123`

**Note:** Keep these terminals open. Port forwarding will stop if you close them.

## Step 7: Start Frontend

In a new terminal:

```bash
yarn dev:frontend
```

**Expected Output:**
```
VITE v5.0.8  ready in 500 ms

➜  Local:   http://localhost:5000/
➜  Network: use --host to expose
```

Access the dashboard at **http://localhost:5000**

## Step 8: Generate Test Data

Send a request to the backend to generate traces:

```bash
curl http://localhost:3001/api/data
```

**Expected Response:**
```json
{
  "timestamp": "2025-01-25T10:00:00.000Z",
  "items": [...],
  "summary": {
    "total": 5,
    "categories": ["electronics", "books", "clothing", "food"]
  }
}
```

## Step 9: View Observability Data

1. Open http://localhost:5000 in your browser
2. Navigate to **Traces** to see distributed traces
3. Click on a trace to see the waterfall visualization
4. Navigate to **Logs** to see correlated logs
5. Navigate to **Services** to see metrics

## Testing the Complete Flow

### 1. Generate Multiple Requests

```bash
for i in {1..10}; do
  curl http://localhost:3001/api/data
  sleep 1
done
```

### 2. Verify Data in ClickHouse (Optional)

```bash
# Port-forward ClickHouse if not already done
yarn port:clickhouse

# Query traces
curl "http://localhost:8123/?query=SELECT COUNT(*) FROM otel_traces FORMAT JSON"

# Query logs
curl "http://localhost:8123/?query=SELECT COUNT(*) FROM otel_logs FORMAT JSON"
```

### 3. Verify Real-time Updates

1. Keep the dashboard open at http://localhost:5000
2. Send a new request: `curl http://localhost:3001/api/data`
3. Watch the dashboard automatically update with the new trace

## Updating the Backend

If you make changes to the backend code:

```bash
# Rebuild and reload the image
yarn kind:load:backend

# Upgrade the Helm release
yarn helm:deploy

# Verify the new version is running
kubectl rollout status deployment/backend -n observability
```

## Cleanup

### Uninstall Helm Release Only

```bash
yarn helm:delete
```

### Delete Entire Cluster

```bash
yarn cluster:down
```

This will delete everything including the Kind cluster.

## Common Commands

| Task | Command |
|------|---------|
| Check pod status | `yarn status` |
| View backend logs | `yarn logs:backend` |
| View collector logs | `yarn logs:collector` |
| Restart backend | `kubectl rollout restart deployment/backend -n observability` |
| Shell into backend pod | `kubectl exec -it deployment/backend -n observability -- /bin/sh` |
| Port-forward backend | `yarn port:backend` |
| Port-forward ClickHouse | `yarn port:clickhouse` |

## Architecture Verification

After deployment, verify the complete data flow:

1. **Request Path:**
   - Client → Backend (port 3001)
   - Backend generates spans
   - Spans exported to OTel Collector (OTLP on 4317)

2. **Storage Path:**
   - OTel Collector receives spans
   - Collector processes and batches
   - Collector exports to ClickHouse (port 9000)

3. **Query Path:**
   - Frontend → Backend API (port 3001)
   - Backend queries ClickHouse (port 8123)
   - Results returned to Frontend

4. **Real-time Path:**
   - Backend polls ClickHouse every 3 seconds
   - New data pushed via SSE to Frontend
   - Frontend updates UI automatically

## Production Considerations

This setup is for **local development only**. For production:

1. Use proper image registry (not `local/` images)
2. Configure persistent volumes with backup
3. Set up Ingress instead of port-forwarding
4. Add authentication and authorization
5. Configure TLS/SSL certificates
6. Set up monitoring and alerting
7. Configure resource limits appropriately
8. Use Helm values files for different environments

## Troubleshooting Guide

### Backend Pod Not Starting

**Symptom:** Backend pod in CrashLoopBackOff

**Check:**
```bash
kubectl logs deployment/backend -n observability
```

**Common Causes:**
- ClickHouse not ready (backend trying to connect)
- Image not loaded properly
- Environment variables misconfigured

**Solution:**
```bash
# Wait for ClickHouse to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=clickhouse -n observability --timeout=300s

# Then restart backend
kubectl rollout restart deployment/backend -n observability
```

### ClickHouse Connection Refused

**Symptom:** Backend logs show "Connection refused" to ClickHouse

**Check:**
```bash
kubectl get svc -n observability
```

**Solution:**
Ensure ClickHouse service is running and accessible at `clickhouse:8123` and `clickhouse:9000`

### Frontend Not Connecting to Backend

**Symptom:** Frontend shows "Network Error" or "Connection Refused"

**Check:**
1. Verify port-forwarding is active: `ps aux | grep port-forward`
2. Test backend directly: `curl http://localhost:3001/api/services/health`

**Solution:**
Restart port-forwarding: `yarn port:backend`

### No Traces Appearing

**Symptom:** Dashboard shows "No traces found"

**Possible Causes:**
1. No requests sent to backend
2. OTel Collector not receiving data
3. ClickHouse not storing data

**Debug Steps:**
```bash
# 1. Generate test data
curl http://localhost:3001/api/data

# 2. Check collector logs
yarn logs:collector

# 3. Verify ClickHouse tables exist
yarn port:clickhouse
curl "http://localhost:8123/?query=SHOW TABLES FORMAT JSON"

# 4. Check trace count
curl "http://localhost:8123/?query=SELECT COUNT(*) FROM otel_traces FORMAT JSON"
```

### Real-time Updates Not Working

**Symptom:** New traces don't appear automatically

**Check:**
1. Browser console for SSE errors
2. Backend logs for SSE connection messages

**Solution:**
Refresh the page and ensure the connection status shows "Connected"

## Advanced Usage

### Custom Trace Generation

Create a simple script to generate custom traces:

```javascript
// test-trace.js
const axios = require('axios');

async function generateLoad() {
  for (let i = 0; i < 100; i++) {
    try {
      await axios.get('http://localhost:3001/api/data');
      console.log(`Request ${i + 1} completed`);
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Request ${i + 1} failed:`, error.message);
    }
  }
}

generateLoad();
```

Run with: `node test-trace.js`

### Query ClickHouse Directly

```bash
# Get all unique service names
curl "http://localhost:8123/?query=SELECT DISTINCT ServiceName FROM otel_traces FORMAT JSON" | jq

# Get trace count by service
curl "http://localhost:8123/?query=SELECT ServiceName, COUNT(*) as count FROM otel_traces GROUP BY ServiceName FORMAT JSON" | jq

# Get average duration by operation
curl "http://localhost:8123/?query=SELECT SpanName, AVG(Duration) as avg_duration FROM otel_traces GROUP BY SpanName FORMAT JSON" | jq
```
