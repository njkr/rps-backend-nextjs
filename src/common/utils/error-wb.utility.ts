/* eslint-disable prettier/prettier */

export function emitError(server: any, httpCode: number, message: string, data: any) {
  server.emit('error', {
    httpCode,
    message,
    data,
  });
}
