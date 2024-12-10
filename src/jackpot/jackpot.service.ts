/* eslint-disable prettier/prettier */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Injectable, Logger } from '@nestjs/common';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { CreateJackpotDto } from './dto/create-jackpot.dto';
import { DeleteCommand, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { UpdateJackpotDto } from './dto/update-jackpot.dto';
import { v4 as uuidv4 } from 'uuid';
import { DynamoTables } from 'src/common/enum/dynamo.tables.enum';
import { JackpotWinnerType, Status } from 'src/ticket/dto/update-insert-ticket.dto';
import { TicketService } from 'src/ticket/ticket.service';
import { AddJackpotTicketDto } from './dto/add-jackpot-ticket.dto';
import { TransactionService } from 'src/transaction/transaction.service';
import { percentageCalculate, pickAliasWinner, updateParamsGenerator } from 'src/common/utils/util-functions.utility';
import { JackpotLookupService } from './jackpot-lookup.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class JackpotService {
  private readonly logger = new Logger(JackpotService.name);
  private readonly dynamoDb: DynamoDBClient;
  private readonly tableName: string;

  constructor(private readonly dynamoService: DynamoService,
    private readonly ticketService: TicketService,
    private readonly transactionService: TransactionService,
    private readonly jackpotLookupService: JackpotLookupService,
    @InjectQueue('jackpot') private readonly jackpotQueue: Queue,
  ) {
    this.tableName = DynamoTables.Jackpots;
    this.dynamoDb = dynamoService.getClient();
  }

  getTableName(): string {
    return this.tableName;
  }

  getTablePK(): string {
    return 'id';
  }

  async createJackpot(createJackpotDto: CreateJackpotDto): Promise<any> {
    //generate auto id
    let generatedId = uuidv4();
    while (
      await this.dynamoService.isIdExist(
        generatedId,
        this.getTablePK(),
        this.getTableName(),
      )
    ) {
      generatedId = uuidv4();
    }
    const params = {
      TableName: this.tableName,
      Item: {
        ...createJackpotDto,
        id: generatedId,
      },
    };

    try {
      await this.dynamoDb.send(new PutCommand(params));
      return params.Item;
    } catch (error) {
      console.error('Error inserting item:', error);
      throw new Error('Error creating Jackpot');
    }
  }

  async getJackpotById(id: string): Promise<any> {
    const params = {
      TableName: this.tableName,
      Key: { id: id },
    };

    try {
      const result = await this.dynamoDb.send(new GetCommand(params));
      return result.Item;
    } catch (error) {
      console.error('Error querying table:', error);
      throw new Error('this Jackpot deos not exist');
    }
  }

  async getActiveJackpots(): Promise<any> {
    const params = {
      TableName: this.tableName,
      IndexName: 'JackpotStatusDateIndex',
      KeyConditionExpression: '#jackpotStatus = :jackpotStatus',
      ExpressionAttributeValues: {
        ':jackpotStatus': "Closed",
      },
      ExpressionAttributeNames: {
        '#jackpotStatus': 'status',
      },
      ScanIndexForward: false,
      Limit: 1,
    };

    try {
      const result = await this.dynamoDb.send(new QueryCommand(params));
      return result.Items[0] || null;
    } catch (error) {
      console.error('Error querying index:', error);
      throw new Error('Failed to query the index');
    }
  }

  async getActiveJackpotsByStatus(status: string, limit: number): Promise<any> {
    const params = {
      TableName: this.tableName,
      IndexName: 'JackpotStatusDateIndex',
      KeyConditionExpression: '#jackpotStatus = :jackpotStatus',
      ExpressionAttributeValues: {
        ':jackpotStatus': status,
      },
      ExpressionAttributeNames: {
        '#jackpotStatus': 'status',
      },
      ScanIndexForward: false,
      Limit: limit,
    };

    try {
      const result = await this.dynamoDb.send(new QueryCommand(params));
      return result.Items;
    } catch (error) {
      console.error('Error querying index:', error);
      throw new Error('Failed to query the index');
    }
  }


  generateJackpotWinnerData(ticketData: Array<any>, JackpotLookupData: any, jackpot_draw_date: string = null): Array<any> {

    try {
      const data = [];
      const splitAmount = ticketData.length <= JackpotLookupData.number_of_winners ? JackpotLookupData.total_prize / ticketData.length : JackpotLookupData.total_prize / JackpotLookupData.number_of_winners;

      const winnersCount = ticketData.length <= JackpotLookupData.number_of_winners ? ticketData.length : JackpotLookupData.number_of_winners;

      for (let index = 0; index < ticketData.length; index++) {

        const ticket = ticketData[index];

        if (index + 1 <= winnersCount) {

          ticket.jackpot_win_amount = splitAmount;
          ticket.jackpot_free_claimable_win_amount = percentageCalculate(splitAmount, 20);
          ticket.jackpot_claimable_win_amount = percentageCalculate(splitAmount, 80);
          ticket.jackpot_winner_type = JackpotWinnerType.GUARANTEED;
          ticket.jackpot_rank = index + 1;
          ticket.jackpot_draw_date = jackpot_draw_date;
          data.push(ticket);

        } else {

          break;

        }


      }

      return data;
    } catch (error) {
      throw new Error(error);
    }
  }

  jackpotDefaultParam = {
    status: 'Closed',
    start_date: new Date().toISOString(),
    amount: 0,
    no_to_open: 0,
    total_of_tickets: 1331000,
  }

  async addJackpotAndTickets(addJackpotTicketDto: AddJackpotTicketDto): Promise<boolean> {
    try {

      let { first_player, second_player, first_player_ticket_amount, second_player_ticket_amount } = addJackpotTicketDto;
      const { game_id } = addJackpotTicketDto;

      const winner = addJackpotTicketDto.winner === 'first_player' ? first_player : second_player;

      let isJackpotCompleted = false;

      const activeJackpot = await this.getOrCreateActiveJackpot();

      const totalNewTickets = first_player_ticket_amount + second_player_ticket_amount;
      const remainingCapacity = activeJackpot.total_of_tickets - activeJackpot.no_to_open;

      // Determine the ticket allocation for the winner and the other player
      const winnerTickets = winner === first_player ? first_player_ticket_amount : second_player_ticket_amount;
      const otherPlayerTickets = winner === first_player ? second_player_ticket_amount : first_player_ticket_amount;

      const winnerId = winner;
      const otherPlayerId = winner === first_player ? second_player : first_player;

      if (totalNewTickets > remainingCapacity) {

        const winnerTicketsForCurrentJackpot = Math.min(winnerTickets, remainingCapacity);

        const remainingAfterWinner = remainingCapacity - winnerTicketsForCurrentJackpot;

        const otherPlayerTicketsForCurrentJackpot = Math.min(otherPlayerTickets, remainingAfterWinner);


        const remainingWinnerTickets = winnerTickets - winnerTicketsForCurrentJackpot;
        const remainingOtherPlayerTickets = otherPlayerTickets - otherPlayerTicketsForCurrentJackpot;

        first_player_ticket_amount = winnerTicketsForCurrentJackpot;
        second_player_ticket_amount = otherPlayerTicketsForCurrentJackpot;

        first_player = winnerId;
        second_player = otherPlayerId;

        isJackpotCompleted = true;

        // add jackpot amount
        await this.jackpotQueue.add("jackpot", {
          first_player_ticket_amount: remainingWinnerTickets,
          game_id,
          second_player_ticket_amount: remainingOtherPlayerTickets,
          first_player: first_player,
          second_player: second_player,
          winner
        },
          {
            removeOnComplete: true,
            attempts: 3,
            deduplication: {
              id: activeJackpot.id,
            }
          });
      }

      // Add tickets for both players
      await this.addTicketsToJackpot(activeJackpot.id, { ...addJackpotTicketDto, first_player_ticket_amount, second_player_ticket_amount, first_player, second_player });

      // Create a jackpot transaction
      await this.createJackpotTransaction(activeJackpot, addJackpotTicketDto);

      // Update or create a new jackpot based on the current status
      await this.updateOrCreateJackpot(activeJackpot, { ...addJackpotTicketDto, first_player_ticket_amount, second_player_ticket_amount, first_player, second_player }, isJackpotCompleted);

      return true;

    } catch (error) {
      throw new Error(error);
    }
  }

  private async getOrCreateActiveJackpot(): Promise<any> {
    let activeJackpot = await this.getActiveJackpots();
    if (!activeJackpot) {
      await this.createJackpot(this.jackpotDefaultParam);
      activeJackpot = await this.getActiveJackpots();
    }
    return activeJackpot;
  }

  private async addTicketsToJackpot(jackpotId: string, addJackpotTicketDto: AddJackpotTicketDto): Promise<void> {
    await this.ticketService.createTicketOrUpdate({
      jackpot_id: jackpotId,
      user_id: addJackpotTicketDto.first_player,
      game_id: addJackpotTicketDto.game_id,
      amount: addJackpotTicketDto.first_player_ticket_amount
    });

    await this.ticketService.createTicketOrUpdate({
      jackpot_id: jackpotId,
      user_id: addJackpotTicketDto.second_player,
      game_id: addJackpotTicketDto.game_id,
      amount: addJackpotTicketDto.second_player_ticket_amount
    });
  }

  private async createJackpotTransaction(activeJackpot: any, addJackpotTicketDto: AddJackpotTicketDto): Promise<void> {
    const tx_id = await this.transactionService.generateUniqueId(activeJackpot.id);

    const total_amount = addJackpotTicketDto.first_player_ticket_amount + addJackpotTicketDto.second_player_ticket_amount;

    await this.transactionService.createTransaction({
      tx_id,
      user_id: activeJackpot.id,
      amount: total_amount,
      coin_type: "Dollar",
      tx_operation: "Add",
      tx_type: 'Jackpot Add Pool',
      game_id: addJackpotTicketDto.game_id,
      source_id: addJackpotTicketDto.game_id,
      source_type: 'Game',
      tx_status: "Success",
      updated_balance: activeJackpot.amount + total_amount,
      remarks: 'jackpot add to pool',
      date: new Date().toISOString(),
    });
  }

  private async updateOrCreateJackpot(activeJackpot: any, addJackpotTicketDto: AddJackpotTicketDto, isJackpotCompleted: boolean): Promise<void> {

    const totalAmount = addJackpotTicketDto.first_player_ticket_amount + addJackpotTicketDto.second_player_ticket_amount;
    const updatedJackpot = {
      ...activeJackpot,
      no_to_open: activeJackpot.no_to_open + totalAmount,
      amount: activeJackpot.amount + totalAmount,
      status: isJackpotCompleted ? 'Open' : activeJackpot.status,
    };

    await this.updateJackpot(updatedJackpot);

    // If the jackpot is now 'Open', create a new jackpot
    if (isJackpotCompleted) {
      // do the jackpot distribution
      await this.distributeJackpotWinners(updatedJackpot.id);
    }
  }

  async updateAllTickets(ticketData: Array<any>, status): Promise<any> {
    for (const jackpotPlayersData of ticketData) {

      const { user_id, ticket_id, ...rest } = jackpotPlayersData;
      // update jackpot
      await this.ticketService.updateTicket({ user_id, ticket_id }, { ...rest, status });

    }
  }

  async distributeJackpotWinners(jackpotId: string): Promise<boolean> {

    const jackpotData = await this.getJackpotById(jackpotId);

    if (jackpotData.amount !== this.jackpotDefaultParam.total_of_tickets || jackpotData.status !== 'Open') {
      console.log('jackpot something went wrong');
      return false;
    }

    const winners = [];

    // find the random winner
    const JackpotLookupData = await this.jackpotLookupService.getAllJackpotRecords();

    const guaranteedEntry = JackpotLookupData.find(item => item.place === "guaranteed");
    const winnerEntries = JackpotLookupData.filter(item => item.place !== "guaranteed");

    const jackpotTicketData = await this.ticketService.getTicketsByJackpotStatus(jackpotId, [Status.VALID]);

    const jackpot_draw_date = new Date().toISOString();

    for (const entry of winnerEntries) {

      for (let i = 0; i < entry.number_of_winners; i++) {

        const { winner, index } = pickAliasWinner(jackpotTicketData);
        winners.push({
          ...winner, jackpot_rank: 0,
          jackpot_win_amount: entry.prize_per_winner,
          jackpot_free_claimable_win_amount: percentageCalculate(entry.prize_per_winner, 20),
          jackpot_claimable_win_amount: percentageCalculate(entry.prize_per_winner, 80),
          jackpot_winner_type: entry.place,
          jackpot_draw_date
        });
        jackpotTicketData.splice(index, 1);

      }

    }

    const jackpotDistributionWinners = this.generateJackpotWinnerData(jackpotTicketData, guaranteedEntry, jackpot_draw_date);


    await this.updateAllTickets([...winners, ...jackpotDistributionWinners], Status.PENDING);

    const remainingTickets = await this.ticketService.getTicketsByJackpotStatus(jackpotId, [Status.VALID]);
    await this.updateAllTickets(remainingTickets, Status.NO_REWARD);

    await this.updateJackpot({ ...jackpotData, status: 'Expired' });

    return true;

  }

  async getJackpotsByStatus(status: string): Promise<any> {
    const params = {
      TableName: this.tableName,
      IndexName: 'JackpotStatusIndex',
      KeyConditionExpression: '#jackpotStatus = :jackpotStatus',
      ExpressionAttributeValues: {
        ':jackpotStatus': status,
      },
      ExpressionAttributeNames: {
        '#jackpotStatus': 'status',
      },
    };

    try {
      const result = await this.dynamoDb.send(new QueryCommand(params));
      return result.Items;
    } catch (error) {
      console.error('Error querying index:', error);
      throw new Error('Failed to query the index');
    }
  }

  async getAllJackpots(): Promise<any> {
    const params = {
      TableName: this.tableName,
    };

    try {
      const result = await this.dynamoDb.send(new ScanCommand(params));
      return result.Items;
    } catch (error) {
      console.error('Error scanning table:', error);
      throw new Error('Failed to scan the table');
    }
  }

  async updateJackpot(updateJackpotDto: UpdateJackpotDto): Promise<any> {
    try {

      const { id, ...rest } = updateJackpotDto;

      const params = updateParamsGenerator({ id }, rest, this.tableName);

      const result = await this.dynamoDb.send(new UpdateCommand(params));
      return result.Attributes;
    } catch (error) {
      throw new Error('Failed to update the item');
    }
  }

  async deleteJackpotById(id: string): Promise<any> {
    const params = {
      TableName: this.tableName,
      Key: { id: id },
    };

    try {
      return await this.dynamoDb.send(new DeleteCommand(params));
    } catch (error) {
      console.error('Error deleting item:', error);
      throw new Error('Failed to delete the item');
    }
  }
}
