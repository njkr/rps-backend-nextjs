/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  Controller,
  Get,
  Body,
  UseGuards,
  Patch,
  HttpStatus,
  Res,
  UsePipes,
  Inject,
  Param,
} from '@nestjs/common';
import { PlayerService } from './player.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { Response } from 'express';
import { RequestValidationPipe } from 'src/common/pipes/request-validation.pipe';
import { CognitoService } from 'src/auth/cognito.service';
import { REQUEST } from '@nestjs/core';
import { IUser, UserRequest } from 'src/common/interfaces/user-request.interface';
import { convertArrayToObject, handleResponse } from 'src/common/utils/util-functions.utility';
import { TicketService } from 'src/ticket/ticket.service';
import { ReferralPlayerDto } from './dto/referral-player.dto';
import { AppConfigService } from 'src/app-config/app-config.service';

@Controller('player')
@UseGuards(JwtAuthGuard)
@UsePipes(new RequestValidationPipe({ transform: true }))
export class PlayerController {
  constructor(
    private readonly playerService: PlayerService,
    private readonly cognitoService: CognitoService,
    @Inject(REQUEST) private readonly request: UserRequest,
    private readonly ticketService: TicketService,
    private readonly appConfigService: AppConfigService
  ) { }

  private getUserDetails(): IUser {
    return this.request.user;
  }

  private async getPlayerDetailsById(user_id: string, res: Response) {
    try {
      const data = await this.playerService.getPlayerDetails({ user_id });

      if (!data) {
        return handleResponse(res, HttpStatus.NOT_FOUND, 'Player not found', [], ['Player not found']);
      }

      const allUserTickets = await this.ticketService.getTicketsByUserWinnerType(user_id);

      const all_time_ticket = allUserTickets.reduce((acc, curr) => acc + curr.amount, 0) || 0;
      const current_ticket = allUserTickets
        .filter((ticket) => ticket.status === 'Valid')
        .reduce((acc, curr) => acc + curr.amount, 0) || 0;

      const guaranteed_jackpot = allUserTickets.filter((ticket) => ticket.status === 'guaranteed').length || 0;
      const jackpot = allUserTickets.filter((ticket) => !['guaranteed', null].includes(ticket.jackpot_winner_type)).length || 0;

      const first_referral_count = data.direct_referrals.length;
      let second_referral_count = 0;

      if (first_referral_count > 0) {

        const playerReferrals = await this.playerService.getUsersByUid(data.direct_referrals);
        second_referral_count = playerReferrals.reduce((acc, curr) => acc + curr.direct_referrals.length, 0);

      }

      return handleResponse(res, HttpStatus.OK, 'Player records retrieved successfully',
        { ...data, all_time_ticket, first_referral_count, second_referral_count, current_ticket, guaranteed_jackpot, jackpot },
        []);
    } catch (error) {
      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving player records', [], ['Error retrieving player records']);
    }
  }

  @Get()
  async getPlayerDetails(@Res() res: Response) {
    const authUser = this.getUserDetails();
    return this.getPlayerDetailsById(authUser.user_id, res);
  }

  @Get("images")
  async images(
    @Res() res: Response,
  ) {
    try {

      const data = await this.playerService.images();

      return handleResponse(res, HttpStatus.OK, 'images retrieved successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving images', error.message, [error.message]);

    }
  }

  // Route for player by ID
  @Get(':user_id')
  async getPlayerDetailsByIdRoute(@Param('user_id') user_id: string, @Res() res: Response) {
    return this.getPlayerDetailsById(user_id, res);
  }

  @Patch()
  async updatePlayer(
    @Body() updatePlayerDto: UpdatePlayerDto,
    @Res() res: Response,
  ) {
    try {
      const authUser = this.getUserDetails();

      const userDetails = await this.cognitoService.getUserDetails(
        authUser.user_id,
      )

      if (!userDetails) {
        return handleResponse(res, HttpStatus.NOT_FOUND, 'Player not found', [], ['Player not found']);
      }

      const userAttributes = convertArrayToObject(userDetails.UserAttributes);

      const data = await this.playerService.updatePlayer(authUser, updatePlayerDto);
      await this.cognitoService.updatePlayerBySub(authUser, { ...userAttributes, ...updatePlayerDto });
      await this.playerService.copyAndRenameImage(updatePlayerDto.profile_img, authUser.user_id);

      return handleResponse(res, HttpStatus.OK, 'Player records updated successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error updating player records', error.message, [error.message]);

    }
  }


  @Patch("referral")
  async addReferral(
    @Body() referralPlayerDto: ReferralPlayerDto,
    @Res() res: Response,
  ) {
    try {
      const authUser = this.getUserDetails();

      const userDetails = await this.playerService.getPlayerDetails(
        {
          user_id: authUser.user_id
        }
      )

      if (!userDetails) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'Player not found', [], ['Player not found']);

      }

      if (userDetails.referred_by) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'Player already referred', [], ['Player already referred']);

      }

      const referrerDetails = await this.playerService.getUserByUid(referralPlayerDto.referred_by);

      if (!referrerDetails) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'Referrer not found', [], ['Referrer not found']);

      }

      const { referral_max_count } = await this.appConfigService.getAppConfig();

      if (userDetails.direct_referrals.length >= referral_max_count) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'Referral limit reached', [], ['Referral limit reached']);

      }

      await this.playerService.updatePlayer(authUser, { referred_by: referralPlayerDto.referred_by });
      await this.playerService.updateDirectReferrals(referrerDetails.user_id, userDetails.uid);


      return handleResponse(res, HttpStatus.OK, 'Player referral updated successfully', [], []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error updating player referral', error.message, [error.message]);

    }
  }


}
