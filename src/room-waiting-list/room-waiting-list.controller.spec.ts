/* eslint-disable prettier/prettier */
import { Test, TestingModule } from '@nestjs/testing';
import { RoomWaitingListController } from './room-waiting-list.controller';

describe('RoomWaitingListController', () => {
  let controller: RoomWaitingListController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomWaitingListController],
    }).compile();

    controller = module.get<RoomWaitingListController>(RoomWaitingListController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
