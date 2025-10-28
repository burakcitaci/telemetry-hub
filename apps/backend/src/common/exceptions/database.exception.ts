import { HttpStatus } from "@nestjs/common";
import { CustomException } from "./custom.exception";

export class DatabaseException extends CustomException {
  constructor(
    message: string,
    errorCode?: string,
    details?: any,
  ) {
    super(
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode || "DATABASE_ERROR",
      details,
    );
  }
}
