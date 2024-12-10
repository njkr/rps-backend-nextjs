import {
  Controller,
  Get,
  Param,
  Inject,
  UseGuards,
  Query,
  HttpStatus,
  Res,
  UsePipes,
} from '@nestjs/common';
import { TicketService } from './ticket.service';
import { REQUEST } from '@nestjs/core';
import {
  IUser,
  UserRequest,
} from 'src/common/interfaces/user-request.interface';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Response } from 'express';
import { RequestValidationPipe } from 'src/common/pipes/request-validation.pipe';
import { handleResponse } from 'src/common/utils/util-functions.utility';

@Controller('ticket')
@UseGuards(JwtAuthGuard)
@UsePipes(new RequestValidationPipe({ transform: true }))
export class TicketController {
  constructor(
    private readonly ticketService: TicketService,
    @Inject(REQUEST) private readonly request: UserRequest,
  ) {}

  private getUserDetails(): IUser {
    return this.request.user;
  }

  @Get('/all')
  async getAllTicketById(
    @Query('lastEvaluatedKey') lastEvaluatedKey: string | undefined,
    @Query('limit') limit: number,
    @Res() res: Response,
  ) {
    try {
      const { user_id } = this.getUserDetails();
      const data = await this.ticketService.getAllTicketById({
        lastEvaluatedKey,
        limit: limit || 5,
        user_id,
      });

      if (!data) {
        return handleResponse(
          res,
          HttpStatus.NOT_FOUND,
          'Tickets not found',
          [],
          ['Tickets not found'],
        );
      }

      return handleResponse(
        res,
        HttpStatus.OK,
        'Tickets retrieved successfully',
        data,
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error retrieving Tickets',
        ['Error retrieving Ticket Records'],
        [error.message],
      );
    }
  }

  @Get(':ticket_id')
  async getTicketById(
    @Param('ticket_id') ticket_id: string,
    @Res() res: Response,
  ) {
    try {
      const { user_id } = this.getUserDetails();
      const data = await this.ticketService.getTicketById({
        ticket_id,
        user_id,
      });

      if (!data) {
        return handleResponse(
          res,
          HttpStatus.NOT_FOUND,
          'Ticket not found',
          [],
          ['Ticket not found'],
        );
      }

      return handleResponse(
        res,
        HttpStatus.OK,
        'Ticket retrieved successfully',
        data,
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error retrieving Ticket Records',
        error.message,
        [error.message],
      );
    }
  }
}
