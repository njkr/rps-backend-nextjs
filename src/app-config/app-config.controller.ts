import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { handleResponse } from 'src/common/utils/util-functions.utility';
import { Response } from 'express';

@Controller('app-config')
export class AppConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  @Get()
  async getAppConfig(@Res() res: Response) {
    const data = await this.appConfigService.getAppConfig();
    return handleResponse(
      res,
      HttpStatus.OK,
      'Games count retrieved successfully',
      data,
      [],
    );
  }
}
