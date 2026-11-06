# Local backend development

Use Node.js 24+ and Yarn 1.22.22. From the repository root, install dependencies and start the
backend:

```sh
yarn install --frozen-lockfile
yarn dev:backend
```

`dev:backend` builds the NestJS application with TypeScript, then starts the bundled output. This
preserves the decorator metadata NestJS needs for dependency injection and request validation.
Restart the command after changing backend code.

The backend needs reachable ClickHouse and OpenTelemetry Collector services. For the standard local
Kind setup, start the platform first:

```sh
yarn setup
yarn cluster:init
yarn ports:clickhouse
```

In another terminal, forward the Collector's OTLP/HTTP ingestion receiver:

```sh
kubectl --context kind-observability -n telemetry-hub port-forward svc/opentelemetry-collector 4319:4319
```

Configure local backend settings in `apps/backend/.env`. Use the internal Collector token from the
local setup; do not commit or share the file. `AUTH_DB_PATH` defaults to a local SQLite database,
separate from the Kind backend's persistent database. For the exact required variables and local
onboarding details, see the [advanced setup guide](./advanced-setup.en.md#local-backend-development).

Run backend tests and type checking from the root:

```sh
yarn check:backend
yarn test:backend
```

For a complete repository check, use `yarn verify`. To update the Kind backend after code changes,
use `yarn cluster:reload-backend`; this does not change the local development backend process.
