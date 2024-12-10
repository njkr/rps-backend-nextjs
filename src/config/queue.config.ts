import { BullModule } from '@nestjs/bullmq';
import IORedis from 'ioredis';

export const redisClient = new IORedis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT, 10),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

redisClient.on('connect', () => {
  console.log('Redis connected');
});

redisClient.on('error', (err) => {
  console.log('Redis error', err);
});

export const queueConfig = BullModule.forRoot({
  connection: redisClient,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 200,
  },
});

export const queues = {
  gameTimer: BullModule.registerQueue({
    name: 'game-timer',
  }),
  gameReady: BullModule.registerQueue({
    name: 'game-ready',
  }),
  marketplace: BullModule.registerQueue({
    name: 'marketplace',
  }),
  game: BullModule.registerQueue({
    name: 'game',
  }),
  jackpot: BullModule.registerQueue({
    name: 'jackpot',
  }),
  jackpotClaim: BullModule.registerQueue({
    name: 'jackpot-claim',
  }),
  jackpotDistribution: BullModule.registerQueue({
    name: 'jackpot-distribution',
  }),
  deposit: BullModule.registerQueue({
    name: 'deposit',
  }),
};
