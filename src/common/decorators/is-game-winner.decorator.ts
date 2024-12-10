/* eslint-disable prettier/prettier */
import {
    registerDecorator,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isGameWinner', async: false })
export class IsGameWinnerConstraint implements ValidatorConstraintInterface {
    validate(planFrequency: string): boolean {
        const validCoinTypes = ["first_player", "second_player", "draw"];
        return validCoinTypes.includes(planFrequency);
    }

    defaultMessage(): string {
        return 'option must be either first_player, second_player, draw';
    }
}

export function isGameWinner(validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'isGameWinner',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsGameWinnerConstraint,
        });
    };
}
