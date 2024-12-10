/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) { }

  get awsRegion(): string {
    return this.configService.get<string>('AWS_REGION');
  }

  get accessKeyId(): string {
    return this.configService.get<string>('AWS_ACCESS_KEY_ID');
  }

  get secretAccessKey(): string {
    return this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
  }

  get cognitoClientId(): string {
    return this.configService.get<string>('COGNITO_CLIENT_ID');
  }

  get cognitoUserPoolId(): string {
    return this.configService.get<string>('COGNITO_USER_POOL_ID');
  }

  get mainURL(): string {
    return this.configService.get<string>('MAIN_URL');
  }

  get cryptoKey(): string {
    return this.configService.get<string>('CRYPTO_SECRETLEY');
  }
  get stripeSecretKey(): string {
    return this.configService.get<string>('STRIPE_SECRET_KEY');
  }
  get stripePublicKey(): string {
    return this.configService.get<string>('STRIPE_PUBLIC_KEY');
  }
  get stripeWebhookSecret(): string {
    return this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
  }
}
