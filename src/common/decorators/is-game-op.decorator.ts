/* eslint-disable prettier/prettier */
import {
    registerDecorator,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isGameOp', async: false })
export class IsGameOpConstraint implements ValidatorConstraintInterface {
    validate(planFrequency: string): boolean {
        const validCoinTypes = ["Rock", "Paper", "Scissor", "CoinTossWin", "CoinTossLose"];
        return validCoinTypes.includes(planFrequency);
    }

    defaultMessage(): string {
        return 'option must be either Rock, Paper, Scissor, CoinTossWin, CoinTossLose';
    }
}

export function isGameOp(validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'isGameOp',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsGameOpConstraint,
        });
    };
}
