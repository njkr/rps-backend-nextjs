/* eslint-disable prettier/prettier */
import { HttpException, HttpStatus } from '@nestjs/common';

export class CustomUnauthorizedException extends HttpException {
  constructor(message: string, errors: string[]) {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: message,
        errors: errors,
        data: [],
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}
