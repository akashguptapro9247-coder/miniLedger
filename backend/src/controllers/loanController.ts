import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { createLoanSchema } from '../utils/validation';
import { normalizeToMidnight, isLoanOverdue } from '../utils/date';
import { AppError } from '../middleware/errorHandler';

/**
 * Formats a Prisma Loan record for consistent JSON representation
 * Converts Decimal to JavaScript number for client consumption.
 */
function serializeLoan(loan: any) {
  const isOverdue = isLoanOverdue(loan.dueDate, loan.isRepaid);
  return {
    id: loan.id,
    friendName: loan.friendName,
    amount: Number(loan.amount),
    dueDate: loan.dueDate.toISOString(),
    isRepaid: loan.isRepaid,
    isOverdue,
    receiptUrl: loan.receiptUrl || null,
    createdAt: loan.createdAt.toISOString(),
    updatedAt: loan.updatedAt.toISOString(),
  };
}

export async function createLoan(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { friendName, amount, dueDate, receiptUrl } = createLoanSchema.parse(req.body);

    const normalizedDate = normalizeToMidnight(dueDate);

    const loan = await prisma.loan.create({
      data: {
        friendName,
        amount: new Prisma.Decimal(amount.toFixed(2)),
        dueDate: normalizedDate,
        receiptUrl: receiptUrl || null,
        userId,
      },
    });

    res.status(201).json(serializeLoan(loan));
  } catch (error) {
    next(error);
  }
}

export async function getLoans(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;

    const loans = await prisma.loan.findMany({
      where: { userId },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    res.status(200).json(loans.map(serializeLoan));
  } catch (error) {
    next(error);
  }
}

export async function repayLoan(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      throw new AppError('Loan ID is required', 400);
    }

    const loan = await prisma.loan.findUnique({
      where: { id },
    });

    if (!loan || loan.userId !== userId) {
      throw new AppError('Loan not found or unauthorized', 404);
    }

    if (loan.isRepaid) {
      res.status(400).json({ error: 'This loan has already been marked as repaid.' });
      return;
    }

    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: { isRepaid: true },
    });

    res.status(200).json(serializeLoan(updatedLoan));
  } catch (error) {
    next(error);
  }
}

export async function getSummary(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;

    const loans = await prisma.loan.findMany({
      where: { userId },
    });

    let totalLent = 0;
    let totalRepaid = 0;
    let overdueAmount = 0;

    for (const loan of loans) {
      const amountNum = Number(loan.amount);
      totalLent += amountNum;

      if (loan.isRepaid) {
        totalRepaid += amountNum;
      } else {
        if (isLoanOverdue(loan.dueDate, loan.isRepaid)) {
          overdueAmount += amountNum;
        }
      }
    }

    res.status(200).json({
      totalLent: Number(totalLent.toFixed(2)),
      totalRepaid: Number(totalRepaid.toFixed(2)),
      overdueAmount: Number(overdueAmount.toFixed(2)),
    });
  } catch (error) {
    next(error);
  }
}
