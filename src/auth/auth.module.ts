/* eslint-disable prettier/prettier */
// cognito.module.ts
import { Module } from '@nestjs/common';
import { CognitoService } from './cognito.service'; // Adjust the path as necessary
import { AppConfigService } from '../config/config.service';

@Module({
  providers: [CognitoService, AppConfigService],
  exports: [CognitoService],
})
export class AuthModule {}
