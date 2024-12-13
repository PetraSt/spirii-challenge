import { Test, TestingModule } from '@nestjs/testing';
import { DataAggregationService } from './data-aggregation.service';
import { TransactionApiService } from './transaction-api.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Transaction, TransactionType } from '../models/transaction.model';
import { Logger } from '@nestjs/common';

// Add this class before the describe block
class TestableDataAggregationService extends DataAggregationService {
  public async testSyncTransactions(): Promise<void> {
    return this.syncTransactions();
  }
}

describe('DataAggregationService', () => {
  let service: TestableDataAggregationService;
  let transactionApiService: TransactionApiService;
  let cacheManager: Cache;

  const mockTransactions: Transaction[] = [
    {
      id: '1',
      userId: '074092',
      createdAt: '2024-01-01T00:00:00Z',
      type: 'earned' as TransactionType,
      amount: 150,
    },
    {
      id: '2',
      userId: '074092',
      createdAt: '2024-01-02T00:00:00Z',
      type: 'spent' as TransactionType,
      amount: 50,
    },
    {
      id: '3',
      userId: '074092',
      createdAt: '2024-01-03T00:00:00Z',
      type: 'payout' as TransactionType,
      amount: 75,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: DataAggregationService,
          useClass: TestableDataAggregationService,
        },
        {
          provide: TransactionApiService,
          useValue: {
            getTransactions: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TestableDataAggregationService>(
      DataAggregationService,
    );
    transactionApiService = module.get<TransactionApiService>(
      TransactionApiService,
    );
    cacheManager = module.get(CACHE_MANAGER);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  describe('syncTransactions', () => {
    it('should sync transactions and update cache', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(transactionApiService, 'getTransactions').mockResolvedValue({
        items: mockTransactions,
        meta: {
          totalItems: mockTransactions.length,
          itemCount: mockTransactions.length,
          itemsPerPage: 10,
          totalPages: 1,
          currentPage: 1,
        },
      });
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      await service.testSyncTransactions();

      expect(transactionApiService.getTransactions).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith(
        'lastSyncTime',
        expect.any(String),
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        'user:074092',
        expect.objectContaining({
          userId: '074092',
          balance: 175, // 150 earned - 50 spent + 75 payout
          earned: 150,
          spent: 50,
          payout: 75,
        }),
        120000,
      );
    });

    it('should prevent concurrent syncs', async () => {
      const syncSpy = jest.spyOn(transactionApiService, 'getTransactions');

      // Start two concurrent syncs
      const sync1 = service.testSyncTransactions();
      const sync2 = service.testSyncTransactions();

      await Promise.all([sync1, sync2]);

      // Should only call the API once
      expect(syncSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors gracefully', async () => {
      jest
        .spyOn(transactionApiService, 'getTransactions')
        .mockRejectedValue(new Error('API Error'));

      await service.testSyncTransactions();

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Sync failed'),
      );
    });
  });

  describe('getUserAggregatedData', () => {
    it('should return cached user data', async () => {
      const mockUserData = {
        userId: '074092',
        balance: 175,
        earned: 150,
        spent: 50,
        payout: 75,
        paidOut: 0,
      };

      jest.spyOn(cacheManager, 'get').mockResolvedValue(mockUserData);

      const result = await service.getUserAggregatedData('074092');
      expect(result).toEqual(mockUserData);
    });

    it('should return null for non-existent user', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);

      const result = await service.getUserAggregatedData('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getTransactionsForPeriod', () => {
    it('should return transactions for specified period', async () => {
      jest.spyOn(transactionApiService, 'getTransactions').mockResolvedValue({
        items: mockTransactions,
        meta: {
          totalItems: mockTransactions.length,
          itemCount: mockTransactions.length,
          itemsPerPage: 10,
          totalPages: 1,
          currentPage: 1,
        },
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');

      const result = await service.getTransactionsForPeriod(startDate, endDate);

      expect(result).toEqual(mockTransactions);
      expect(transactionApiService.getTransactions).toHaveBeenCalledWith(
        startDate,
        endDate,
      );
    });

    it('should use current date as endDate if not provided', async () => {
      jest.spyOn(transactionApiService, 'getTransactions').mockResolvedValue({
        items: mockTransactions,
        meta: {
          totalItems: mockTransactions.length,
          itemCount: mockTransactions.length,
          itemsPerPage: 10,
          totalPages: 1,
          currentPage: 1,
        },
      });

      const startDate = new Date('2024-01-01');
      await service.getTransactionsForPeriod(startDate);

      expect(transactionApiService.getTransactions).toHaveBeenCalledWith(
        startDate,
        expect.any(Date),
      );
    });

    it('should handle API errors', async () => {
      jest
        .spyOn(transactionApiService, 'getTransactions')
        .mockRejectedValue(new Error('API Error'));

      await expect(
        service.getTransactionsForPeriod(new Date()),
      ).rejects.toThrow('API Error');
    });
  });

  describe('getPayoutRequests', () => {
    it('should aggregate payout transactions by user', async () => {
      const payoutTransactions = [
        {
          id: '1',
          userId: '074092',
          createdAt: '2024-01-01T00:00:00Z',
          type: 'payout' as TransactionType,
          amount: 100,
        },
        {
          id: '2',
          userId: '074092',
          createdAt: '2024-01-02T00:00:00Z',
          type: 'payout' as TransactionType,
          amount: 50,
        },
        {
          id: '3',
          userId: '085123',
          createdAt: '2024-01-03T00:00:00Z',
          type: 'payout' as TransactionType,
          amount: 75,
        },
      ];

      jest.spyOn(transactionApiService, 'getTransactions').mockResolvedValue({
        items: payoutTransactions,
        meta: {
          totalItems: payoutTransactions.length,
          itemCount: payoutTransactions.length,
          itemsPerPage: 10,
          totalPages: 1,
          currentPage: 1,
        },
      });

      const result = await service.getPayoutRequests();

      expect(result).toEqual([
        { userId: '074092', amount: 150 }, // Combined payouts for first user
        { userId: '085123', amount: 75 }, // Single payout for second user
      ]);
    });

    it('should return empty array when no payout transactions exist', async () => {
      jest.spyOn(transactionApiService, 'getTransactions').mockResolvedValue({
        items: [],
        meta: {
          totalItems: 0,
          itemCount: 0,
          itemsPerPage: 10,
          totalPages: 1,
          currentPage: 1,
        },
      });

      const result = await service.getPayoutRequests();
      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      jest
        .spyOn(transactionApiService, 'getTransactions')
        .mockRejectedValue(new Error('API Error'));

      await expect(service.getPayoutRequests()).rejects.toThrow('API Error');
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch payout requests'),
      );
    });
  });

  describe('processTransactions', () => {
    it('should handle insufficient balance for spent transactions', async () => {
      const transactions = [
        {
          id: '1',
          userId: '074092',
          createdAt: '2024-01-01T00:00:00Z',
          type: 'spent' as TransactionType,
          amount: 100, // Trying to spend without having earned anything
        },
      ];

      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      // @ts-expect-error - accessing private method for testing
      await service.processTransactions(transactions);

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Transaction declined for user 074092: insufficient balance',
        ),
      );
    });

    it('should process mixed transaction types correctly', async () => {
      const transactions = [
        {
          id: '1',
          userId: '074092',
          createdAt: '2024-01-01T00:00:00Z',
          type: 'earned' as TransactionType,
          amount: 100,
        },
        {
          id: '2',
          userId: '074092',
          createdAt: '2024-01-02T00:00:00Z',
          type: 'spent' as TransactionType,
          amount: 30,
        },
        {
          id: '3',
          userId: '074092',
          createdAt: '2024-01-03T00:00:00Z',
          type: 'payout' as TransactionType,
          amount: 50,
        },
      ];

      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      // @ts-expect-error - accessing private method for testing
      await service.processTransactions(transactions);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'user:074092',
        expect.objectContaining({
          balance: 120, // 100 earned - 30 spent + 50 payout
          earned: 100,
          spent: 30,
          payout: 50,
        }),
        120000,
      );
    });
  });
});
