/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Body, Controller, Delete, Get, HttpStatus, Inject, Param, Patch, Post, Query, Res, UseGuards, UsePipes } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RequestValidationPipe } from 'src/common/pipes/request-validation.pipe';
import { RoomWaitingListService } from './room-waiting-list.service';
import { IUser, UserRequest } from 'src/common/interfaces/user-request.interface';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { REQUEST } from '@nestjs/core';
import { CreateRoomRequestDto } from './dto/create-room-request.dto';
import { Response } from 'express';
import { GetRequestsWithStatusAndRoomDto } from './dto/get-requests-status-room.dto';
import { GetRequestsWithStatusAndUserDto } from './dto/get-requests-status-user.dto';
import { GetRequestsWithRoomDto } from './dto/get-requests-room.dto';
import { GetRequestsWithUserDto } from './dto/get-requests-user.dto';
import { UpdateRoomRequestDto } from './dto/update-room-request.dto';
import { AcceptRoomRequestDto } from './dto/accept-room-request.dto';
import { RoomService } from 'src/room/room.service';
import { UpdateRoomDto } from 'src/room/dto/update-room.dto';

@Controller('room-waiting-list')
@UseGuards(JwtAuthGuard)
@UsePipes(new RequestValidationPipe({ transform: true }))
export class RoomWaitingListController {
  constructor(
    private readonly roomWaitingListService: RoomWaitingListService,
    @Inject(REQUEST) private readonly request: UserRequest,
    private readonly dynamoService: DynamoService,
    private readonly roomService: RoomService,
  ) { }

  private getUserDetails(): IUser {
    return this.request.user;
  }

  @Post()
  async createRequests(
    @Body() createRoomRequestDto: CreateRoomRequestDto,
    @Res() res: Response,
  ) {
    try {
      // Get authenticated user details from the request
      const authUser = this.getUserDetails();

      // Delegate the logic to the service layer
      await this.roomWaitingListService.validateAndCreateRoomRequest(
        authUser,
        createRoomRequestDto,
      );


      return res.status(HttpStatus.CREATED).json({
        statusCode: HttpStatus.CREATED,
        message: 'game room request created successfully',
        data: {},
        errors: [],
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error creating game room request',
        errors: ['Error creating game room request'],
        data: error.message,
      });
    }
  }

  @Get('/all')
  async getAllRequests(@Res() res: Response) {
    try {
      const roomData = await this.roomWaitingListService.getAllRequest();

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: 'room requests retrieved successfully',
        data: roomData,
        errors: [],
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error retrieving all rooms',
        errors: [error.message],
        data: [],
      });
    }
  }

  @Get('all/status-room')
  async getAllRequestsBystatusRoom(
    @Query() getRequestsWithStatusAndRoomDto: GetRequestsWithStatusAndRoomDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const data = await this.roomWaitingListService.getRequestsByStatusAndRoom(
        getRequestsWithStatusAndRoomDto,
      );
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: 'all room requests fetched successfully',
        data: data,
        errors: [],
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error retrieving all room requets',
        errors: [error.message],
        data: [],
      });
    }
  }

  @Get('all/status-user')
  async getAllReuestsBystatusUser(
    @Query() getRequestsWithStatusAndUserDto: GetRequestsWithStatusAndUserDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const data = await this.roomWaitingListService.getRequestsByStatusAndUser(
        getRequestsWithStatusAndUserDto,
      );
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: 'all room requests fetched successfully',
        data: data,
        errors: [],
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error retrieving all room requets',
        errors: [error.message],
        data: [],
      });
    }
  }

  @Get('all/room')
  async getAllRequestsByRoom(
    @Query() getRequestsWithRoomDto: GetRequestsWithRoomDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const data = await this.roomWaitingListService.getRequestsByRoom(
        getRequestsWithRoomDto.room_id,
      );
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: 'all room requests fetched successfully',
        data: data,
        errors: [],
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error retrieving all room requets',
        errors: [error.message],
        data: [],
      });
    }
  }

  @Get('all/user')
  async getAllRequestsByUser(
    @Query() getRequestsWithUserDto: GetRequestsWithUserDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const data = await this.roomWaitingListService.getRequestsByUser(
        getRequestsWithUserDto.user_id,
      );
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: 'all room requests fetched successfully',
        data: data,
        errors: [],
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error retrieving all room requets',
        errors: [error.message],
        data: [],
      });
    }
  }

  @Get(':req_id')
  async getRequestById(@Param('req_id') req_id: string, @Res() res: Response) {
    try {

      // check id exist
      const isIDExists = await this.dynamoService.isIdExist(
        req_id,
        this.roomWaitingListService.getTablePK(),
        this.roomWaitingListService.getTableName(),
      );
      if (!isIDExists) {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'request not found',
          errors: ['request not found'],
          data: [],
        });
      }
      const data = await this.roomWaitingListService.getRequestById(req_id);

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: 'request retrieved successfully',
        data: data,
        errors: [],
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error retrieving room',
        errors: [error.message],
        data: [],
      });
    }
  }

  @Patch()
  async updateRequest(
    @Body() updateRoomRequestDto: UpdateRoomRequestDto,
    @Res() res: Response,
  ) {
    try {
      // get user from request
      const authUser = this.getUserDetails();

      // check id exist
      const isIDExists = await this.dynamoService.isIdExist(
        updateRoomRequestDto.id,
        this.roomWaitingListService.getTablePK(),
        this.roomWaitingListService.getTableName(),
      );
      if (!isIDExists) {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'request not found',
          errors: ['request not found'],
          data: [],
        });
      }

      const data = await this.roomWaitingListService.updateRequest(
        authUser,
        updateRoomRequestDto,
      );

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: 'request updated successfully',
        data: data,
        errors: [],
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error updating room Records',
        errors: [error.message],
        data: [],
      });
    }
  }

  @Patch("accept")
  async updateRequestAccept(
    @Body() acceptRoomRequestDto: AcceptRoomRequestDto,
    @Res() res: Response,
  ) {
    try {
      // get user from request
      const authUser = this.getUserDetails();

      // check id exist
      const roomData = await this.roomService.getRoomById(authUser, acceptRoomRequestDto.room_id);
      if (!roomData) {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'player room not found',
          errors: ['player room not found'],
          data: [],
        });
      } else if (roomData.status == "Full") {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'room is full',
          errors: ['room is full'],
          data: [],
        });
      }

      const requestData = await this.roomWaitingListService.getRequestById(acceptRoomRequestDto.id);
      if (!requestData) {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'request not found',
          errors: ['request not found'],
          data: [],
        });
      } else if (requestData.status !== "Pending") {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: `request is ${requestData.status}`,
          errors: [`request is ${requestData.status}`,],
          data: [],
        });
      }

      // update request
      const updateRoomRequestDto = new UpdateRoomRequestDto();
      updateRoomRequestDto.id = acceptRoomRequestDto.id;
      updateRoomRequestDto.status = "Accepted";

      await this.roomWaitingListService.updateRequest(
        authUser,
        updateRoomRequestDto,
      );

      // update room
      const updateRoomDto = new UpdateRoomDto();
      updateRoomDto.room_id = acceptRoomRequestDto.room_id;
      updateRoomDto.status = "Full";
      updateRoomDto.guest_id = requestData.user_id;
      await this.roomService.updateRoom(authUser, updateRoomDto);

      //get all waiting lit by pending status
      const roomsWaitingLists = await this.roomWaitingListService.getRequestsByStatusAndRoom(
        {
          room_id: acceptRoomRequestDto.room_id,
          status: "Pending"
        });

      // update all pending requests to Rejected
      for (const roomsWaitingList of roomsWaitingLists) {
        const updateRoomRequestDto = new UpdateRoomRequestDto();
        updateRoomRequestDto.id = roomsWaitingList.id;
        updateRoomRequestDto.status = "Rejected";
        await this.roomWaitingListService.updateRequest(
          authUser,
          updateRoomRequestDto,
        );
      }

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: 'request updated successfully',
        data: [],
        errors: [],
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error updating room Records',
        errors: [error.message],
        data: [],
      });
    }
  }

  @Delete(':req_id')
  async deleteRequest(@Param('req_id') req_id: string, @Res() res: Response) {
    try {
      // get user from request
      const authUser = this.getUserDetails();

      // check id exist
      const isIDExists = await this.dynamoService.isIdExist(
        req_id,
        this.roomWaitingListService.getTablePK(),
        this.roomWaitingListService.getTableName(),
      );
      if (!isIDExists) {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'request not found',
          errors: ['request not found'],
          data: [],
        });
      }

      await this.roomWaitingListService.deleteRoom(authUser, req_id);

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: 'request deleted successfully',
        data: {},
        errors: [],
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error deleting Room',
        errors: [error.message],
        data: [],
      });
    }
  }
}
