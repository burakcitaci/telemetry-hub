# TASK-INT-2 — Authenticated OTLP ingestion

- [x] NestJS validates `X-API-Key` before reading the request body.
- [x] Collector replaces resource `org.slug` and `team.id` before batching.
- [x] All Collector receivers require the private gateway token.
- [x] Collector ingress NetworkPolicy allows only backend pods.
- [ ] Provision the ingestion Secret and HTTPS ingress before deployment.

Clients send OTLP/HTTP JSON or Protobuf to the HTTPS backend endpoint
`/api/ingest/v1/traces`, `/api/ingest/v1/logs`, or `/api/ingest/v1/metrics`.
Use `OTEL_EXPORTER_OTLP_ENDPOINT=https://<backend>/api/ingest` and
`OTEL_EXPORTER_OTLP_HEADERS=x-api-key=<client-key>` with SDKs that support these variables.
Direct external OTLP/gRPC is not supported by this gateway.

The gateway validates the API key and constructs fresh internal headers. Incoming
tenant headers, cookies and the API key are never forwarded. Binary payloads are
not decoded by NestJS. Collector `resource/ingestion` deletes caller resource tenant
attributes, then sets them from authenticated gateway metadata. This happens before
`batch`, while each request still has its own metadata. Other attributes survive.

## Provisioning

Create a Kubernetes Secret named `telemetry-ingestion` (or configure
`ingestion.secretName`) with these keys. Do not commit its plaintext values:

- `INGESTION_COLLECTOR_TOKEN`: independent random URL-safe token, 32–256 characters;
  only backend and Collector receive it. Never distribute it to SDK clients.
- `INGESTION_KEYS_JSON`: simulated key database, a JSON array of records as below.
  Generate client keys with at least 32 random bytes and store only their SHA-256 digest.

```json
[
  {
    "keyHash": "<64 lowercase hexadecimal SHA-256 characters>",
    "orgSlug": "acme",
    "teamId": "platform",
    "expiresAt": 1893456000000,
    "revoked": false
  }
]
```

`expiresAt` is Unix time in milliseconds. Provision org/team associations through
the trusted control plane. The simulated database loads once at startup; changing
or revoking a key requires restarting the backend. Replace the Map with an indexed
database lookup plus bounded cache/invalidation for production lifecycle management.
An empty registry denies every client. Missing local Collector token returns 503;
the Helm deployments require the Secret before pods can start.

## Trust boundary

Expose only the backend HTTPS endpoint. Collector ports 4317/4318/4319 stay internal.
The existing demo exporter supplies the private token on 4318. It is trusted platform
telemetry; third-party keys are accepted only by the gateway on the backend.
NetworkPolicy enforcement depends on the CNI; Collector authentication also blocks
direct requests without the private token. Use TLS/mTLS or a service mesh for the
internal connection in a production cluster. Apply per-key quotas and rate limits
at ingress; the gateway bounds uncompressed bodies to 8 MiB and upstream requests to 10s.

## Validation

Backend tests verify key rejection, spoofed-header replacement, credential isolation
and JSON/Protobuf forwarding. Helm rendering verifies deployment wiring. Live
Collector/ClickHouse end-to-end verification remains a separate deployment check.
