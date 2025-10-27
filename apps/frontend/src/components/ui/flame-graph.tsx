import React, { useMemo, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface Span {
  TraceId: string;
  SpanId: string;
  ParentSpanId: string;
  SpanName: string;
  ServiceName: string;
  Timestamp: string;
  Duration: number;
  StatusCode: string;
  SpanAttributes?: Record<string, string>;
}

interface FlameGraphNode {
  span: Span;
  x: number;
  y: number;
  width: number;
  height: number;
  children: FlameGraphNode[];
  depth: number;
  selfDuration: number;
}

interface FlameGraphProps {
  spans: Span[];
  onSpanClick?: (span: Span) => void;
  onSpanHover?: (span: Span | null) => void;
  height?: number;
}

const SERVICE_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Light Yellow
  '#BB8FCE', // Light Purple
  '#85C1E9', // Light Blue
];

const STATUS_COLORS = {
  'ERROR': '#E74C3C', // Red
  'OK': '#27AE60',    // Green
  'default': '#95A5A6' // Gray
};

export function FlameGraph({
  spans,
  onSpanClick,
  onSpanHover,
  height = 400
}: FlameGraphProps) {
  const [hoveredSpan, setHoveredSpan] = useState<Span | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Generate service color mapping
  const serviceColorMap = useMemo(() => {
    const services = [...new Set(spans.map(span => span.ServiceName))];
    const colorMap: Record<string, string> = {};

    services.forEach((service, index) => {
      colorMap[service] = SERVICE_COLORS[index % SERVICE_COLORS.length];
    });

    return colorMap;
  }, [spans]);

  // Calculate max depth and proper height
  const { maxDepth, flameGraphData } = useMemo(() => {
    if (spans.length === 0) return { maxDepth: 0, flameGraphData: null };

    // Create span map for quick lookup
    const spanMap = new Map<string, Span>();
    spans.forEach(span => spanMap.set(span.SpanId, span));

    // Find root spans (no parent)
    const rootSpans = spans.filter(span => !span.ParentSpanId);

    // Calculate total trace duration
    const minTimestamp = Math.min(...spans.map(s => new Date(s.Timestamp).getTime()));
    const maxEndTime = Math.max(...spans.map(s => {
      const startTime = new Date(s.Timestamp).getTime();
      const duration = s.Duration / 1000000; // Convert nanoseconds to milliseconds
      return startTime + duration;
    }));
    const totalDuration = maxEndTime - minTimestamp;

    const calculateMaxDepth = (nodes: FlameGraphNode[]): number => {
      if (nodes.length === 0) return 0;
      return Math.max(...nodes.map(node => {
        const childDepth = calculateMaxDepth(node.children);
        return node.depth + childDepth;
      }));
    };

    const buildTree = (parentSpan: Span | null, depth: number = 0): FlameGraphNode[] => {
      if (!parentSpan) {
        // Build multiple root spans
        const nodes = rootSpans.map(rootSpan => {
          const startTime = new Date(rootSpan.Timestamp).getTime();
          const duration = rootSpan.Duration / 1000000;
          const x = ((startTime - minTimestamp) / totalDuration) * 100;
          const width = (duration / totalDuration) * 100;

          const node: FlameGraphNode = {
            span: rootSpan,
            x,
            y: depth * 20,
            width: Math.max(width, 0.1),
            height: 20,
            depth,
            selfDuration: duration,
            children: []
          };

          // Build children recursively
          const children = spans
            .filter(s => s.ParentSpanId === rootSpan.SpanId)
            .sort((a, b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime());

          node.children = children.flatMap(child => buildTree(child, depth + 1));

          return node;
        });

        return nodes;
      }

      const startTime = new Date(parentSpan.Timestamp).getTime();
      const duration = parentSpan.Duration / 1000000;
      const x = ((startTime - minTimestamp) / totalDuration) * 100;
      const width = (duration / totalDuration) * 100;

      const node: FlameGraphNode = {
        span: parentSpan,
        x,
        y: depth * 20,
        width: Math.max(width, 0.1),
        height: 20,
        depth,
        selfDuration: duration,
        children: []
      };

      // Build children recursively
      const children = spans
        .filter(s => s.ParentSpanId === parentSpan.SpanId)
        .sort((a, b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime());

      node.children = children.flatMap(child => buildTree(child, depth + 1));

      return [node];
    };

    const nodes = buildTree(null);
    const maxDepth = calculateMaxDepth(nodes);

    return { maxDepth, flameGraphData: nodes };
  }, [spans]);

  const handleMouseEnter = useCallback((span: Span, event: React.MouseEvent) => {
    setHoveredSpan(span);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
    onSpanHover?.(span);
  }, [onSpanHover]);

  const handleMouseLeave = useCallback(() => {
    setHoveredSpan(null);
    onSpanHover?.(null);
  }, [onSpanHover]);

  const handleClick = useCallback((span: Span) => {
    onSpanClick?.(span);
  }, [onSpanClick]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.5, 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.5, 0.1));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(zoom * delta, 0.1), 10);
    setZoom(newZoom);
  }, [zoom]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const formatDuration = (nanoseconds: number) => {
    const ms = nanoseconds / 1000000;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getSpanColor = (span: Span) => {
    if (span.StatusCode === 'ERROR') {
      return STATUS_COLORS.ERROR;
    }
    if (span.StatusCode === 'OK') {
      return STATUS_COLORS.OK;
    }
    return serviceColorMap[span.ServiceName] || STATUS_COLORS.default;
  };

  const renderNode = (node: FlameGraphNode): React.ReactNode => {
    if (!node) return null;

    return (
      <g key={node.span.SpanId}>
        {/* Render current span */}
        <rect
          x={`${node.x}%`}
          y={node.y}
          width={`${node.width}%`}
          height={node.height}
          fill={getSpanColor(node.span)}
          stroke="#fff"
          strokeWidth="1"
          rx="2"
          className="cursor-pointer transition-opacity hover:opacity-80"
          onMouseEnter={(e) => handleMouseEnter(node.span, e)}
          onMouseLeave={handleMouseLeave}
          onClick={() => handleClick(node.span)}
        />

        {/* Render span name if wide enough */}
        {node.width > 5 && (
          <text
            x={`${node.x + node.width / 2}%`}
            y={node.y + node.height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            className="text-xs font-medium fill-white pointer-events-none select-none"
            style={{
              fontSize: node.width > 15 ? '12px' : '10px',
              fontWeight: node.width > 15 ? '500' : '400'
            }}
          >
            {node.span.SpanName}
          </text>
        )}

        {/* Render children */}
        {node.children.map(child => renderNode(child))}
      </g>
    );
  };

  const renderNodes = (nodes: FlameGraphNode[]): React.ReactNode => {
    return nodes.map(node => renderNode(node));
  };

  if (!flameGraphData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">No spans to display</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Flame Graph</CardTitle>
        <CardDescription>
          Visual representation of span execution hierarchy and duration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground ml-2">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <div
            className="overflow-hidden border rounded"
            style={{ height: height }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              className="cursor-grab active:cursor-grabbing"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transformOrigin: '0 0',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
              }}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              <g transform={`translate(0, 10)`}>
                {renderNodes(flameGraphData)}
              </g>
            </svg>
          </div>

          {/* Tooltip */}
          {hoveredSpan && (
            <div
              className="absolute z-10 bg-popover text-popover-foreground border rounded-md shadow-md p-3 text-sm pointer-events-none"
              style={{
                left: tooltipPosition.x + 10,
                top: tooltipPosition.y - 10,
                maxWidth: '300px'
              }}
            >
              <div className="font-medium">{hoveredSpan.SpanName}</div>
              <div className="text-muted-foreground">Service: {hoveredSpan.ServiceName}</div>
              <div className="text-muted-foreground">Duration: {formatDuration(hoveredSpan.Duration)}</div>
              <div className="text-muted-foreground">Status: {hoveredSpan.StatusCode || 'UNSET'}</div>
              {hoveredSpan.SpanAttributes && Object.keys(hoveredSpan.SpanAttributes).length > 0 && (
                <div className="mt-2">
                  <div className="font-medium text-xs">Attributes:</div>
                  {Object.entries(hoveredSpan.SpanAttributes).slice(0, 3).map(([key, value]) => (
                    <div key={key} className="text-xs text-muted-foreground">
                      {key}: {value}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.ERROR }}></div>
            <span>Error</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.OK }}></div>
            <span>Success</span>
          </div>
          {Object.entries(serviceColorMap).slice(0, 6).map(([service, color]) => (
            <div key={service} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: color }}></div>
              <span>{service}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
