/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  ListUsersCommand,
  AdminCreateUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { AppConfigService } from 'src/config/config.service';
import { CreateUserDto } from 'src/admin/users/dto/create-user.dto';
import { getNumberByRoleName } from 'src/common/utils/util-functions.utility';
import { PlayerDto } from 'src/player/dto/player.dto';
import { UpdatePlayerDto } from 'src/player/dto/update-player.dto';

@Injectable()
export class CognitoService {
  private readonly cognitoClient: CognitoIdentityProviderClient;
  constructor(private readonly appConfig: AppConfigService) {
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: this.appConfig.awsRegion,
      credentials: {
        accessKeyId: this.appConfig.accessKeyId,
        secretAccessKey: this.appConfig.secretAccessKey,
      },
    });
  }

  async checkIfUserExists(userId: string): Promise<any> {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.appConfig.cognitoUserPoolId,
        Username: userId,
      });
      const user = await this.cognitoClient.send(command);
      return user;
    } catch (error) {
      if (error.name === 'UserNotFoundException') {
        return false;
      }
      throw error;
    }
  }

  async getUserDetails(userId: string): Promise<any> {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.appConfig.cognitoUserPoolId,
        Username: userId,
      });
      const user = await this.cognitoClient.send(command);
      return user;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<any> {
    try {
      const params = {
        UserPoolId: this.appConfig.cognitoUserPoolId,
      };
      const command = new ListUsersCommand(params);
      const users = await this.cognitoClient.send(command);
      return users;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<any> {
    try {
      const params = {
        UserPoolId: this.appConfig.cognitoUserPoolId,
        Filter: `email = "${email}"`,
        Limit: 1
      };
      const command = new ListUsersCommand(params);
      const { Users } = await this.cognitoClient.send(command);
      return Users[0] || null;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async createUser(createUserDto: CreateUserDto): Promise<any> {
    try {

      const role = getNumberByRoleName(createUserDto.role).toString();

      const command = new AdminCreateUserCommand({
        UserPoolId: this.appConfig.cognitoUserPoolId,
        Username: createUserDto.email,
        UserAttributes: [
          { Name: "email", Value: createUserDto.email },
          { Name: "birthdate", Value: createUserDto.birth_date },
          { Name: "name", Value: createUserDto.name },
          { Name: "gender", Value: createUserDto.gender },
          { Name: 'custom:isAdmin', Value: role },
        ],
        DesiredDeliveryMediums: ["EMAIL"],
        ForceAliasCreation: true
      });


      const user = await this.cognitoClient.send(command);

      return user;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async updateUser(updateUserDto: CreateUserDto): Promise<any> {
    try {

      const userAttributes = [
        { Name: "email", Value: updateUserDto.email },
        { Name: "birthdate", Value: updateUserDto.birth_date },
        { Name: "name", Value: updateUserDto.name },
        { Name: "gender", Value: updateUserDto.gender },
        { Name: "custom:isAdmin", Value: getNumberByRoleName(updateUserDto.role).toString() }, // Role conversion
      ];

      const command = new AdminUpdateUserAttributesCommand({
        UserPoolId: this.appConfig.cognitoUserPoolId,
        Username: updateUserDto.email,
        UserAttributes: userAttributes,
      });


      const response = await this.cognitoClient.send(command);

      return response;
    } catch (error) {
      console.error('Error occurred while updating user:', error);
      throw error;
    }
  }

  async updatePlayerBySub(playerDto: PlayerDto, updatePlayerDto: UpdatePlayerDto): Promise<any> {
    try {
      // Build user attributes to update
      const userAttributes = [
        { Name: "birthdate", Value: updatePlayerDto.birth_date },
        { Name: "name", Value: updatePlayerDto.name },
        { Name: "gender", Value: updatePlayerDto.gender },
        { Name: "picture", Value: updatePlayerDto.profile_img },
      ];

      const command = new AdminUpdateUserAttributesCommand({
        UserPoolId: this.appConfig.cognitoUserPoolId,
        Username: playerDto.user_id,
        UserAttributes: userAttributes,
      });


      const response = await this.cognitoClient.send(command);

      return response;
    } catch (error) {
      console.error('Error occurred while updating player:', error);
      throw error;
    }
  }


  async deleteUser(email: string): Promise<any> {
    try {

      const command = new AdminDeleteUserCommand({
        UserPoolId: this.appConfig.cognitoUserPoolId,
        Username: email,
      });


      const response = await this.cognitoClient.send(command);

      return response;
    } catch (error) {
      console.error('Error occurred while deleting user:', error);
      throw error;
    }
  }


}
