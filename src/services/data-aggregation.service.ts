import { Injectable, Logger } from '@nestjs/common';
import { TransactionApiService } from './transaction-api.service';
import { Cron } from '@nestjs/schedule';
import {
  UserAggregatedData,
  PayoutRequest,
  Transaction,
} from '../models/transaction.model';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';

/**
 * Service responsible for aggregating transaction data and maintaining cache
 * Updates every minute and ensures data is no more than 2 minutes stale
 */
@Injectable()
export class DataAggregationService {
  private readonly logger = new Logger(DataAggregationService.name);
  private isProcessing = false; // Prevents concurrent sync operations NOT THREAD SAFE FOR NOW

  constructor(
    private readonly transactionApiService: TransactionApiService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Syncs transaction data every 20 seconds
   * Fetches new transactions since last sync and updates aggregated data in cache
   */
  @Cron('*/15 * * * * *')
  protected async syncTransactions(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    try {
      // we store the last sync time in cache so we can resume from where we left off and not
      // re-sync the same transactions. NOTE: this will not be usesfull with the mocking API
      const lastSync = await this.cacheManager.get<string>('lastSyncTime');
      const startDate = lastSync ? new Date(lastSync) : new Date(0);
      const endDate = new Date();

      const response = await this.transactionApiService.getTransactions(
        startDate,
        endDate,
      );
      await this.processTransactions(response.items);
      await this.cacheManager.set('lastSyncTime', endDate.toISOString());
    } catch (error) {
      this.logger.error(`Sync failed: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Processes transactions and updates user aggregated data in cache
   * Handles different transaction types (earned, spent, payout)
   * Updates all users' data in parallel
   */
  private async processTransactions(transactions: Transaction[]) {
    const aggregates = new Map<string, UserAggregatedData>();

    // Aggregate transactions by user
    for (const tx of transactions) {
      const data = aggregates.get(tx.userId) || {
        userId: tx.userId,
        balance: 0,
        earned: 0,
        spent: 0,
        payout: 0,
        paidOut: 0,
      };

      // Update user's aggregated data based on transaction type
      switch (tx.type) {
        case 'earned':
          data.earned += tx.amount;
          data.balance += tx.amount;
          break;
        case 'spent':
          if (data.balance < tx.amount) {
            this.logger.warn(
              `Transaction declined for user ${tx.userId}: insufficient balance.`,
            );
            continue;
          }
          data.spent += tx.amount;
          data.balance -= tx.amount;
          break;
        case 'payout':
          data.payout += tx.amount;
          data.balance += tx.amount;
          break;
      }

      aggregates.set(tx.userId, data);
    }

    // Update cache for all users in parallel with 2-minute TTL
    await Promise.all(
      Array.from(aggregates.entries()).map(([userId, data]) =>
        this.cacheManager.set(`user:${userId}`, data, 120000),
      ),
    );
  }

  /**
   * Retrieves aggregated data for a specific user from cache
   */
  async getUserAggregatedData(
    userId: string,
  ): Promise<UserAggregatedData | null> {
    return this.cacheManager.get(`user:${userId}`);
  }

  /**
   * Gets transactions for a specified time period
   * @param startDate Start of the time period
   * @param endDate End of the time period (defaults to current time if not provided)
   */
  async getTransactionsForPeriod(
    startDate: Date,
    endDate: Date = new Date(),
  ): Promise<Transaction[]> {
    try {
      const response = await this.transactionApiService.getTransactions(
        startDate,
        endDate,
      );
      return response.items;
    } catch (error) {
      this.logger.error(`Failed to fetch transactions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gets aggregated payout requests for all users
   * Combines multiple requests from the same user into a single total
   */
  async getPayoutRequests(): Promise<PayoutRequest[]> {
    try {
      // Get all transactions from the beginning of time
      const response = await this.transactionApiService.getTransactions(
        new Date(0), // from beginning
        new Date(), // until now
      );

      // Filter payout transactions and aggregate by user
      const payoutsByUser = response.items
        .filter((tx) => tx.type === 'payout')
        .reduce((acc, tx) => {
          const existing = acc.get(tx.userId) || 0;
          acc.set(tx.userId, existing + tx.amount);
          return acc;
        }, new Map<string, number>());

      // Convert to PayoutRequest array
      return Array.from(payoutsByUser.entries()).map(([userId, amount]) => ({
        userId,
        amount,
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch payout requests: ${error.message}`);
      throw error;
    }
  }
}
