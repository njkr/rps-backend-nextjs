import { Test, TestingModule } from '@nestjs/testing';
import { TransactionSettingsService } from './transaction-settings.service';

describe('TransactionSettingsService', () => {
  let service: TransactionSettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransactionSettingsService],
    }).compile();

    service = module.get<TransactionSettingsService>(
      TransactionSettingsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
