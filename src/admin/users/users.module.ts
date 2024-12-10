import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { PlayerModule } from 'src/player/player.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PlayerModule, AuthModule],
  controllers: [UsersController],
})
export class UsersModule {}
