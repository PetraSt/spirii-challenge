import { Test, TestingModule } from '@nestjs/testing';
import { AggregationController } from './aggregation.controller';
import { DataAggregationService } from '../services/data-aggregation.service';
import { HttpException, NotFoundException } from '@nestjs/common';
import {
  UserAggregatedData,
  Transaction,
  PayoutRequest,
} from '../models/transaction.model';

describe('AggregationController', () => {
  let controller: AggregationController;
  let service: DataAggregationService;

  const mockUserData: UserAggregatedData = {
    userId: '074092',
    balance: 100,
    earned: 150,
    spent: 50,
    payout: 0,
    paidOut: 0,
  };

  const mockTransactions: Transaction[] = [
    {
      id: '1',
      userId: '074092',
      createdAt: '2024-01-01T00:00:00Z',
      type: 'earned',
      amount: 150,
    },
    {
      id: '2',
      userId: '074092',
      createdAt: '2024-01-02T00:00:00Z',
      type: 'spent',
      amount: 50,
    },
  ];

  const mockPayouts: PayoutRequest[] = [
    {
      userId: '074092',
      amount: 100,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AggregationController],
      providers: [
        {
          provide: DataAggregationService,
          useValue: {
            getUserAggregatedData: jest.fn(),
            getTransactionsForPeriod: jest.fn(),
            getPayoutRequests: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AggregationController>(AggregationController);
    service = module.get<DataAggregationService>(DataAggregationService);
  });

  describe('getUserAggregatedData', () => {
    it('should return user data when found', async () => {
      jest
        .spyOn(service, 'getUserAggregatedData')
        .mockResolvedValue(mockUserData);

      const result = await controller.getUserAggregatedData('074092');
      expect(result).toEqual(mockUserData);
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(service, 'getUserAggregatedData').mockResolvedValue(null);

      await expect(
        controller.getUserAggregatedData('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle service errors', async () => {
      jest
        .spyOn(service, 'getUserAggregatedData')
        .mockRejectedValue(new Error('Service error'));

      await expect(controller.getUserAggregatedData('074092')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('getUserTransactions', () => {
    it('should return filtered transactions', async () => {
      jest
        .spyOn(service, 'getTransactionsForPeriod')
        .mockResolvedValue(mockTransactions);

      const result = await controller.getUserTransactions(
        '074092',
        '2024-01-01',
        '2024-01-02',
        'earned',
      );

      expect(result).toEqual([mockTransactions[0]]);
    });

    it('should throw BadRequest for invalid date format', async () => {
      await expect(
        controller.getUserTransactions(
          '074092',
          'invalid-date',
          undefined,
          undefined,
        ),
      ).rejects.toThrow(HttpException);
    });

    it('should use current date when endDate is not provided', async () => {
      jest
        .spyOn(service, 'getTransactionsForPeriod')
        .mockResolvedValue(mockTransactions);

      await controller.getUserTransactions('074092', '2024-01-01');

      expect(service.getTransactionsForPeriod).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
      );
    });
  });

  describe('getTransactions', () => {
    it('should return all transactions for period', async () => {
      jest
        .spyOn(service, 'getTransactionsForPeriod')
        .mockResolvedValue(mockTransactions);

      const result = await controller.getTransactions(
        '2024-01-01',
        '2024-01-02',
      );
      expect(result).toEqual(mockTransactions);
    });

    it('should throw BadRequest for invalid date format', async () => {
      await expect(controller.getTransactions('invalid-date')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('getPayoutRequests', () => {
    it('should return payout requests when found', async () => {
      jest.spyOn(service, 'getPayoutRequests').mockResolvedValue(mockPayouts);

      const result = await controller.getPayoutRequests();
      expect(result).toEqual(mockPayouts);
    });

    it('should return empty array when no payouts found', async () => {
      jest.spyOn(service, 'getPayoutRequests').mockResolvedValue([]);

      const result = await controller.getPayoutRequests();
      expect(result).toEqual([]);
    });

    it('should handle service errors', async () => {
      jest
        .spyOn(service, 'getPayoutRequests')
        .mockRejectedValue(new Error('Service error'));

      await expect(controller.getPayoutRequests()).rejects.toThrow(
        HttpException,
      );
    });
  });
});
