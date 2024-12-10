/* eslint-disable prettier/prettier */
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isJackpotStatus', async: false })
export class IsJackpotStatusConstraint implements ValidatorConstraintInterface {
  validate(jackpotStatus: string): boolean {
    const validCoinTypes = ['Expired', 'Open', 'Closed'];
    return validCoinTypes.includes(jackpotStatus);
  }

  defaultMessage(): string {
    return 'Jackpot Status must be either Expired or Open or Closed';
  }
}

export function isJackpotStatus(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isJackpotStatus',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsJackpotStatusConstraint,
    });
  };
}
