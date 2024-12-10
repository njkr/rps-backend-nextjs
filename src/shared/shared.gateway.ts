import { Logger, OnModuleInit, UseGuards, UsePipes } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { validateWsToken, WsJwtAuthGuard } from 'src/auth/ws-jwt-auth.guard';
import { CustomSocket } from 'src/common/interfaces/socket.interface';
import { ValidationWsPipe } from 'src/common/pipes/validation-ws.pipe';
import { handleValidationErrors } from 'src/common/utils/validation-wb-error.utility';
import { AcceptRoomRequestDto } from 'src/room-waiting-list/dto/accept-room-request.dto';
import { CreateRoomRequestDto } from 'src/room-waiting-list/dto/create-room-request.dto';
import { JoinRoomRequestDto } from 'src/room-waiting-list/dto/join-room-request.dto';
import { GameReadyDto } from 'src/room-waiting-list/dto/game-ready.dto';
import { SharedService } from './shared.service';
import { GameTimerStartDto } from 'src/game/dto/game-timer-start.dto';
import { redisClient } from 'src/config/queue.config';
import { emitError } from 'src/common/utils/error-wb.utility';
import { createAdapter } from '@socket.io/redis-adapter';

@WebSocketGateway({ cors: true })
export class SharedGateway
  implements
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnModuleInit {
  private readonly logger = new Logger(SharedGateway.name);
  @WebSocketServer() server: Server;
  constructor(private readonly sharedService: SharedService) { }

  // Method to access the WebSocketServer instance
  getServer(): Server {
    return this.server;
  }

  afterInit(/*server: Server*/) {
    console.log('WebSocket initialized');
  }

  onModuleInit() {
    const pubClient = redisClient;
    const subClient = pubClient.duplicate();

    this.server.adapter(createAdapter(pubClient, subClient));

    this.logger.log('Redis adapter initialized for Socket.IO');
  }

  async handleConnection(client: CustomSocket) {
    const response = await validateWsToken(client);

    if (!response) {
      client.disconnect();
      return;
    }

    const { user_id } = client.user;

    const userSocket = await redisClient.hget('user_sockets', user_id);

    const [_, { rooms }] = await this.server.fetchSockets();

    if (rooms.has(userSocket)) {

      emitError(
        client,
        403,
        'ALREADY_HAVE_ACTIVE_SESSION',
        'User already have an active Session',
      );
      client.disconnect();
      return;

    } else {

      const multi = redisClient.multi();
      multi.hdel('socket_users', userSocket);
      multi.hdel('user_sockets', user_id);
      multi.hset('socket_users', client.id, user_id);
      multi.hset('user_sockets', user_id, client.id);
      await multi.exec();

    }

    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const user_id = await redisClient.hget('socket_users', `${client.id}`);

    const multi = redisClient.multi();

    multi.hdel('socket_users', `${client.id}`);
    multi.hdel('user_sockets', user_id);

    await multi.exec();

    console.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('message')
  handleMessage(@MessageBody() data: string): void {
    this.server.emit('message', data);
  }

  @UseGuards(WsJwtAuthGuard)
  @UsePipes(new ValidationWsPipe())
  @SubscribeMessage('room-create-request')
  async handleCreateRoomRequest(
    @MessageBody() createRoomRequestDto: CreateRoomRequestDto,
    @ConnectedSocket() client: CustomSocket,
  ) {
    if (handleValidationErrors(createRoomRequestDto, client)) {
      return;
    }
    await this.sharedService.createRoomRequest(
      createRoomRequestDto,
      this.server,
      client,
    );
    return true;
  }

  @UseGuards(WsJwtAuthGuard)
  @UsePipes(new ValidationWsPipe())
  @SubscribeMessage('room-waiting-accept')
  async handleWaitingRoomAccept(
    @MessageBody() acceptRoomRequestDto: AcceptRoomRequestDto,
    @ConnectedSocket() client: CustomSocket,
  ) {
    if (handleValidationErrors(acceptRoomRequestDto, client)) {
      return;
    }
    await this.sharedService.waitingRoomAccept(
      acceptRoomRequestDto,
      this.server,
      client,
    );
    return true;
  }

  @UseGuards(WsJwtAuthGuard)
  @UsePipes(new ValidationWsPipe())
  @SubscribeMessage('room-join-request')
  async handleJoinRoomRequest(
    @MessageBody() joinRoomRequestDto: JoinRoomRequestDto,
    @ConnectedSocket() client: CustomSocket,
  ) {
    if (handleValidationErrors(joinRoomRequestDto, client)) {
      return;
    }
    await this.sharedService.joinRoomRequest(
      joinRoomRequestDto,
      this.server,
      client,
    );
    return true;
  }

  @UseGuards(WsJwtAuthGuard)
  @UsePipes(new ValidationWsPipe())
  @SubscribeMessage('game-ready')
  async handleWaitingRoomReady(
    @MessageBody() gameReadyDto: GameReadyDto,
    @ConnectedSocket() client: CustomSocket,
  ) {
    if (handleValidationErrors(gameReadyDto, client)) {
      return;
    }
    await this.sharedService.waitingGameRoomReady(
      gameReadyDto,
      this.server,
      client,
    );
    return true;
  }

  @UseGuards(WsJwtAuthGuard)
  @UsePipes(new ValidationWsPipe())
  @SubscribeMessage('game-player-cancel')
  async handleGamePlayerCancel(
    @MessageBody() gameTimerStartDto: GameTimerStartDto,
    @ConnectedSocket() client: CustomSocket,
  ) {
    if (handleValidationErrors(gameTimerStartDto, client)) {
      return;
    }
    await this.sharedService.cancelGame(gameTimerStartDto, this.server, client);
    return true;
  }
}
