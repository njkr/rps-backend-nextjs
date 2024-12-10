/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { NotFoundFilter } from './common/filters/not-found.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // app.useGlobalPipes(
  //   new ValidationPipe({
  //     whitelist: true,
  //     forbidNonWhitelisted: true,
  //     transform: true,
  //   }),
  // );
  // Apply the raw body parser only for the Stripe webhook endpoint
  app.use('/stripe-web-hook', bodyParser.raw({ type: 'application/json' }));

  // Apply the NotFoundFilter globally
  app.useGlobalFilters(new NotFoundFilter());

  app.enableCors();
  await app.listen(3000);
}
bootstrap();
