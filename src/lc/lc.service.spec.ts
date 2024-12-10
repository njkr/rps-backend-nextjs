import { Test, TestingModule } from '@nestjs/testing';
import { LcService } from './lc.service';

describe('LcService', () => {
  let service: LcService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LcService],
    }).compile();

    service = module.get<LcService>(LcService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
