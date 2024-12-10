import { Test, TestingModule } from '@nestjs/testing';
import { LcController } from './lc.controller';
import { LcService } from './lc.service';

describe('LcController', () => {
  let controller: LcController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LcController],
      providers: [LcService],
    }).compile();

    controller = module.get<LcController>(LcController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
