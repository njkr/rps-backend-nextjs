import { PartialType } from '@nestjs/mapped-types';
import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsEnum,
  IsDateString,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { subYears } from 'date-fns';
import { RolesEnum } from 'src/common/enum/admin.enum';

// Custom validator for minimum age
export function IsOlderThan(
  minAge: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isOlderThan',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          const dateOfBirth = new Date(value);
          const todayMinusMinAge = subYears(new Date(), minAge);
          return dateOfBirth <= todayMinusMinAge;
        },
        defaultMessage() {
          return `User must be at least ${minAge} years old.`;
        },
      },
    });
  };
}

export enum GenderEnum {
  MALE = 'male',
  FEMALE = 'female',
  OTHERS = 'others',
}

export class EmailDto {
  @IsEmail()
  @IsNotEmpty()
  readonly email: string;
}

export class CreateUserDto extends PartialType(EmailDto) {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsEnum(GenderEnum)
  @IsNotEmpty()
  readonly gender: GenderEnum;

  @IsDateString()
  @IsNotEmpty()
  @IsOlderThan(18, { message: 'User must be 18 years or older.' })
  readonly birth_date: string;

  @IsEnum(RolesEnum)
  @IsNotEmpty()
  readonly role: RolesEnum;
}
