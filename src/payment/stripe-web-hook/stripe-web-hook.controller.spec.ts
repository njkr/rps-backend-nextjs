import { Test, TestingModule } from '@nestjs/testing';
import { StripeWebHookController } from './stripe-web-hook.controller';

describe('StripeWebHookController', () => {
  let controller: StripeWebHookController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeWebHookController],
    }).compile();

    controller = module.get<StripeWebHookController>(StripeWebHookController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
