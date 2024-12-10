/* eslint-disable prettier/prettier */
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isWalletType', async: false })
export class IsWalletTypeConstraint implements ValidatorConstraintInterface {
  validate(walletType: string): boolean {
    const validCoinTypes = ['Company', 'Client'];
    return validCoinTypes.includes(walletType);
  }

  defaultMessage(): string {
    return 'Wallet type must be either Comapny or Client';
  }
}

export function IsWalletType(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isWalletType',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsWalletTypeConstraint,
    });
  };
}
