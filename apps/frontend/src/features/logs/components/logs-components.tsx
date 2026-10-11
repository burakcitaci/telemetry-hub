import type { ColumnDef } from "@tanstack/react-table";
import type { LogRecord } from "@/features/logs/types";
import { DataTableColumnHeader } from "@/shared/components/data-table";
import { Badge } from "@/components/ui/badge";
import { formatTelemetryTimestamp } from "@/shared/lib/telemetry";
import { useActiveTrace } from "@/shared/hooks/use-active-trace";

function LogTraceLink({ traceId }: { traceId: string }) {
  const { openTrace } = useActiveTrace();
  if (!/^[a-f0-9]{32}$/i.test(traceId) || /^0{32}$/.test(traceId))
    return <span className="text-xs text-muted-foreground">N/A</span>;
  return (
    <button
      type="button"
      title={traceId}
      aria-label={`Open trace ${traceId}`}
      className="whitespace-nowrap rounded-sm text-xs tracking-tight text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={(event) => {
        event.stopPropagation();
        openTrace(traceId);
      }}
    >
      {traceId.slice(0, 10)}…
    </button>
  );
}

export function severityBadge(severity: string) {
  const normalized = severity.toUpperCase();
  if (normalized === "ERROR" || normalized === "FATAL") {
    return <Badge className="rotate-90" variant="destructive"></Badge>;
  }
  if (normalized === "WARN" || normalized === "WARNING") {
    return <Badge className="rotate-90" variant="warning"></Badge>;
  }
  if (normalized === "INFO") return <Badge className="rotate-90" variant="info"></Badge>;
  return <Badge className="rotate-90" variant="secondary"></Badge>;
}

export const columns: ColumnDef<LogRecord>[] = [
  {
    accessorKey: "Timestamp",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Timestamp" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {severityBadge(row.original.SeverityText)}
        <span className="whitespace-nowrap text-xs tracking-tight text-muted-foreground">
          {formatTelemetryTimestamp(row.original.Timestamp)}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "ServiceName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Service" />
    ),
    cell: ({ row }) => (
      <Badge variant="outline">
        {row.original.ServiceName || "Unknown service"}
      </Badge>
    ),
  },
  {
    accessorKey: "Body",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Message" />
    ),
    cell: ({ row }) => (
      <span
        className="block max-w-xl truncate text-xs tracking-tight"
        title={row.original.Body}
      >
        {row.original.Body}
      </span>
    ),
  },
  {
    accessorKey: "TraceId",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Trace ID" />
    ),
    cell: ({ row }) => <LogTraceLink traceId={row.original.TraceId} />,
  },
];
