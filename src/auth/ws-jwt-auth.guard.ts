/* eslint-disable prettier/prettier */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  //   UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from 'src/config/config.service';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { Socket } from 'socket.io';

const appConfig = new AppConfigService(new ConfigService());

const verifier = CognitoJwtVerifier.create({
  userPoolId: appConfig.cognitoUserPoolId,
  tokenUse: 'access',
  clientId: appConfig.cognitoClientId,
  region: appConfig.awsRegion,
});

export async function validateWsToken(client: Socket) {
  const token = client.handshake.headers['authorization'];

  if (!token) {
    client.emit('error', {
      httpCode: 401,
      message: 'No access token provided',
      data: null,
    });
    return false;

  }

  try {
    const decodedToken = await verifier.verify(token);

    if (!decodedToken) {

      client.emit('error', {
        httpCode: 401,
        message: 'No access token provided',
        data: null,
      });
      return false;
    }

    const clientSocket = client as any;
    clientSocket.user = { user_id: decodedToken.sub, username: decodedToken.username };

    return true;
  } catch (error) {
    client.emit('error', {
      httpCode: 401,
      message: 'Invalid access token',
      data: error.message,
    });
    return false;
  }
}

@Injectable()
export class WsJwtAuthGuard implements CanActivate {

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    try {
      return await validateWsToken(client);
    } catch (error) {
      client.emit('error', {
        httpCode: 401,
        message: 'Invalid access token',
        data: error.message,
      });
      return false;
    }
  }
}
