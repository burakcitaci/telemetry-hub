import { HttpStatus } from "@nestjs/common";
import { CustomException } from "./custom.exception";

export class ValidationException extends CustomException {
  constructor(
    message: string,
    errors?: any[],
  ) {
    super(
      message,
      HttpStatus.BAD_REQUEST,
      "VALIDATION_ERROR",
      errors,
    );
  }
}
