/* eslint-disable prettier/prettier */
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isPlanFrequency', async: false })
export class IsPlanFrequencyConstraint implements ValidatorConstraintInterface {
  validate(planFrequency: string): boolean {
    const validCoinTypes = ['Once', 'Daily'];
    return validCoinTypes.includes(planFrequency);
  }

  defaultMessage(): string {
    return 'Plan Frequency must be either Once or Daily';
  }
}

export function IsPlanFrequency(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'IsPlanFrequency',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPlanFrequencyConstraint,
    });
  };
}
