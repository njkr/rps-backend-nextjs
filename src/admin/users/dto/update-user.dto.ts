/* eslint-disable prettier/prettier */
import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsOptional, IsDateString, IsNotEmpty, IsEnum } from 'class-validator';
import { RolesEnum } from 'src/common/enum/admin.enum';
import { UpdatePlayerDto } from 'src/player/dto/update-player.dto';

export class UpdateUserDto extends PartialType(UpdatePlayerDto) {

    @IsString()
    @IsNotEmpty()
    readonly email: string;

    @IsEnum(RolesEnum)
    @IsOptional()
    readonly role?: RolesEnum;

    @IsDateString()
    @IsOptional()
    updated_date?: string = new Date().toISOString();
}