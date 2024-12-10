import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { GameRoundService } from 'src/game-round/game-round.service';
import { GameService } from 'src/game/game.service';
import { WorkerHostProcessor } from 'src/queues/worker-host.process';
import { SharedService } from 'src/shared/shared.service';

@Processor('game', { concurrency: 100 })
export class GameProcessor extends WorkerHostProcessor {
  constructor(
    private readonly gameService: GameService,
    private readonly gameRoundService: GameRoundService,
    private readonly sharedService: SharedService,
  ) {
    super(); // Call the superclass constructor
  }
  async process(job: Job<any>) {
    const { data, id } = job.data;

    let response = {};

    switch (job.name) {
      case 'insertGame':
        response = await this.gameService.handleCretePlayerGame(data);
        break;
      case 'gameRound':
        response = await this.gameRoundService.handleGameRound(data);
        break;
      case 'gameEnd':
        response = await this.gameRoundService.handleGameEnd(data);
        break;
      case 'playerLeft':
        response = await this.gameService.handlePlayerLeft(data);
        break;
      case 'playerCancel':
        await this.sharedService.handleCancelGame(data, job.data.socketId);
        break;
      default:
        break;
    }

    return { id, response };
  }
}
