/* eslint-disable prettier/prettier */
import {
    registerDecorator,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsTransactionSourceType', async: false })
export class IsTransactionSourceTypeConstraint implements ValidatorConstraintInterface {
    validate(transactionStatus: string): boolean {
        const validTransactionStatus = ['Room', 'Matchmaking', 'Marketplace', "Game", "Payment", "Jackpot"];
        return validTransactionStatus.includes(transactionStatus);
    }

    defaultMessage(): string {
        return `Transaction Stauts must be one of 'Room', 'Matchmaking', 'Marketplace', 'Game', Payment , Jackpot`;
    }
}

export function IsTransactionSourceType(validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'IsTransactionSourceType',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsTransactionSourceTypeConstraint,
        });
    };
}
