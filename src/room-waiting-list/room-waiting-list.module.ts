/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { RoomWaitingListService } from './room-waiting-list.service';
import { RoomWaitingListController } from './room-waiting-list.controller';
import { DynamoModule } from 'src/dynamo/dynamo.module';
import { AuthModule } from 'src/auth/auth.module';
import { ConfigModuleApp } from 'src/config/config.module';
import { RoomModule } from 'src/room/room.module';

@Module({
  imports: [DynamoModule, AuthModule, ConfigModuleApp, RoomModule],
  providers: [RoomWaitingListService],
  controllers: [RoomWaitingListController],
  exports: [RoomWaitingListService],
})
export class RoomWaitingListModule { }
