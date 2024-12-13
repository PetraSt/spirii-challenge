import { Injectable, Logger } from '@nestjs/common';
import { TransactionResponse } from '../models/transaction.model';

@Injectable()
export class TransactionApiService {
  private readonly logger = new Logger(TransactionApiService.name);

  async getTransactions(
    startDate: Date,
    endDate: Date,
    page = 1,
  ): Promise<TransactionResponse> {
    // Mock implementation of transaction API
    return {
      items: [
        {
          id: '41bbdf81-735c-4aea-beb3-3e5f433a30c5',
          userId: '074092',
          createdAt: '2023-03-16T12:33:11.000Z',
          type: 'payout',
          amount: 30,
        },
        {
          id: '41bbdf81-735c-4aea-beb3-3e5fasfsdfef',
          userId: '074092',
          createdAt: '2023-03-12T12:33:11.000Z',
          type: 'spent',
          amount: 12,
        },
        {
          id: '41bbdf81-735c-4aea-beb3-342jhj234nj234',
          userId: '074092',
          createdAt: '2023-03-15T12:33:11.000Z',
          type: 'earned',
          amount: 1.2,
        },
        // New user 1 transactions
        {
          id: '55ccef92-846d-5bfb-cfc4-4f6g544b41d6',
          userId: '085123',
          createdAt: '2023-03-14T15:45:22.000Z',
          type: 'payout',
          amount: 45.5,
        },
        {
          id: '66ddfg03-957e-6cgc-dfd5-5g7h655c52e7',
          userId: '085123',
          createdAt: '2023-03-15T09:20:33.000Z',
          type: 'earned',
          amount: 5.75,
        },
        {
          id: '77eefh14-068f-7dhd-ege6-6h8i766d63f8',
          userId: '085123',
          createdAt: '2023-03-16T14:10:44.000Z',
          type: 'spent',
          amount: 25,
        },
        // New user 2 transactions
        {
          id: '88ffgi25-179g-8eie-fgf7-7i9j877e74g9',
          userId: '096234',
          createdAt: '2023-03-13T11:25:55.000Z',
          type: 'payout',
          amount: 60.8,
        },
        {
          id: '99gghj36-280h-9fjf-ghg8-8j0k988f85h0',
          userId: '096234',
          createdAt: '2023-03-14T16:40:66.000Z',
          type: 'spent',
          amount: 22.3,
        },
        {
          id: '00hhik47-391i-0gkg-hih9-9k1l099g96i1',
          userId: '096234',
          createdAt: '2023-03-15T13:15:77.000Z',
          type: 'earned',
          amount: 3.5,
        },
      ],
      meta: {
        totalItems: 1200,
        itemCount: 3,
        itemsPerPage: 3,
        totalPages: 400,
        currentPage: page,
      },
    };
  }
}
