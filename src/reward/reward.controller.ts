import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpStatus,
  Inject,
  Query,
  Res,
  UsePipes,
} from '@nestjs/common';
import { RewardService } from './reward.service';
import { CreateRewardDto } from './dto/create-reward.dto';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { REQUEST } from '@nestjs/core';
import {
  IUser,
  UserRequest,
} from 'src/common/interfaces/user-request.interface';
import { Response } from 'express';
import { RequestValidationPipe } from 'src/common/pipes/request-validation.pipe';
import { handleResponse } from 'src/common/utils/util-functions.utility';

@Controller('reward')
@UseGuards(JwtAuthGuard)
@UsePipes(new RequestValidationPipe({ transform: true }))
export class RewardController {
  constructor(
    private readonly rewardService: RewardService,
    @Inject(REQUEST) private readonly request: UserRequest,
    private readonly dynamoService: DynamoService,
  ) {}

  private getUserDetails(): IUser {
    return this.request.user;
  }

  @Get()
  async getAllRewards(
    @Query('lastEvaluatedKey') lastEvaluatedKey: string | undefined,
    @Query('limit') limit: number,
    @Res() res: Response,
  ) {
    try {
      const { user_id } = this.getUserDetails();
      const data = await this.rewardService.getAllRewards({
        lastEvaluatedKey,
        limit: limit || 5,
        user_id,
      });

      if (!data) {
        return handleResponse(
          res,
          HttpStatus.NOT_FOUND,
          'Rewards not found',
          [],
          ['Reward not found'],
        );
      }

      return handleResponse(
        res,
        HttpStatus.OK,
        'Rewards retrieved successfully',
        data,
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error retrieving Rewards Records',
        error.message,
        [error.message],
      );
    }
  }

  @Post()
  async createReward(
    @Body() createRewardDto: CreateRewardDto,
    @Res() res: Response,
  ) {
    try {
      const { user_id } = this.getUserDetails();
      const reward_id =
        await this.rewardService.generateUniqueRewardId(user_id);
      await this.rewardService.createReward({
        reward_id,
        user_id,
        ...createRewardDto,
      });

      return handleResponse(
        res,
        HttpStatus.CREATED,
        'Reward created successfully',
        [],
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error creating Reward Records',
        error.message,
        ['Error creating Reward Records'],
      );
    }
  }
}
