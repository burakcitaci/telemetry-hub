import { HttpException, HttpStatus } from "@nestjs/common";

export class CustomException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    code?: string,
    details?: any,
  ) {
    super(
      {
        message,
        statusCode: status,
        code: code || "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
        ...(details && { details }),
      },
      status,
    );
  }
}
