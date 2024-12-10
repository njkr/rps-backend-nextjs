import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isRoomPassRequired', async: false })
export class RoomPassConstraint implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    const { type, room_pass } = args.object as any;
    if (type === 'Private') {
      return room_pass !== null && room_pass !== undefined && room_pass !== '';
    }
    return true; // for non-private types, no validation needed
  }

  defaultMessage() {
    return `room_pass is required when type is Private.`;
  }
}

export function IsRoomPassRequired(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isRoomPassRequired',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: RoomPassConstraint,
    });
  };
}
