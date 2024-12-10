/* eslint-disable prettier/prettier */
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isRoomStatus', async: false })
export class IsRoomStatusConstraint implements ValidatorConstraintInterface {
  validate(roomStatus: string): boolean {
    const validCoinTypes = ['Pending', 'Full', 'Requested', 'Closed', 'Destroyed'];
    return validCoinTypes.includes(roomStatus);
  }

  defaultMessage(): string {
    return `Room Status must be one of ['Pending', 'Full', 'Requested', 'Closed', 'Destroyed']`;
  }
}

export function IsRoomStatus(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isRoomStatus',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsRoomStatusConstraint,
    });
  };
}
