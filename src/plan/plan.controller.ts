/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Res, UseGuards, UsePipes } from '@nestjs/common';
import { PlanService } from './plan.service';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Response } from 'express';
import { RequestValidationPipe } from 'src/common/pipes/request-validation.pipe';
import { CreatePlanDto } from './dto/create-Plan.dto';
import { UpdatePlanDto } from './dto/update-Plan.dto';
import { handleResponse } from 'src/common/utils/util-functions.utility';

@Controller('plan')
export class PlanController {
  constructor(
    private readonly planService: PlanService,
    private readonly dynamoService: DynamoService,
  ) { }

  @Get('all')
  async getAllPlans(@Res() res: Response): Promise<any> {
    try {
      const data = await this.planService.getAllPlans();

      return handleResponse(res, HttpStatus.OK, 'all Plans fetched successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all Plans', [], [error.message]);

    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async addPlan(@Body() createPlanDto: CreatePlanDto, @Res() res: Response) {
    try {
      // add data
      await this.planService.createPlan(createPlanDto);

      return handleResponse(res, HttpStatus.CREATED, 'Plan created successfully', [], []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error adding to Plan', [], [error.message]);

    }
  }

  @Get(':id')
  async getPlanByID(@Param('id') id: string, @Res() res: Response) {
    try {
      const data = await this.planService.getPlanById(id);
      if (!data) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'record not found', [], ['record not found']);

      }

      return handleResponse(res, HttpStatus.OK, 'Plan retrieved successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving Plan', [], [error.message]);

    }
  }

  @Get('/name/:name')
  async getPlanBYName(@Param('name') name: string, @Res() res: Response) {
    try {
      const data = await this.planService.getPlanByName(name);
      if (!data) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'record not found', [], ['record not found']);

      }

      return handleResponse(res, HttpStatus.OK, 'Plan retrieved successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving Plan', [], [error.message]);

    }
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  async updatePlan(
    @Body() updatePlanDto: UpdatePlanDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const data = await this.planService.updatePlan(updatePlanDto);

      return handleResponse(res, HttpStatus.OK, 'Plan updated successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error updating Plan', [], [error.message]);

    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deletePlan(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<any> {
    try {
      // check id exist
      const isIDExists = await this.dynamoService.isIdExist(
        id,
        this.planService.getTablePK(),
        this.planService.getTableName(),
      );
      if (!isIDExists) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'record not found', [], ['record not found']);

      }
      // delete data
      await this.planService.deletePlanById(id);

      return handleResponse(res, HttpStatus.OK, 'Plan deleted successfully', [], []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error deleting Plan', [], [error.message]);

    }
  }
}
