/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  ValidationPipe,
  HttpException,
  HttpStatus,
  ValidationError,
} from '@nestjs/common';

@Injectable()
export class RequestValidationPipe extends ValidationPipe {
  protected exceptionFactory: (errors: ValidationError[]) => HttpException = (
    errors,
  ) => {
    const errorMessages = errors.map(
      //${error.property} has failed the following constraints:
      (error) =>
        `${Object.entries(error.constraints ?? {})
          .map(([key, message]) => JSON.stringify(message))
          .join(', ')}`,
    );

    return new HttpException(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        errors: errorMessages,
        data: [],
      },
      HttpStatus.BAD_REQUEST,
    );
  };
}

