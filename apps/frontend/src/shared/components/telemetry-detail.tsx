import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AttributeMap } from '@/shared/types/telemetry';

interface CopyButtonProps {
  value: string;
  label: string;
  className?: string;
}

export function CopyButton({ value, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn('h-7 shrink-0 gap-1.5 px-2 text-xs text-muted-foreground', className)}
      onClick={() => void copy()}
      aria-label={copied ? `${label} copied` : label}
      title={copied ? 'Copied' : label}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
    </Button>
  );
}

interface DetailFieldProps {
  label: string;
  children: ReactNode;
  mono?: boolean;
  copyValue?: string;
  className?: string;
}

export function DetailField({ label, children, mono, copyValue, className }: DetailFieldProps) {
  return (
    <div className={cn('min-w-0 border-b border-border/70 py-2.5 last:border-b-0', className)}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex min-w-0 items-start justify-between gap-2 text-sm">
        <span className={cn('min-w-0 break-all', mono && 'font-mono text-xs')}>{children}</span>
        {copyValue && <CopyButton value={copyValue} label={`Copy ${label.toLowerCase()}`} />}
      </dd>
    </div>
  );
}

interface AttributeSectionProps {
  title: string;
  attributes?: AttributeMap;
  emptyText?: string;
}

export function AttributeSection({ title, attributes = {}, emptyText = 'No attributes recorded.' }: AttributeSectionProps) {
  const entries = Object.entries(attributes).sort(([left], [right]) => left.localeCompare(right));

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold text-foreground">{title}</h3>
        <span className="text-xs tabular-nums text-muted-foreground">{entries.length}</span>
      </div>
      {entries.length > 0 ? (
        <dl className="overflow-hidden rounded-md border bg-background">
          {entries.map(([key, value]) => (
            <div
              key={key}
              className="grid grid-cols-[minmax(8rem,0.8fr)_minmax(0,1.2fr)] border-b border-border/70 px-3 py-2 text-xs last:border-b-0"
            >
              <dt className="break-all font-mono text-muted-foreground">{key}</dt>
              <dd className="break-all text-right font-mono">{String(value)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
          {emptyText}
        </div>
      )}
    </section>
  );
}

interface JsonPanelProps {
  value: unknown;
  label: string;
}

export function JsonPanel({ value, label }: JsonPanelProps) {
  const json = JSON.stringify(value, null, 2);

  return (
    <div className="relative overflow-hidden rounded-md border bg-muted/30">
      <CopyButton value={json} label={`Copy ${label}`} className="absolute right-2 top-2 bg-background/90" />
      <pre className="overflow-auto p-4 pr-20 font-mono text-xs leading-5">{json}</pre>
    </div>
  );
}
