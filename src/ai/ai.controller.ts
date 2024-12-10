import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Inject,
  UseGuards,
  HttpStatus,
  Res,
  UsePipes,
} from '@nestjs/common';
import { AiService } from './ai.service';
import {
  IUser,
  UserRequest,
} from 'src/common/interfaces/user-request.interface';
import { REQUEST } from '@nestjs/core';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Response } from 'express';
import { RequestValidationPipe } from 'src/common/pipes/request-validation.pipe';
import { PlanService } from 'src/plan/plan.service';
import { formatDateToYYYYMMDD } from 'src/common/helpers/dateTIme.utils';
import { UpdateAiDto } from './dto/update-ai.dto';
import { GameService } from 'src/game/game.service';
import {
  GameStatus,
  InsertGameDto,
  SourceType,
} from 'src/game/dto/insert-game.dto';
import { WalletService } from 'src/wallet/wallet.service';
import { TransactionService } from 'src/transaction/transaction.service';
import { handleResponse } from 'src/common/utils/util-functions.utility';
import { PlayerService } from 'src/player/player.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('ai')
@UseGuards(JwtAuthGuard)
@UsePipes(new RequestValidationPipe({ transform: true }))
export class AiController {
  constructor(
    private readonly AiService: AiService,
    private readonly PlanService: PlanService,
    @Inject(REQUEST) private readonly request: UserRequest,
    private readonly gameService: GameService,
    private readonly walletService: WalletService,
    private readonly transactionService: TransactionService,
    private readonly playerService: PlayerService,
    @InjectQueue('game-timer') private readonly gameTimerQueue: Queue,
  ) {}

  private getUserDetails(): IUser {
    return this.request.user;
  }

  async createPlanForUsers(user_id, planDetail, todaysDate) {
    const id = await this.AiService.generateUniqueId(user_id);
    const available_plan_action_source = [];
    let is_active = true;

    if (planDetail.action === 'social') {
      const completedSocialActions = await this.AiService.getAllAiByPlanId({
        plan_id: planDetail.id,
        user_id,
      });

      const action_source = planDetail.action_source;
      const plan_action_source_list = completedSocialActions.map(
        (v) => v.plan_action_source,
      );

      // available_plan_action_source add the action source which is not in plan_action_source_list
      for (const action of action_source) {
        if (!plan_action_source_list.includes(action)) {
          available_plan_action_source.push(action);
        }
      }

      // check length of available_plan_action_source
      if (available_plan_action_source.length === 0) {
        is_active = false;
      }
    }

    // create a new ai plan
    const userAiPlan = {
      id,
      user_id,
      plan_id: planDetail.id,
      plan_action_source: 'null',
      available_plan_action_source,
      no_tries: 0,
      remaining_tries: planDetail.valid_tries,
      is_active,
      date: todaysDate,
      updated_date: 'null',
    };

    await this.AiService.createAi(userAiPlan);
    return userAiPlan;
  }

  @Get('/all')
  async getAllAiById(@Res() res: Response) {
    try {
      const { user_id } = this.getUserDetails();
      const todaysDate = formatDateToYYYYMMDD();

      const planDetails = await this.PlanService.getAllPlans();

      const allUserAiPlans = [];

      for (const planDetail of planDetails) {
        let [userAiPlan] = await this.AiService.getAiByPlanId({
          plan_id: planDetail.id,
          user_id,
          date: todaysDate,
        });

        if (!userAiPlan) {
          userAiPlan = await this.createPlanForUsers(
            user_id,
            planDetail,
            todaysDate,
          );
        }
        allUserAiPlans.push(userAiPlan);
      }

      return handleResponse(
        res,
        HttpStatus.OK,
        'AI records retrieved successfully',
        allUserAiPlans,
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error retrieving AI records',
        [],
        [error.message],
      );
    }
  }

  @Get('id/:id')
  async getAiById(@Param('id') id: string, @Res() res: Response) {
    try {
      const { user_id } = this.getUserDetails();
      const data = await this.AiService.getAiById({
        id,
        user_id,
      });
      if (!data) {
        return handleResponse(
          res,
          HttpStatus.NOT_FOUND,
          'Player AI not found',
          [],
          ['Player AI not found'],
        );
      }
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: 'Player AI retrieved successfully',
        data: data,
        errors: [],
      });
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error retrieving Player AI',
        [],
        [error.message],
      );
    }
  }

  @Get('plan_id/:plan_id')
  async getAiByPlanId(@Param('plan_id') plan_id: string, @Res() res: Response) {
    try {
      const { user_id } = this.getUserDetails();
      const todaysDate = formatDateToYYYYMMDD();

      const planDetails = await this.PlanService.getPlanById(plan_id);

      if (!planDetails) {
        return handleResponse(
          res,
          HttpStatus.NOT_FOUND,
          'Plan not found',
          [],
          ['Plan not found'],
        );
      }

      let [userAiPlan] = await this.AiService.getAiByPlanId({
        plan_id,
        user_id,
        date: todaysDate,
      });

      if (!userAiPlan) {
        const id = await this.AiService.generateUniqueId(user_id);
        const available_plan_action_source = [];
        let is_active = true;

        if (planDetails.action === 'social') {
          const completedSocialActions = await this.AiService.getAllAiByPlanId({
            plan_id: planDetails.id,
            user_id,
          });

          const action_source = planDetails.action_source;
          const plan_action_source_list = completedSocialActions.map(
            (v) => v.plan_action_source,
          );

          // available_plan_action_source add the action source which is not in plan_action_source_list
          for (const action of action_source) {
            if (!plan_action_source_list.includes(action)) {
              available_plan_action_source.push(action);
            }
          }

          // check length of available_plan_action_source
          if (available_plan_action_source.length === 0) {
            is_active = false;
          }
        }

        // create a new ai plan
        userAiPlan = {
          id,
          user_id,
          plan_id,
          plan_action_source: 'null',
          available_plan_action_source,
          no_tries: 0,
          remaining_tries: planDetails.valid_tries,
          is_active,
          date: todaysDate,
          updated_date: 'null',
        };

        await this.AiService.createAi(userAiPlan);
      }

      return handleResponse(
        res,
        HttpStatus.OK,
        'Player AI retrieved successfully',
        userAiPlan,
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error retrieving Player AI',
        [],
        [error.message],
      );
    }
  }

  @Get('date/:date')
  async getAiByDate(@Param('date') date: string, @Res() res: Response) {
    try {
      const { user_id } = this.getUserDetails();
      // convert date to iso string
      date = new Date(date).toISOString();
      const data = await this.AiService.getAiByDate({
        user_id,
        date,
      });
      if (!data) {
        return handleResponse(
          res,
          HttpStatus.NOT_FOUND,
          'Player AI not found',
          [],
          ['Player AI not found'],
        );
      }

      return handleResponse(
        res,
        HttpStatus.OK,
        'Player AI retrieved successfully',
        data,
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error retrieving Player AI',
        [],
        [error.message],
      );
    }
  }

  @Patch()
  async updateAi(@Body() UpdateAiDto: UpdateAiDto, @Res() res: Response) {
    try {
      const { user_id } = this.getUserDetails();
      const date = formatDateToYYYYMMDD();

      const secondPlayerDetails = await this.playerService.getPlayerDetails({
        user_id,
      });

      if (!secondPlayerDetails) {
        return handleResponse(
          res,
          HttpStatus.NOT_FOUND,
          'Player not found',
          [],
          ['Player not found'],
        );
      }

      let [playerAiDetail] = await this.AiService.queryAiById({
        ...UpdateAiDto,
        user_id,
        date,
      });

      // add some validation check the player is already in game by getting the all players ai and check with game source

      if (!playerAiDetail) {
        return handleResponse(
          res,
          HttpStatus.NOT_FOUND,
          'Player AI not found',
          [],
          ['Player AI not found'],
        );
      }

      const activeGameStatus = ['Playing', 'Ready'];
      const [gameData] = await this.gameService.getGameStatusBySource(
        UpdateAiDto.id,
      );

      if (
        gameData &&
        activeGameStatus.includes(gameData.second_player_status)
      ) {
        return handleResponse(
          res,
          HttpStatus.NOT_FOUND,
          'player have already active game',
          [],
          ['player have already active game'],
        );
      }

      let { remaining_tries, no_tries, is_active } = playerAiDetail;

      if (!is_active) {
        return handleResponse(
          res,
          HttpStatus.NOT_FOUND,
          'player AI is not active',
          [],
          ['player AI is not active'],
        );
      }

      const planDetails = await this.PlanService.getPlanById(
        playerAiDetail.plan_id,
      );

      if (
        planDetails.action === 'social' &&
        UpdateAiDto.plan_action_source == null
      ) {
        return handleResponse(
          res,
          HttpStatus.NOT_FOUND,
          'must provide plan_action_source when action is social and not be null',
          [],
          [
            'must provide plan_action_source when action is social and not be null',
          ],
        );
      } else if (
        planDetails.action !== 'social' &&
        UpdateAiDto.plan_action_source !== null
      ) {
        return handleResponse(
          res,
          HttpStatus.NOT_FOUND,
          'plan_action_source must be null when action is not social',
          [],
          ['plan_action_source must be null when action is not social'],
        );
      }
      // validate for social action

      if (UpdateAiDto.plan_action_source) {
        if (
          !playerAiDetail.available_plan_action_source.includes(
            UpdateAiDto.plan_action_source,
          )
        ) {
          return handleResponse(
            res,
            HttpStatus.NOT_FOUND,
            'Invalid action source',
            [],
            ['Invalid action source'],
          );
        }
      }
      // validate for social action end

      remaining_tries -= 1;
      no_tries += 1;
      is_active = remaining_tries > 0;

      const plan_action_source =
        UpdateAiDto?.plan_action_source ?? playerAiDetail.plan_action_source;

      playerAiDetail = {
        ...playerAiDetail,
        remaining_tries,
        no_tries,
        is_active,
        plan_action_source,
        updated_date: new Date().toISOString(),
      };
      await this.AiService.updateAi(playerAiDetail);

      // get company wallet details and add game record wallet transaction etc

      const [companyWallet] =
        await this.walletService.getWalletsByType('Company');

      if (!companyWallet) {
        return handleResponse(
          res,
          HttpStatus.NOT_FOUND,
          'Company wallet not found',
          [],
          ['Company wallet not found'],
        );
      }

      // check company wallet have balance_dollar available in reference to planDetails.amount

      const game_id = await this.gameService.generateUniqueId();

      await this.transactionService.validateAndCreateTransaction(
        { user_id: companyWallet.user_id },
        {
          user_id: companyWallet.user_id,
          tx_type: 'Game Ai',
          tx_operation: 'Remove',
          coin_type: 'LC',
          tx_status: 'Pending',
          source_type: 'Game',
          source_id: game_id,
          game_id,
          amount: planDetails.amount,
          remarks: `AI game lucky coin transaction`,
          date: new Date().toISOString(),
        },
      );

      const insertPlayerGameDto = new InsertGameDto();
      insertPlayerGameDto.source_type = SourceType.AI;
      insertPlayerGameDto.source_id = UpdateAiDto.id;
      insertPlayerGameDto.first_player = companyWallet.user_id;
      insertPlayerGameDto.second_player = user_id;
      insertPlayerGameDto.first_player_status = GameStatus.Ready;
      insertPlayerGameDto.second_player_status = GameStatus.Ready;
      insertPlayerGameDto.winner = 'null';
      insertPlayerGameDto.first_player_result = 0;
      insertPlayerGameDto.second_player_result = 0;
      insertPlayerGameDto.amount = planDetails.amount;
      insertPlayerGameDto.first_player_name = planDetails?.name || null;
      insertPlayerGameDto.second_player_name = secondPlayerDetails.name;
      insertPlayerGameDto.first_player_image = planDetails?.image || null;
      insertPlayerGameDto.second_player_image =
        secondPlayerDetails?.profile_img || null;

      await this.gameService.createPlayerGame({ game_id }, insertPlayerGameDto);

      this.gameTimerQueue.add(
        'game-timer-ai',
        {
          game_id,
          first_player: insertPlayerGameDto.first_player,
          second_player: insertPlayerGameDto.second_player,
        },
        { attempts: 0, backoff: 5000, delay: 150000 },
      );

      // only increment ai
      await this.playerService.updatePlayerGameStatuses([
        {
          userId: insertPlayerGameDto.first_player,
          lastGameDate: true,
          incrementGames: 1,
        },
      ]);

      // add game record wallet transaction etc end

      return handleResponse(
        res,
        HttpStatus.OK,
        'Player AI records updated successfully',
        { ...insertPlayerGameDto, game_id },
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error updating  AI records',
        [],
        [error.message],
      );
    }
  }
}
