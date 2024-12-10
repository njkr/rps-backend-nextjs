/* eslint-disable prettier/prettier */
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { CognitoService } from 'src/auth/cognito.service';
import { CreateRoomRequestDto } from 'src/room-waiting-list/dto/create-room-request.dto';
import { RoomService } from 'src/room/room.service';
import { UpdateRoomRequestDto } from 'src/room-waiting-list/dto/update-room-request.dto';
import { AcceptRoomRequestDto } from 'src/room-waiting-list/dto/accept-room-request.dto';
import { Server } from 'socket.io';
import { emitError } from 'src/common/utils/error-wb.utility';
import { UpdateRoomDto } from 'src/room/dto/update-room.dto';
import { CustomSocket } from 'src/common/interfaces/socket.interface';
import { GameStatus, InsertGameDto, SourceType } from 'src/game/dto/insert-game.dto';
import { GameService } from 'src/game/game.service';
import { WalletService } from 'src/wallet/wallet.service';
import { TransactionService } from 'src/transaction/transaction.service';
import { JoinRoomRequestDto } from 'src/room-waiting-list/dto/join-room-request.dto';
import { convertArrayToObject, handleServerEmitter } from 'src/common/utils/util-functions.utility';
import { RoomWaitingListService } from 'src/room-waiting-list/room-waiting-list.service';
import { GameReadyDto, StatusType } from 'src/room-waiting-list/dto/game-ready.dto';
import { GameTimerStartDto } from 'src/game/dto/game-timer-start.dto';
import { PlayerService } from 'src/player/player.service';
import { SharedGateway } from './shared.gateway';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Status } from 'src/ticket/dto/update-insert-ticket.dto';
import { TicketService } from 'src/ticket/ticket.service';

@Injectable()
export class SharedService {
    private readonly logger = new Logger(SharedService.name);

    private readonly gameReadyEvent: string = 'game-ready-';

    constructor(
        private readonly cognitoService: CognitoService,
        private readonly roomService: RoomService,
        private readonly gameService: GameService,
        private readonly walletService: WalletService,
        private readonly transactionService: TransactionService,
        private readonly roomWaitingListService: RoomWaitingListService,
        private readonly playerService: PlayerService,
        private readonly ticketService: TicketService,
        @Inject(forwardRef(() => SharedGateway)) private readonly sharedGateway: SharedGateway,
        @InjectQueue('game-ready') private readonly gameReadyQueue: Queue,
        @InjectQueue('game') private readonly gameQueue: Queue,
        @InjectQueue('game-timer') private readonly gameTimerQueue: Queue,
    ) {
    }

    async createRoomRequest(createRoomRequestDto: CreateRoomRequestDto, server: Server, client: CustomSocket): Promise<void> {
        try {
            const { user_id } = client.user;
            const emitterName = `room-create-request-${createRoomRequestDto.room_id}`;
            // Check if the user exists in Cognito
            const cognitoUser = await this.cognitoService.checkIfUserExists(user_id);

            if (!cognitoUser) {
                return emitError(client, 400, 'You do not have a valid account', null);
            }

            // Extract user's name from Cognito user attributes
            const name = cognitoUser.UserAttributes.find(
                (v) => v.Name === 'name',
            ).Value;

            // check the room
            const [currentRoom] = await this.roomService.getRoomByRoomId(
                createRoomRequestDto.room_id,
            );
            if (!currentRoom) {

                return emitError(client, 400, 'Room not Found', null);

            } else if (currentRoom.user_id === user_id) {

                return emitError(client, 400, "As room's owner , you can not do request", null);

            } else if (currentRoom.status !== "Pending") {

                return emitError(client, 400, `player room is ${currentRoom.status}`, null);

            }

            // validate the user have request

            const [roomRequest] = await this.roomWaitingListService.getRequestsByRoomAndUser(createRoomRequestDto.room_id, user_id);

            if (roomRequest) {
                // Emit event
                server.emit(emitterName,
                    {
                        httpCode: 200,
                        message: 'rooms requested successfully',
                        data: roomRequest,
                    }
                );
                return;
            }

            // get current balance
            const currentWallet = await this.walletService.getWalletByUserId(
                { user_id },
            );

            if (
                !currentWallet ||
                currentWallet.balance_dollar - currentRoom.amount < 0
            ) {
                return emitError(client, 400, "You do not have enough money", null);
            }


            // Create the request object
            const insertRoomDto = {
                user_id: user_id,
                user_name: name,
                room_owner_id: currentRoom.user_id,
                room_name: currentRoom.name,
                status: 'Pending',
                string: new Date().toISOString(),
                ...createRoomRequestDto,
            };

            await this.roomWaitingListService.validateAndCreateRoomRequest({ user_id }, insertRoomDto);

            server.emit(emitterName,
                {
                    httpCode: 200,
                    message: 'rooms requested successfully',
                    data: insertRoomDto,
                }
            );

            return;

        } catch (error) {
            return emitError(client, 500, 'Error creating player rooms request', error.message);
        }
    }

    async joinRoomRequest(joinRoomRequestDto: JoinRoomRequestDto, server: Server, client: CustomSocket): Promise<void> {
        try {
            const { user_id } = client.user;
            const emitterName = `room-join-request-${joinRoomRequestDto.room_id}`;
            // Check if the user exists in Cognito

            // check the room
            const [currentRoom] = await this.roomService.getRoomByRoomId(
                joinRoomRequestDto.room_id,
            );

            if (!currentRoom) {

                return emitError(client, 400, 'Room not Found', null);

            } else if (currentRoom.user_id === user_id) {

                return emitError(client, 400, "As room's owner , you can not do request", null);

            } else if (currentRoom.status !== "Pending") {

                return emitError(client, 400, `player room is ${currentRoom.status}`, null);

            } else if (currentRoom.room_pass !== joinRoomRequestDto.room_pass) {

                return emitError(client, 400, "Room password is not correct", null);

            }

            const [firstPlayerExists, secondPlayerExists] =
                await Promise.all([this.cognitoService.checkIfUserExists(currentRoom.user_id), await this.cognitoService.checkIfUserExists(user_id)]);

            if (!firstPlayerExists || !secondPlayerExists) {
                return emitError(client, 400, "one of the player not found", null);
            }

            const [roomRequest] = await this.roomWaitingListService.getRequestsByRoomAndUser(joinRoomRequestDto.room_id, user_id);

            if (roomRequest) {
                // Emit event
                return emitError(client, 400, "You already joined room", null);

            }

            // create transaction

            const [firstPlayerTransaction] = await this.transactionService.getTransactionsSourceId({ source_id: currentRoom.room_id, source_type: SourceType.Room });

            if (!firstPlayerTransaction || firstPlayerTransaction.tx_status !== "Pending" || firstPlayerTransaction.user_id !== currentRoom.user_id) {
                return emitError(client, 400, "firstPlayerTransaction not found", null);
            }

            const game_id = await this.gameService.generateUniqueId();

            await this.transactionService.updateTransaction({ user_id: firstPlayerTransaction.user_id }, { ...firstPlayerTransaction, game_id });


            await this.transactionService.validateAndCreateTransaction(
                { user_id: user_id },
                {
                    user_id: user_id,
                    tx_type: "Game",
                    tx_status: "Pending",
                    tx_operation: 'Remove',
                    coin_type: 'Dollar',
                    amount: currentRoom.amount,
                    source_type: 'Room',
                    game_id,
                    source_id: currentRoom.room_id,
                    remarks: 'Room join Request Accepted',
                    date: new Date().toISOString(),
                },
            );


            const firstPlayerData = convertArrayToObject(
                firstPlayerExists.UserAttributes,
            );
            const secondPlayerData = convertArrayToObject(
                secondPlayerExists.UserAttributes,
            );

            const [firstPlayerTicket] =
                await this.ticketService.getTicketsByUserWinnerType(
                    firstPlayerData.sub,
                    [null],
                    Status.VALID,
                );

            const [secondPlayerTicket] =
                await this.ticketService.getTicketsByUserWinnerType(
                    secondPlayerData.sub,
                    [null],
                    Status.VALID,
                );

            const insertPlayerGameDto = new InsertGameDto();
            insertPlayerGameDto.source_id = currentRoom.room_id;
            insertPlayerGameDto.source_type = SourceType.Room;
            insertPlayerGameDto.first_player = firstPlayerData.sub;
            insertPlayerGameDto.second_player = secondPlayerData.sub;
            insertPlayerGameDto.amount = currentRoom.amount * 2;
            insertPlayerGameDto.first_player_ticket = firstPlayerTicket?.amount || 0;
            insertPlayerGameDto.second_player_ticket = secondPlayerTicket?.amount || 0;
            insertPlayerGameDto.first_player_name = firstPlayerData.name;
            insertPlayerGameDto.second_player_name = secondPlayerData.name;
            insertPlayerGameDto.first_player_image = firstPlayerData?.picture || null;
            insertPlayerGameDto.second_player_image = secondPlayerData?.picture || null;


            await this.gameService.createPlayerGame({ game_id }, insertPlayerGameDto);

            await this.playerService.updatePlayerGameStatuses(
                [{
                    userId: insertPlayerGameDto.first_player,
                    lastGameDate: true, incrementGames: 1
                },
                {
                    userId: insertPlayerGameDto.second_player,
                    lastGameDate: true, incrementGames: 1
                }],
            );

            // Create the request object
            const insertRoomWaitingDto = {
                user_id: user_id,
                user_name: secondPlayerExists.name,
                room_owner_id: currentRoom.user_id,
                room_name: currentRoom.name,
                status: 'Accepted',
                ...joinRoomRequestDto,
            };

            await this.roomWaitingListService.validateAndCreateRoomRequest({ user_id }, { ...insertRoomWaitingDto, ...insertPlayerGameDto });

            // update room
            const updateRoomDto = new UpdateRoomDto();
            updateRoomDto.room_id = joinRoomRequestDto.room_id;
            updateRoomDto.status = "Full";
            updateRoomDto.guest_id = user_id;
            delete updateRoomDto.room_pass;
            await this.roomService.updateRoom({ user_id: currentRoom.user_id }, updateRoomDto);

            const name = 'game-timer';

            await this.gameTimerQueue.addBulk([
                {
                    name,
                    data: { game_id, first_player: firstPlayerData.sub, second_player: secondPlayerData.sub },
                    opts: { attempts: 0, backoff: 5000, delay: 35000 },
                },
                {
                    name: name + '-end',
                    data: { game_id, first_player: firstPlayerData.sub, second_player: secondPlayerData.sub },
                    opts: { attempts: 0, backoff: 5000, delay: 150000 },
                },
            ]);

            server.emit(emitterName,
                {
                    httpCode: 200,
                    message: 'rooms join requested successfully',
                    data: { game_id, ...insertPlayerGameDto },
                }
            );

            return;

        } catch (error) {
            return emitError(client, 500, 'Error creating player join rooms', error.message);
        }
    }

    async waitingRoomAccept(acceptRoomRequestDto: AcceptRoomRequestDto, server: Server, client: CustomSocket): Promise<void> {
        try {
            const { user_id } = client.user;
            const emitterName = `room-waiting-accept-${acceptRoomRequestDto.room_id}`;
            const roomData = await this.roomService.getRoomById({ user_id }, acceptRoomRequestDto.room_id);

            if (!roomData) {
                return emitError(client, 400, 'player room not found', null);
            } else if (roomData.status !== "Pending") {
                return emitError(client, 400, `player room is ${roomData.status}`, null);
            }

            const requestData = await this.roomWaitingListService.getRequestById(acceptRoomRequestDto.id);

            if (!requestData) {
                return emitError(client, 400, 'player room request not found', null);
            } else if (requestData.status !== "Pending") {
                return emitError(client, 400, `player room request is ${requestData.status}`, null);
            }

            // get current balance
            const currentWallet = await this.walletService.getWalletByUserId(
                { user_id: requestData.user_id },
            );

            if (
                !currentWallet ||
                currentWallet.balance_dollar - roomData.amount < 0
            ) {
                return emitError(client, 400, "opponent do not have enough money", null);
            }

            // create transaction
            const game_id = await this.gameService.generateUniqueId();

            await this.transactionService.validateAndCreateTransaction(
                { user_id: requestData.user_id },
                {
                    user_id: requestData.user_id,
                    tx_type: "Game",
                    tx_status: "Pending",
                    tx_operation: 'Remove',
                    coin_type: 'Dollar',
                    amount: roomData.amount,
                    source_type: 'Room',
                    source_id: roomData.room_id,
                    game_id,
                    remarks: 'Room Request Accepted',
                    date: new Date().toISOString(),
                },
            );

            const insertPlayerGameDto = new InsertGameDto();
            insertPlayerGameDto.source_id = acceptRoomRequestDto.room_id;
            insertPlayerGameDto.source_type = SourceType.Room;
            insertPlayerGameDto.first_player = roomData.user_id;
            insertPlayerGameDto.second_player = roomData.guest_id;
            insertPlayerGameDto.first_player_status = GameStatus.Pending;
            insertPlayerGameDto.second_player_status = GameStatus.Pending;
            insertPlayerGameDto.winner = "null";  // Use null as an actual null value
            insertPlayerGameDto.first_player_result = 0;
            insertPlayerGameDto.second_player_result = 0;
            insertPlayerGameDto.amount = roomData.amount * 2;

            await this.gameService.createPlayerGame({ game_id }, insertPlayerGameDto);

            await this.playerService.updatePlayerGameStatuses(
                [{
                    userId: insertPlayerGameDto.first_player,
                    lastGameDate: true, incrementGames: 1
                },
                {
                    userId: insertPlayerGameDto.second_player,
                    lastGameDate: true, incrementGames: 1
                }],
            );

            // update request
            const updateRoomRequestDto = new UpdateRoomRequestDto();
            updateRoomRequestDto.id = acceptRoomRequestDto.id;
            updateRoomRequestDto.status = "Accepted";

            await this.roomWaitingListService.updateRequest(
                { user_id },
                updateRoomRequestDto,
            );

            // update room
            const updateRoomDto = new UpdateRoomDto();
            updateRoomDto.room_id = acceptRoomRequestDto.room_id;
            updateRoomDto.status = "Full";
            updateRoomDto.guest_id = requestData.user_id;
            await this.roomService.updateRoom({ user_id }, updateRoomDto);

            //get all waiting list by pending status
            const roomsWaitingLists = await this.roomWaitingListService.getRequestsByStatusAndRoom(
                {
                    room_id: acceptRoomRequestDto.room_id,
                    status: "Pending"
                });

            // update all pending requests to Rejected
            for (const roomsWaitingList of roomsWaitingLists) {
                const updateRoomRequestDto = new UpdateRoomRequestDto();
                updateRoomRequestDto.id = roomsWaitingList.id;
                updateRoomRequestDto.status = "Rejected";
                await this.roomWaitingListService.updateRequest(
                    { user_id },
                    updateRoomRequestDto,
                );
            }

            // send notification
            server.emit(emitterName,
                {
                    httpCode: 200,
                    message: 'rooms accepted successfully',
                    data: {
                        room_id: acceptRoomRequestDto.room_id,
                        id: updateRoomRequestDto.id,
                        ...insertPlayerGameDto
                    },
                });

            return;

        } catch (error) {
            return emitError(client, 500, 'Error player rooms accept', error.message);
        }
    }

    private async getRoomData(roomId: string, client: CustomSocket, userId: string): Promise<any> {
        const [roomData] = await this.roomService.getRoomByRoomId(roomId);

        if (!roomData) {
            emitError(client, 400, 'Room not found', null);
            return null;
        }

        if (roomData.status !== 'Full') {
            emitError(client, 400, 'Room is not full', null);
            return null;
        }

        if (roomData.user_id !== userId && roomData.guest_id !== userId) {
            emitError(client, 400, 'You are not a valid user for this room', null);
            return null;
        }

        return roomData;
    }

    private async getGameData(game_id: string, client: CustomSocket, userId: string): Promise<any> {
        const gameData = await this.gameService.getGameById({ game_id });

        if (!gameData) {
            emitError(client, 400, 'game not found', null);
            return null;
        }

        if (![gameData.first_player, gameData.second_player].includes(userId)) {
            emitError(client, 400, 'You are not a valid user for this game', null);
            return null;
        }

        if (
            gameData.first_player_status === StatusType.Refused ||
            gameData.second_player_status === StatusType.Refused
        ) {

            emitError(client, 400, 'Game refused', null);

            return null;
        }

        if (![gameData.first_player_status, gameData.second_player_status].includes("Pending")) {
            emitError(client, 400, 'game is not pending state', null);
            return null;
        }

        return gameData;
    }

    private validateTransactions(
        source_type: string,
        first_player_transaction: any,
        second_player_transaction: any,
        client: CustomSocket
    ): boolean {

        const isAiSource = source_type === "Ai";
        const firstTransactionMissing = !first_player_transaction;
        const secondTransactionMissing = !second_player_transaction;

        const transactionError = firstTransactionMissing || (!isAiSource && secondTransactionMissing);

        if (transactionError) {
            emitError(client, 400, 'Transaction not found', null);
            return false;
        }

        return true;
    }

    private async handleRevertGameTransaction(
        response: any,
        first_player_status: GameStatus,
        second_player_status: GameStatus,
        transactionData: {
            gameData: any,
            first_player_transaction: any,
            second_player_transaction: any
        },
        emitData: {
            server: Server,
            emitterName: string,
            game_id: string
            isTimeOut: boolean
            message: string
        }
    ): Promise<boolean> {

        const { gameData, first_player_transaction, second_player_transaction } = transactionData;
        const { server, emitterName, game_id, isTimeOut, message } = emitData;

        const validStatus = [GameStatus.Refused, GameStatus.TimerElapsed, GameStatus.Cancelled];

        if (
            validStatus.includes(first_player_status) ||
            validStatus.includes(second_player_status)
        ) {
            await this.transactionService.revertTransaction(
                { user_id: first_player_transaction.user_id },
                { ...first_player_transaction, tx_status: 'Reverted', remarks: `${first_player_transaction.remarks} | ${message}` }
            );

            if (gameData.source_type !== "Ai") {

                await this.transactionService.revertTransaction(
                    { user_id: second_player_transaction.user_id },
                    { ...second_player_transaction, tx_status: 'Reverted', remarks: `${second_player_transaction.remarks} | ${message}` }
                );

            }

            handleServerEmitter(server, emitterName, 400, message, { ...response, game_id, isTimeOut });

            return false;
        }

        return true;
    }

    private extractPlayerStatus(player_status, game_user_id: string, user_id: string, gameReadyDto: GameReadyDto) {
        return [GameStatus.Pending, StatusType.Ready].includes(player_status) && game_user_id === user_id
            ? gameReadyDto.status
            : player_status;
    }

    async handleGameReady({ user_id, gameReadyDto, first_player_transaction, second_player_transaction }): Promise<void> {

        const { game_id } = gameReadyDto;

        const emitterName = `${this.gameReadyEvent}${game_id}`;

        const gameData = await this.gameService.getGameById({ game_id });

        const server = this.sharedGateway.getServer();

        const first_player_status = this.extractPlayerStatus(gameData.first_player_status, gameData.first_player, user_id, gameReadyDto);

        const second_player_status = this.extractPlayerStatus(gameData.second_player_status, gameData.second_player, user_id, gameReadyDto);


        await this.gameService.updateGame({ ...gameData, first_player_status, second_player_status });

        const isGameReverted = await this.handleRevertGameTransaction(gameData, first_player_status, second_player_status, { gameData, first_player_transaction, second_player_transaction }, { server, emitterName, game_id: gameData.game_id, isTimeOut: false, message: "game refused" });

        if (!isGameReverted) return;

        handleServerEmitter(server, emitterName, 200, 'Players waiting ready successfully', { ...gameData, first_player_status, second_player_status, game_id: gameData.game_id, isTimeOut: false });
    }

    async waitingGameRoomReady(gameReadyDto: GameReadyDto, server: Server, client: CustomSocket): Promise<void> {
        try {
            const { user_id } = client.user;

            const gameData = await this.getGameData(gameReadyDto.game_id, client, user_id);

            if (!gameData) return;

            if (gameData.source_type === "Room") {

                const roomData = await this.getRoomData(gameData.source_id, client, user_id);

                if (!roomData) return;

            }

            const [first_player_transaction] = await this.transactionService.getTransactionsByGameId(gameData.first_player, gameData.game_id);

            const [second_player_transaction] = await this.transactionService.getTransactionsByGameId(gameData.second_player, gameData.game_id);

            //validate transactions
            if (!this.validateTransactions(gameData.source_type, first_player_transaction, second_player_transaction, client)) return;


            await this.gameReadyQueue.add('game-ready', { user_id, gameReadyDto, first_player_transaction, second_player_transaction }, {
                attempts: 0,
                deduplication: user_id,
            });

            return;

        } catch (error) {
            console.error(error);
            return emitError(client, 500, 'Error creating Players waiting ready', error.message);
        }
    }

    private async getPlayersGame(first_player: string, second_player: string, game_id: string, status: GameStatus[], client: any): Promise<any> {

        const gameData = await this.gameService.getGameById({ game_id });

        if (!gameData) {

            emitError(client, 500, 'players game not found', null);
            return null;

        }

        if (gameData.first_player !== first_player || gameData.second_player !== second_player) {

            emitError(client, 500, 'Error wrong game id', null);
            return null;

        }

        if (!status.includes(gameData.first_player_status) || !status.includes(gameData.second_player_status)) {

            emitError(client, 500, `Error wrong game status status must be ${status.join(",")}`, null);
            return null;
        }

        return gameData;
    }

    async handleGameTimer(gameTimerStartDto: GameTimerStartDto, jobName: string): Promise<any> {

        try {

            const server = this.sharedGateway.getServer();

            const emitterName = `${this.gameReadyEvent}${gameTimerStartDto.game_id}`

            const gameData = await this.gameService.getGameById({ game_id: gameTimerStartDto.game_id });

            if (!gameData) return;

            if ((gameData.first_player_status === GameStatus.Pending && gameData.second_player_status === GameStatus.Pending) ||
                (gameData.first_player_status === GameStatus.Pending && gameData.second_player_status === GameStatus.Ready) ||
                (gameData.first_player_status === GameStatus.Ready && gameData.second_player_status === GameStatus.Pending)
                || (['game-timer-ai', 'game-timer-end'].includes(jobName) && gameData.first_player_status === GameStatus.Ready && gameData.second_player_status === GameStatus.Ready)
                || (['game-timer-ai', 'game-timer-end'].includes(jobName) && gameData.first_player_status === GameStatus.Playing && gameData.second_player_status === GameStatus.Playing)
            ) {

                const [first_player_transaction] = await this.transactionService.getTransactionsByGameId(gameData.first_player, gameData.game_id);

                const [second_player_transaction] = await this.transactionService.getTransactionsByGameId(gameData.second_player, gameData.game_id);

                const newGameData = await this.gameService.updateGame({ ...gameData, first_player_status: GameStatus.TimerElapsed, second_player_status: GameStatus.TimerElapsed });

                await this.playerService.updatePlayerGameStatuses(
                    [{
                        userId: first_player_transaction.user_id,
                        lastGameDate: true, decrementGames: 1
                    }, {
                        userId: second_player_transaction.user_id,
                        lastGameDate: true, decrementGames: 1
                    }],
                );

                await this.handleRevertGameTransaction(newGameData, GameStatus.TimerElapsed, GameStatus.TimerElapsed,
                    { gameData, first_player_transaction, second_player_transaction },
                    { server, emitterName, game_id: gameData.game_id, isTimeOut: true, message: 'Timer Elapsed' });

            }

            //otherwise make the winner

            return true;

        } catch (error) {
            throw new Error(error);
        }

    }

    async handleCancelGame(gameTimerStartDto: GameTimerStartDto, socketId: string): Promise<any> {

        const server = this.sharedGateway.getServer();

        const client = server.sockets.sockets.has(socketId) ? server.sockets.sockets.get(socketId) : server;

        try {

            const emitterName = `game-player-cancel-${gameTimerStartDto.game_id}`;

            const gameData = await this.getPlayersGame(gameTimerStartDto.first_player, gameTimerStartDto.second_player, gameTimerStartDto.game_id, [GameStatus.Pending], client);

            if (!gameData) return;

            if ((gameData.first_player_status === GameStatus.Pending && gameData.second_player_status === GameStatus.Pending) ||
                (gameData.first_player_status === GameStatus.Pending && gameData.second_player_status === GameStatus.Ready) ||
                (gameData.first_player_status === GameStatus.Ready && gameData.second_player_status === GameStatus.Pending)) {

                const [first_player_transaction] = await this.transactionService.getTransactionsByGameId(gameData.first_player, gameData.game_id);

                const [second_player_transaction] = await this.transactionService.getTransactionsByGameId(gameData.second_player, gameData.game_id);

                const newGameData = await this.gameService.updateGame({ ...gameData, first_player_status: GameStatus.Cancelled, second_player_status: GameStatus.Cancelled });

                await this.handleRevertGameTransaction(newGameData, GameStatus.Cancelled, GameStatus.Cancelled,
                    { gameData, first_player_transaction, second_player_transaction },
                    { server, emitterName, game_id: gameData.game_id, isTimeOut: true, message: 'player cancels game' });

            }

            return;

        } catch (error) {
            return emitError(client, 500, 'Error creating Players waiting ready', error.message);
        }

    }

    async cancelGame(gameTimerStartDto: GameTimerStartDto, server: Server, client: CustomSocket): Promise<void> {

        await this.gameQueue.add('playerCancel', {
            data: gameTimerStartDto,
            id: gameTimerStartDto.game_id,
            socketId: client.id
        }, {
            attempts: 0,
            deduplication: {
                id: gameTimerStartDto.game_id
            }
        });

    }
}