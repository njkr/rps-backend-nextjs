/* eslint-disable prettier/prettier */
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isCoinType', async: false })
export class IsCoinTypeConstraint implements ValidatorConstraintInterface {
  validate(coinType: string): boolean {
    const validCoinTypes = ['LC', 'Dollar'];
    return validCoinTypes.includes(coinType);
  }

  defaultMessage(): string {
    return 'Coin type must be either LC or Dollar';
  }
}

export function IsCoinType(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isCoinType',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCoinTypeConstraint,
    });
  };
}
