/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UsePipes,
  Inject,
  Res,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { RoomService } from './room.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RequestValidationPipe } from 'src/common/pipes/request-validation.pipe';
import { REQUEST } from '@nestjs/core';
import {
  IUser,
  UserRequest,
} from 'src/common/interfaces/user-request.interface';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { Response } from 'express';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { GetRoomByTypeDto } from './dto/get-room-by-type.dto';
import { GetRoomByStatusDto } from './dto/get-room-by-status.dto';
import { handleResponse, percentageCalculate } from 'src/common/utils/util-functions.utility';

@Controller('room')
@UsePipes(new RequestValidationPipe({ transform: true }))
export class RoomController {
  constructor(
    private readonly roomService: RoomService,
    @Inject(REQUEST) private readonly request: UserRequest,
    private readonly dynamoService: DynamoService,
  ) { }

  private getUserDetails(): IUser {
    return this.request.user;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createRoom(@Body() createRoomDto: CreateRoomDto, @Res() res: Response) {
    try {
      // Get authenticated user details from the request
      const authUser = this.getUserDetails();

      // Delegate the logic to the service layer
      const result = await this.roomService.validateAndCreateRoom(
        authUser,
        createRoomDto,
      );

      return handleResponse(res, HttpStatus.CREATED, 'game room created successfully', { ...result, ticket: percentageCalculate(result.amount, 10) }, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error creating game room Records', [], [error.message]);

    }
  }

  @Get('/all')
  async getAllRoom(@Res() res: Response) {
    try {
      const roomData = await this.roomService.getAllRooms();

      return handleResponse(res, HttpStatus.OK, 'all rooms fetched successfully', roomData, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all rooms', [], [error.message]);

    }
  }

  @Get('all/type')
  async getAllRoomsByType(
    @Query() getRoomByTypeDto: GetRoomByTypeDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const data = await this.roomService.getRoomsByType(
        getRoomByTypeDto.roomType,
      );

      return handleResponse(res, HttpStatus.OK, 'all rooms fetched successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all rooms', [], [error.message]);

    }
  }

  @Get('all/status')
  async getAllRoomsByStatus(
    @Query() getRoomByStatusDto: GetRoomByStatusDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const data = await this.roomService.getRoomsByStatus(
        getRoomByStatusDto.roomStatus,
      );

      return handleResponse(res, HttpStatus.OK, 'all rooms fetched successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all rooms', [], [error.message]);

    }
  }

  @Get('user-rooms')
  @UseGuards(JwtAuthGuard)
  async getAllUserRooms(@Res() res: Response): Promise<any> {
    try {
      // get user from request
      const authUser = this.getUserDetails();
      // get data
      const data = await this.roomService.getUserRooms(authUser);

      return handleResponse(res, HttpStatus.OK, 'all user Rooms fetched successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all user Rooms', [], [error.message]);

    }
  }

  @Get('user-rooms/type')
  @UseGuards(JwtAuthGuard)
  async getAllUserRoomsByType(
    @Query() getRoomByTypeDto: GetRoomByTypeDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      // get user from request
      const authUser = this.getUserDetails();

      const data = await this.roomService.getUserRoomsByType(
        getRoomByTypeDto.roomType,
        authUser,
      );

      return handleResponse(res, HttpStatus.OK, 'all user Rooms fetched successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all user Rooms', [], [error.message]);

    }
  }

  @Get('user-rooms/status')
  @UseGuards(JwtAuthGuard)
  async getAllUserRoomsByStatus(
    @Query() getRoomByStatusDto: GetRoomByStatusDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      // get user from request
      const authUser = this.getUserDetails();

      // get data
      const data = await this.roomService.getUserRoomsByStatus(
        getRoomByStatusDto.roomStatus,
        authUser,
      );

      return handleResponse(res, HttpStatus.OK, 'all user Rooms fetched successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all user Rooms', [], [error.message]);

    }
  }

  @Get(':room_id')
  @UseGuards(JwtAuthGuard)
  async getRoomById(@Param('room_id') room_id: string, @Res() res: Response) {
    try {

      // check id exist
      const [data] = await this.roomService.getRoomByRoomId(room_id);

      if (!data) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'room not found', [], ['room not found']);

      }


      return handleResponse(res, HttpStatus.OK, 'room retrieved successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving room', [], [error.message]);

    }
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  async updateRoom(@Body() updateRoomDto: UpdateRoomDto, @Res() res: Response) {
    try {
      // get user from request
      const authUser = this.getUserDetails();

      // check id exist
      const isIDExists = await this.dynamoService.isSubIdExist(
        authUser.user_id,
        this.roomService.getTablePK(),
        updateRoomDto.room_id,
        this.roomService.getTableSK(),
        this.roomService.getTableName(),
      );
      if (!isIDExists) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'room not found', [], ['room not found']);

      }

      const data = await this.roomService.updateRoom(authUser, updateRoomDto);

      return handleResponse(res, HttpStatus.OK, 'room records updated successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error updating room Records', [], [error.message]);

    }
  }

  @Delete(':room_id')
  @UseGuards(JwtAuthGuard)
  async deleteRoom(@Param('room_id') room_id: string, @Res() res: Response) {
    try {
      // get user from request
      const authUser = this.getUserDetails();

      // check id exist
      const isIDExists = await this.dynamoService.isSubIdExist(
        authUser.user_id,
        this.roomService.getTablePK(),
        room_id,
        this.roomService.getTableSK(),
        this.roomService.getTableName(),
      );
      if (!isIDExists) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'room not found', [], ['room not found']);

      }

      const data = await this.roomService.getRoomById(authUser, room_id);

      await this.roomService.handleRoomDestroy(data)

      return handleResponse(res, HttpStatus.OK, 'room destroyed successfully', {}, []);

    } catch (error) {

      console.log(error);
      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error deleting room', [], [error.message]);

    }
  }
}
