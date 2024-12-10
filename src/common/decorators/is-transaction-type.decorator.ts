/* eslint-disable prettier/prettier */
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isTransactionType', async: false })
export class IsTransactionTypeConstraint implements ValidatorConstraintInterface {
  private readonly validCoinTypes = [
    'Win',
    'Loss',
    'Recharge',
    'Withdraw',
    'Fees',
    'Service Fee',
    'Jackpot First Player',
    'Jackpot Member Player',
    'Jackpot Add Pool',
    "Jackpot Gas Fee",
    "Jackpot Won",
    "Jackpot Free Won",
    "First Referral Earning",
    "Second Referral Earning",
    "Jackpot Free Won",
    'Lucky Coin Sale',
    'Lucky Coin Buy',
    'Lucky Coin For Loss',
    'Marketplace Revenue',
    'Marketplace Expenses',
    'Game',
    'Game Ai'
  ];
  validate(transactionType: string): boolean {
    return this.validCoinTypes.includes(transactionType);
  }

  defaultMessage(): string {
    return `Transaction type must be one of this options ${this.validCoinTypes.toString()}`;
  }
}

export function IsTransactionType(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isTransactionType',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsTransactionTypeConstraint,
    });
  };
}
