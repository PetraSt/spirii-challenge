import {
  Controller,
  Get,
  Param,
  NotFoundException,
  HttpException,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { DataAggregationService } from '../services/data-aggregation.service';
import { UserAggregatedData, PayoutRequest } from '../models/transaction.model';
import { TransactionType } from '../models/transaction.model';

@Controller('aggregation')
export class AggregationController {
  constructor(
    private readonly dataAggregationService: DataAggregationService,
  ) {}

  @Get('user/:userId')
  async getUserAggregatedData(
    @Param('userId') userId: string,
  ): Promise<UserAggregatedData> {
    try {
      const data =
        await this.dataAggregationService.getUserAggregatedData(userId);
      if (!data) {
        throw new NotFoundException(
          `User data not found for userId: ${userId}`,
        );
      }
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('user/:userId/transactions')
  async getUserTransactions(
    @Param('userId') userId: string,
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr?: string,
    @Query('type') type?: TransactionType,
  ) {
    try {
      const startDate = new Date(startDateStr);
      const endDate = endDateStr ? new Date(endDateStr) : new Date();

      // Validate dates
      if (isNaN(startDate.getTime())) {
        throw new HttpException(
          'Invalid startDate format',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (endDateStr && isNaN(endDate.getTime())) {
        throw new HttpException(
          'Invalid endDate format',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Get transactions for the period
      const transactions =
        await this.dataAggregationService.getTransactionsForPeriod(
          startDate,
          endDate,
        );

      // Filter transactions by userId and optionally by type
      return transactions.filter(
        (tx) => tx.userId === userId && (!type || tx.type === type),
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('transactions')
  async getTransactions(
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr?: string,
  ) {
    try {
      const startDate = new Date(startDateStr);
      const endDate = endDateStr ? new Date(endDateStr) : new Date();

      if (isNaN(startDate.getTime())) {
        throw new HttpException(
          'Invalid startDate format',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (endDateStr && isNaN(endDate.getTime())) {
        throw new HttpException(
          'Invalid endDate format',
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.dataAggregationService.getTransactionsForPeriod(
        startDate,
        endDate,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('payouts')
  async getPayoutRequests(): Promise<PayoutRequest[]> {
    try {
      const payouts = await this.dataAggregationService.getPayoutRequests();

      if (!payouts.length) {
        return []; // Return empty array if no payouts found
      }

      return payouts;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
