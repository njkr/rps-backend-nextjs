/* eslint-disable prettier/prettier */
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isRoomWaitingStatus', async: false })
export class IsRoomWaitingStatusConstraint implements ValidatorConstraintInterface {
  validate(roomWaitingStatus: string): boolean {
    const validCoinTypes = ['Pending', 'Accepted', 'Refused'];
    return validCoinTypes.includes(roomWaitingStatus);
  }

  defaultMessage(): string {
    return `Room waiting list Status must be one of ['Pending', 'Accepted', 'Refused']`;
  }
}

export function IsRoomWaitingStatus(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isRoomWaitingStatus',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsRoomWaitingStatusConstraint,
    });
  };
}
