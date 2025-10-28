import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let errors = [];
    if (typeof exceptionResponse === "object" && "message" in exceptionResponse) {
      errors = Array.isArray(exceptionResponse.message)
        ? exceptionResponse.message
        : [exceptionResponse.message];
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: "Validation failed",
      errors,
    };

    response.status(status).json(errorResponse);
  }
}
