/* eslint-disable prettier/prettier */
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isMarketplaceType', async: false })
export class IsMarketplaceTypeConstraint
  implements ValidatorConstraintInterface
{
  validate(marketplaceType: string): boolean {
    const validCoinTypes = ['Coins', 'Hands', 'Rooms'];
    return validCoinTypes.includes(marketplaceType);
  }

  defaultMessage(): string {
    return 'Marketplace Offer Type must be either Cpoins or Hands or Rooms';
  }
}

export function isMarketplaceType(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isMarketplaceType',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsMarketplaceTypeConstraint,
    });
  };
}
