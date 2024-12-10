/* eslint-disable prettier/prettier */
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isMarketplaceStatus', async: false })
export class IsMarketplaceStatusConstraint
  implements ValidatorConstraintInterface
{
  validate(marketplaceStatus: string): boolean {
    const validCoinTypes = ['Sold', 'Open', 'Closed'];
    return validCoinTypes.includes(marketplaceStatus);
  }

  defaultMessage(): string {
    return 'Marketplace Offer Status must be either Sold or Open or Closed';
  }
}

export function isMarketplaceStatus(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isMarketplaceStatus',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsMarketplaceStatusConstraint,
    });
  };
}
