/* eslint-disable prettier/prettier */
import {
    registerDecorator,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isPlanAction', async: false })
export class IsPlanActionConstraint implements ValidatorConstraintInterface {
    validate(planFrequency: string): boolean {
        const validCoinTypes = ["free", "ads", "social"];
        return validCoinTypes.includes(planFrequency);
    }

    defaultMessage(): string {
        return 'Action must be either free , ads , social';
    }
}

export function isPlanAction(validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'isPlanAction',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsPlanActionConstraint,
        });
    };
}
