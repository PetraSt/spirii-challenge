export type TransactionType = 'earned' | 'spent' | 'payout';

export interface Transaction {
  id: string;
  userId: string;
  createdAt: string;
  type: TransactionType;
  amount: number;
}

export interface TransactionResponse {
  items: Transaction[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

export interface UserAggregatedData {
  userId: string;
  balance: number;
  earned: number;
  spent: number;
  payout: number;
  paidOut: number;
}

export interface PayoutRequest {
  userId: string;
  amount: number;
}
