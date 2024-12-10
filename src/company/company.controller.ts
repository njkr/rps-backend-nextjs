/* eslint-disable prettier/prettier */
import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyWalletDto } from './dto/create-company-wallet.dto';
import { v4 as uuidv4 } from 'uuid';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { UpdateCompanyWalletDto } from './dto/update-company-wallet.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';


@Controller('company')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly dynamoService: DynamoService,
  ) {}

  // company wallet
  @Get('all')
  @UseGuards(JwtAuthGuard)
  async getAllCompanyWallets(): Promise<any> {
    try {
      const data = await this.companyService.getAllCompanyWallets();
      return {
        statusCode: HttpStatus.OK,
        message: 'company wallet records fetched successfully',
        data,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error retrieving company wallet Records',
          data: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getCompanyWalletByCoinTypeAndSource(
    @Query('coinType') coinType: string,
    @Query('source') source: string,
  ): Promise<any> {
    try {
      const data =
        await this.companyService.getCompanyWalletByCoinTypeAndSource(
          coinType,
          source,
        );
      return {
        statusCode: HttpStatus.OK,
        message: 'company wallet records retrieved successfully',
        data,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error retrieving company wallet Records',
          data: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async addRowcompanyWallet(
    @Body() createcompanyWalletDto: CreateCompanyWalletDto,
  ) {
    try {
      //generate auto id
      let generatedId = uuidv4();
      while (
        await this.dynamoService.isIdExist(
          generatedId,
          this.companyService.getTablePK(),
          this.companyService.getTableName(),
        )
      ) {
        generatedId = uuidv4();
      }

      // add data
      const data = this.companyService.createCompanyWallet({
        ...createcompanyWalletDto,
        id: generatedId,
      });
      return {
        statusCode: HttpStatus.CREATED,
        message: 'transaction created successfully',
        data,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error adding to Company Wallet',
          data: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getWalletcompanyRow(@Param('id') id: string) {
    try {
      const data = await this.companyService.getCompanyWalletRowById(id);
      if (!data) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'record not found',
            data: null,
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        statusCode: HttpStatus.OK,
        message: 'company wallet record retrieved successfully',
        data,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error retrieving company wallet Record',
          data: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  async updateCompanyWallet(
    @Body() updateCompanyWalletDto: UpdateCompanyWalletDto,
  ): Promise<any> {
    try {
      const data = await this.companyService.updateCompanyWallet(
        updateCompanyWalletDto,
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'company wallet records updated successfully',
        data,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error updating company wallet Record',
          data: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteCompanyWalletById(@Param('id') id: string): Promise<any> {
    try {
      // check id exist
      const isIDExists = await this.dynamoService.isIdExist(
        id,
        this.companyService.getTablePK(),
        this.companyService.getTableName(),
      );
      if (!isIDExists) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Wallet record not found',
            data: null,
          },
          HttpStatus.NOT_FOUND,
        );
      }
      // delete data
      const data = this.companyService.deleteCompanyWalletById(id);
      return {
        statusCode: HttpStatus.OK,
        message: 'record deleted successfully',
        data,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error deleting company wallet Record',
          data: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

}
