/* eslint-disable prettier/prettier */
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isRoomType', async: false })
export class IsRoomTypeConstraint implements ValidatorConstraintInterface {
  validate(roomType: string): boolean {
    const validCoinTypes = ['Private', 'Public', 'Matching' , 'AI'];
    return validCoinTypes.includes(roomType);
  }

  defaultMessage(): string {
    return `Room type must be one of 'Private', 'Public', 'Matching' , 'AI'`;
  }
}

export function IsRoomType(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isRoomType',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsRoomTypeConstraint,
    });
  };
}
