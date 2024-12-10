/* eslint-disable prettier/prettier */
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isTransactionOperation', async: false })
export class IsTransactionOperationConstraint implements ValidatorConstraintInterface {
  validate(transactionOperation: string): boolean {
    const validCoinTypes = ['Add','Remove'];
    return validCoinTypes.includes(transactionOperation);
  }

  defaultMessage(): string {
    return `Transaction Operation must be either Add or Remove`;
  }
}

export function IsTransactionOperation(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isTransactionOperation',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsTransactionOperationConstraint,
    });
  };
}
