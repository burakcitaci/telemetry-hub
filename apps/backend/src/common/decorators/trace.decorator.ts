import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { trace, context } from "@opentelemetry/api";

export const Trace = createParamDecorator(
  (极ta: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tracer = trace.getTracer("backend-service");
    
    return {
      startSpan: (name: string, attributes?: Record<string, any>) => {
        const span = tracer.startSpan(name, { attributes });
        const activeContext = trace.setSpan(context.active(), span);
        return { span, context: activeContext };
      },
      getTracer: () => tracer,
      currentSpan: () => trace.getSpan(context.active()),
    };
  },
);
