# TASK-TRACE-1 — Trace-detail query validation (2026-10-15)

- [x] Reproduced the reported GET /api/traces/detail?traceId=5059cad5a22d742694e38e851d32f4a0&env=all failure through real Nest HTTP routing and the production ValidationPipe. Baseline returned 400 with “property traceId should not exist”.
- [x] Reviewed the graph's TracesController, TraceIdParamDto, TelemetryQueryDto and shared ValidationPipe boundaries, then checked current source. Two whole-object Query parameters independently validated incompatible subsets of the same request.
- [x] Added TraceDetailQueryDto using the existing Swagger IntersectionType to combine trace ID and telemetry query validation. The detail route now validates one DTO. The global strict whitelist, authentication, tenant filtering, SQL and frontend request format are unchanged.
- [x] Added compiled-controller HTTP regression coverage for the exact request, omitted/default environment, explicit environment, the existing path-ID route, two authenticated organizations, unauthenticated access, missing/malformed/repeated IDs, invalid environment and unexpected parameters. Invalid requests never invoke the query service.
- [x] Backend production build, all 150 source/HTTP integration tests and git diff --check passed. Frontend code was unchanged in this fix, so its build was not repeated.
- [ ] Exactly one manual Graphify refresh was attempted; the installed CLI failed because its semantic backend is unconfigured for 43 document files. The graph remains stale; no repeat or hook was run. Generated graph artifacts are excluded from commits.

The source fix was not deployed as part of this work. The running backend must reload/rebuild before the browser can use it. Existing README and monitor-pagination work was preserved.
