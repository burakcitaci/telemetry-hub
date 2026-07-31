# Local Kind deployment

This guide verifies the complete traces-and-logs path. The supported namespace is `telemetry-hub`; the Kind cluster is named `observability`.

## Start the stack

Install JavaScript dependencies once:

```bash
corepack enable
yarn install --frozen-lockfile
```

Create or update the local stack:

```bash
yarn cluster:up
```

The command is safe to run when the Kind cluster already exists. Helm waits up to five minutes for the backend, collector, and ClickHouse Deployments, then the script restarts the backend so the newly loaded `local/backend:latest` image is actually used.

Check the result:

```bash
yarn status
kubectl --context kind-observability get services --namespace telemetry-hub
```

Expected workloads are `backend`, `clickhouse`, and `opentelemetry-collector`.

## Expose the local services

Keep this command running in its own terminal:

```bash
yarn port:backend
```

The backend is now available at `http://localhost:3001`. ClickHouse does not need to be exposed for the application to work. For direct inspection, run this in another terminal:

```bash
yarn port:clickhouse
```

Start the host-side frontend:

```bash
yarn dev:frontend
```

Vite prefers `http://localhost:5000`. If that port is already in use, Vite will automatically choose another port and print the exact URL. In the current local setup, `http://localhost:5003` is also allowed by backend CORS.

The backend CORS allow-list includes the common local Vite ports `5000`, `5001`, `5002`, and `5003` for both `localhost` and `127.0.0.1`. If Vite chooses a different port, add that origin in `apps/backend/src/config/cors.config.ts`, then run:

```bash
yarn backend:reload
```

## Generate and verify telemetry

Check backend health and generate several instrumented requests:

```bash
curl http://localhost:3001/health

for i in 1 2 3 4 5; do
  curl --silent http://localhost:3001/api/data > /dev/null
done
```

Wait a few seconds for collector batching. Then inspect the dashboard's Traces, Logs, and Services screens.

ClickHouse stores timestamps in UTC. The dashboard displays those timestamps in the browser's local timezone, so a user in Germany during summer time should see UTC records shifted forward by two hours.

With the ClickHouse port-forward active, verify storage directly:

```bash
curl --get http://localhost:8123/ --data-urlencode "query=SELECT count() FROM otel_traces"
curl --get http://localhost:8123/ --data-urlencode "query=SELECT count() FROM otel_logs"
```

The repository does not collect OTLP metrics or expose a tasks API.

## Apply changes

After changing backend code, rebuild, load, restart, and wait for the new pod:

```bash
yarn backend:reload
```

After changing Helm templates or values, deploy the chart and reload the backend:

```bash
yarn cluster:restart
```

## Troubleshooting

Show pod status and recent events:

```bash
kubectl --context kind-observability get pods --namespace telemetry-hub
kubectl --context kind-observability get events --namespace telemetry-hub --sort-by=.lastTimestamp
```

Follow component logs:

```bash
yarn logs:backend
yarn logs:collector
kubectl --context kind-observability logs --namespace telemetry-hub --selector app.kubernetes.io/name=clickhouse --tail=100
```

If the backend image cannot be pulled, load it again and restart the Deployment:

```bash
yarn backend:reload
```

If telemetry is absent, verify the path in order:

1. `curl http://localhost:3001/api/data` succeeds.
2. `yarn logs:backend` shows the request.
3. `yarn logs:collector` shows no ClickHouse export errors.
4. The direct ClickHouse counts above are greater than zero.

If the dashboard says the backend is unreachable but `curl http://localhost:3001/health` succeeds, check the browser port printed by Vite. A missing CORS origin usually appears in the UI as a network error.

Helm can be checked without changing the cluster:

```bash
helm lint --strict infra/charts/observability
helm template observability infra/charts/observability --namespace telemetry-hub > /tmp/telemetry-hub.yaml
```

## Cleanup

Delete the Helm release and Kind cluster:

```bash
yarn cluster:down
```

This permanently removes the locally stored telemetry.
