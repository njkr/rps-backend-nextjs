/* eslint-disable prettier/prettier */
import { Test, TestingModule } from '@nestjs/testing';
import { RoomWaitingListService } from './room-waiting-list.service';

describe('RoomWaitingListService', () => {
  let service: RoomWaitingListService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomWaitingListService],
    }).compile();

    service = module.get<RoomWaitingListService>(RoomWaitingListService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
