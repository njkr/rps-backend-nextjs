import { Test, TestingModule } from '@nestjs/testing';
import { GameRoundController } from './game-round.controller';
import { GameRoundService } from './game-round.service';

describe('GameRoundController', () => {
  let controller: GameRoundController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GameRoundController],
      providers: [GameRoundService],
    }).compile();

    controller = module.get<GameRoundController>(GameRoundController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
