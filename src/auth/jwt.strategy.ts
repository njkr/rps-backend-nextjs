/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request, Response } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from 'src/config/config.service';
import { CustomUnauthorizedException } from 'src/common/exceptions/custom-unauthorized.exception';
import { CognitoService } from './cognito.service';
import { convertToKeyValue, getRoleByNumber } from 'src/common/utils/util-functions.utility';
import { RolesEnum } from 'src/common/enum/admin.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly verifier;

  constructor(
    private readonly configService: ConfigService,
    private readonly cognitoService: CognitoService
  ) {
    super();

    // Initialize the Cognito JWT verifier with necessary configurations
    const appConfig = new AppConfigService(configService);
    this.verifier = CognitoJwtVerifier.create({
      userPoolId: appConfig.cognitoUserPoolId,
      tokenUse: 'access', // Specify the token use
      clientId: appConfig.cognitoClientId,
      region: appConfig.awsRegion,
    });
  }

  async validate(req: Request, res: Response): Promise<any> {
    const token = this.extractTokenFromHeader(req);

    if (!token) {
      throw new CustomUnauthorizedException('Access token not provided', [
        'Access token not provided',
      ]);
    }

    try {
      // Verify and decode the token
      const decodedToken = await this.verifier.verify(token);
      // Optionally, you can fetch additional user details from Cognito or a database
      if (decodedToken) {

        let role = RolesEnum.USER;

        if (req.path.startsWith('/admin')) {

          const user = await this.cognitoService.getUserDetails(decodedToken.sub);
          const userData = convertToKeyValue(user.UserAttributes);
          const cognitoRole = userData['custom:isAdmin'] || '0';

          role = getRoleByNumber(Number(cognitoRole));

          if (!role) {

            throw new Error('user role not found');

          }

          if (role === RolesEnum.USER) {

            throw new Error('user role not allowed to perform this action');

          }

        }

        return { user_id: decodedToken.sub, username: decodedToken.username, role };
      } else {

        throw new CustomUnauthorizedException('Invalid access token', [
          'Invalid access token',
        ]);
      }
    } catch (error) {

      throw new CustomUnauthorizedException(error?.message || 'Invalid access token', [
        'Invalid access token',
      ]);
    }
  }

  private extractTokenFromHeader(request: Request): string | null {
    const authHeader =
      request.headers['authorization'] || request.headers['Authorization'];
    if (!authHeader || typeof authHeader !== 'string') return null;
    const [, token] = authHeader.split(' ');
    return token || null;
  }
}
