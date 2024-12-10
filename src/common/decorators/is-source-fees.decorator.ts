/* eslint-disable prettier/prettier */
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isCoinType', async: false })
export class IsSourceFeeConstraint implements ValidatorConstraintInterface {
  validate(coinType: string): boolean {
    const validCoinTypes = [
      'marketplace_fee',
      'rewards_fee',
      'jackpot_return_back',
    ];
    return validCoinTypes.includes(coinType);
  }

  defaultMessage(): string {
    return 'Source Fee must be either Marketplace Fee or Rewards Fee or Jackpot Return Back';
  }
}

export function IsSourceFee(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isSourceFee',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSourceFeeConstraint,
    });
  };
}
