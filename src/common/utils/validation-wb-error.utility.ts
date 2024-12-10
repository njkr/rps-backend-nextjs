/* eslint-disable prettier/prettier */
import { BadRequestException } from '@nestjs/common';

export function handleValidationErrors(
  createInventoryDto: any,
  server: any,
): boolean {
  if (createInventoryDto instanceof BadRequestException) {
    const errorMessage = createInventoryDto
      ?.getResponse()
      ['message'].map((error) => {
        return `${error.property} has wrong value ${error.value}, ${Object.values(error.constraints).join(', ')}`;
      })
      .join(', ');

    // trigger error
    server.emit('error', {
      httpCode: 422,
      message: errorMessage,
      data: errorMessage,
    });
    return true;
  }
  return false;
}
