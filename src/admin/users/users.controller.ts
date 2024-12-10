import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { RequestValidationPipe } from 'src/common/pipes/request-validation.pipe';
import {
  convertArrayToObject,
  getRoleByNumber,
  getStartAndEndDateIsoFormat,
  handleResponse,
} from 'src/common/utils/util-functions.utility';
import { Response } from 'express';
import { DateFilterDto } from '../dashboard/dto/date-filter.dto';
import { PlayerService } from 'src/player/player.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CognitoService } from 'src/auth/cognito.service';
import { CreateUserDto, EmailDto } from './dto/create-user.dto';
import { REQUEST } from '@nestjs/core';
import {
  IUser,
  UserRequest,
} from 'src/common/interfaces/user-request.interface';
import { RolesEnum } from 'src/common/enum/admin.enum';

@Controller('admin/dashboard/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly playerService: PlayerService,
    private readonly cognitoService: CognitoService,
    @Inject(REQUEST) private readonly request: UserRequest,
  ) {}

  private getUserDetails(): IUser {
    return this.request.user;
  }

  @Get('active')
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async getUsers(@Query() dateFilterDto: DateFilterDto, @Res() res: Response) {
    try {
      const { startDateIsoFormat, endDateIsoFormat } =
        getStartAndEndDateIsoFormat(
          dateFilterDto.startDate,
          dateFilterDto.endDate,
        );

      const data = await this.playerService.getPlayersByTimeFrame(
        {
          startDate: startDateIsoFormat,
          endDate: endDateIsoFormat,
        },
        'last_game_date',
      );

      return handleResponse(
        res,
        HttpStatus.OK,
        'users data fetched successfully',
        data,
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error fetching users data',
        error.message,
        [error.message],
      );
    }
  }

  @Get('all')
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async getAllUsers(@Res() res: Response) {
    try {
      const data = await this.playerService.getAllPlayers();

      return handleResponse(
        res,
        HttpStatus.OK,
        'all users data fetched successfully',
        data,
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error fetching all users data',
        error.message,
        [error.message],
      );
    }
  }

  @Get('all/cognito')
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async getAllCognitoUsers(@Res() res: Response) {
    try {
      let { Users } = await this.cognitoService.getAllUsers();

      Users = Users.map((user) => convertArrayToObject(user.Attributes));

      return handleResponse(
        res,
        HttpStatus.OK,
        'all users data fetched successfully',
        Users,
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error fetching all users data',
        error.message,
        [error.message],
      );
    }
  }

  @Post()
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async createUser(@Res() res: Response, @Body() createUserDto: CreateUserDto) {
    try {
      const { role } = this.getUserDetails();

      const userData = await this.cognitoService.getUserByEmail(
        createUserDto.email,
      );

      if (userData) {
        return handleResponse(
          res,
          HttpStatus.BAD_REQUEST,
          'user already exists',
          [],
          [],
        );
      }

      if (
        createUserDto.role === RolesEnum.SUPER_ADMIN &&
        role !== RolesEnum.SUPER_ADMIN
      ) {
        return handleResponse(
          res,
          HttpStatus.BAD_REQUEST,
          'Only super admin can create super admin',
          [],
          [],
        );
      }

      const user = await this.cognitoService.createUser(createUserDto);

      return handleResponse(
        res,
        HttpStatus.OK,
        'user created successfully',
        user,
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error creating user',
        error.message,
        [error.message],
      );
    }
  }

  @Patch()
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async updateUser(@Res() res: Response, @Body() createUserDto: CreateUserDto) {
    try {
      const { user_id, role } = this.getUserDetails();

      const userData = await this.cognitoService.getUserByEmail(
        createUserDto.email,
      );

      if (!userData) {
        return handleResponse(
          res,
          HttpStatus.BAD_REQUEST,
          'user not found',
          [],
          [],
        );
      }

      if (
        createUserDto.role === RolesEnum.SUPER_ADMIN &&
        role !== RolesEnum.SUPER_ADMIN
      ) {
        return handleResponse(
          res,
          HttpStatus.BAD_REQUEST,
          'Only super admin can create super admin',
          [],
          [],
        );
      }

      const { sub } = convertArrayToObject(userData.Attributes);

      if (sub === user_id && createUserDto.role !== role) {
        return handleResponse(
          res,
          HttpStatus.BAD_REQUEST,
          'same user cannot change his role',
          [],
          [],
        );
      }

      await this.cognitoService.updateUser(createUserDto);

      if (userData.UserStatus === 'CONFIRMED') {
        await this.playerService.updateUser(
          {
            user_id: sub,
          },
          {
            email: createUserDto.email,
            role: createUserDto.role,
            name: createUserDto.name,
            birth_date: createUserDto.birth_date,
          },
        );
      }

      return handleResponse(
        res,
        HttpStatus.OK,
        'user updated successfully',
        [],
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error updated user',
        error.message,
        [error.message],
      );
    }
  }

  @Delete(':email')
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async deleteUser(@Res() res: Response, @Param() emailDto: EmailDto) {
    try {
      const { user_id, role } = this.getUserDetails();

      const userData = await this.cognitoService.getUserByEmail(emailDto.email);

      if (!userData) {
        return handleResponse(
          res,
          HttpStatus.BAD_REQUEST,
          'user not found',
          [],
          [],
        );
      }

      const { sub, 'custom:isAdmin': isAdmin } = convertArrayToObject(
        userData.Attributes,
      );

      const userRole = getRoleByNumber(Number(isAdmin));

      if (sub === user_id) {
        return handleResponse(
          res,
          HttpStatus.BAD_REQUEST,
          'same user cannot cannot delete himself',
          [],
          [],
        );
      }

      if (
        userRole === RolesEnum.SUPER_ADMIN &&
        role !== RolesEnum.SUPER_ADMIN
      ) {
        return handleResponse(
          res,
          HttpStatus.BAD_REQUEST,
          'Only super admin can delete super admin',
          [],
          [],
        );
      }

      await this.cognitoService.deleteUser(emailDto.email);

      if (userData.UserStatus === 'CONFIRMED') {
        await this.playerService.deletePlayer(sub);
      }

      return handleResponse(
        res,
        HttpStatus.OK,
        'user deleted successfully',
        [],
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error deleting user',
        error.message,
        [error.message],
      );
    }
  }
}
