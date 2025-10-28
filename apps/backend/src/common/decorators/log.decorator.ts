import { createParamDecorator, ExecutionContext, Logger } from "@nestjs/common";

export const Log = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const className = ctx.getClass().name;
    const handlerName = ctx.getHandler().name;
    
    return new Logger(`${className}.${handlerName}`);
  },
);
