export interface User {
  id: string;
  phone: string;
}

export interface Loan {
  id: string;
  friendName: string;
  amount: number;
  dueDate: string;
  isRepaid: boolean;
  isOverdue: boolean;
  receiptUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoanSummary {
  totalLent: number;
  totalRepaid: number;
  overdueAmount: number;
}

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  AddLoan: undefined;
};
