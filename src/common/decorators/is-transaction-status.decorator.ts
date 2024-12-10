/* eslint-disable prettier/prettier */
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isTransactionStatus', async: false })
export class IsTransactionStatusConstraint implements ValidatorConstraintInterface {
  validate(transactionStatus: string): boolean {
    const validTransactionStatus = ['Pending', 'Success', 'Failed', 'Reverted'];
    return validTransactionStatus.includes(transactionStatus);
  }

  defaultMessage(): string {
    return `Transaction Status must be one of  'Pending', 'Success', 'Failed', 'Reverted'`;
  }
}

export function IsTransactionStatus(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'IsTransactionStatus',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsTransactionStatusConstraint,
    });
  };
}
