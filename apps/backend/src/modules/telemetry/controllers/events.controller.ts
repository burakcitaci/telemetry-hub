import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";
import { CentralLoggerService } from "../../../common/logger/central-logger.service";
import { ClickhouseService } from "../services/clickhouse.service";

const POLL_INTERVAL_MS = 3_000;
const HEARTBEAT_INTERVAL_MS = 15_000;
const COLLECTOR_GRACE_MS = 15_000;

@Controller("api/events")
export class EventsController {
  constructor(
    private readonly clickhouse: ClickhouseService,
    private readonly logger: CentralLoggerService,
  ) {}

  @Get("stream")
  stream(@Res() res: Response): void {
    const connectionStartTime = Date.now();
    let cursor = new Date();
    let closed = false;
    let pollTimer: NodeJS.Timeout | undefined;
    let traceSignal = "";
    let logSignal = "";

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    this.logger.logWithAttributes(
      "Client connected to SSE stream",
      "INFO",
      {
        endpoint: "/api/events/stream",
        userAgent: res.req.headers["user-agent"] ?? "unknown",
      },
      "EventsController",
    );

    const write = (chunk: string): boolean => {
      if (closed || res.writableEnded) {
        return false;
      }

      if (!res.write(chunk)) {
        // This stream only carries invalidation signals. A slow client can
        // reconnect instead of making the server buffer without a bound.
        closed = true;
        res.end();
        return false;
      }

      return true;
    };

    const sendEvent = (data: unknown): boolean => {
      return write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const poll = async () => {
      const nextCursor = new Date();
      const queryFrom = new Date(cursor.getTime() - COLLECTOR_GRACE_MS);

      try {
        // ClickHouse reduces each grace window to a constant-size signal, so
        // bursts cannot create unbounded application memory or query loops.
        const [nextTraceSignal, nextLogSignal] = await Promise.all([
          this.clickhouse.getRecentTraceSignal({
            since: queryFrom,
            until: nextCursor,
          }),
          this.clickhouse.getRecentLogSignal({
            since: queryFrom,
            until: nextCursor,
          }),
        ]);
        const nextTraceKey = this.signalKey(nextTraceSignal);
        const nextLogKey = this.signalKey(nextLogSignal);
        const tracesChanged =
          nextTraceSignal.eventCount > 0 && nextTraceKey !== traceSignal;
        const logsChanged =
          nextLogSignal.eventCount > 0 && nextLogKey !== logSignal;

        traceSignal = nextTraceKey;
        logSignal = nextLogKey;

        if (!closed && (tracesChanged || logsChanged)) {
          sendEvent({
            type: "update",
            timestamp: nextCursor.toISOString(),
            tracesChanged,
            logsChanged,
          });
        }

        cursor = nextCursor;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown polling error";
        const stack = error instanceof Error ? error.stack : undefined;
        this.logger.error(
          `Unable to poll telemetry updates: ${message}`,
          stack,
          "EventsController",
        );
      } finally {
        if (!closed) {
          pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
        }
      }
    };

    const connected = sendEvent({
      type: "connected",
      message: "SSE stream established",
      timestamp: cursor.toISOString(),
    });
    if (connected) {
      pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    const heartbeatTimer = connected
      ? setInterval(() => {
          write(`: heartbeat ${new Date().toISOString()}\n\n`);
        }, HEARTBEAT_INTERVAL_MS)
      : undefined;

    res.once("close", () => {
      closed = true;
      if (pollTimer) {
        clearTimeout(pollTimer);
      }
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }

      this.logger.logWithAttributes(
        "Client disconnected from SSE stream",
        "INFO",
        {
          endpoint: "/api/events/stream",
          connectionDurationMs: Date.now() - connectionStartTime,
        },
        "EventsController",
      );
    });
  }

  private signalKey(signal: {
    eventCount: number;
    fingerprint: string;
  }): string {
    return `${signal.eventCount}:${signal.fingerprint}`;
  }
}
