/* eslint-disable prettier/prettier */
import {   Min, IsNotEmpty, IsInt } from 'class-validator';

export class RangeAmountDto {

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  amount: number;
}
