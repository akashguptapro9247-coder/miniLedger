import { Router } from 'express';
import { createLoan, getLoans, repayLoan, getSummary } from '../controllers/loanController';
import { authMiddleware } from '../middleware/auth';

export const loanRouter = Router();

// All loan routes require authentication
loanRouter.use(authMiddleware);

// Define static routes before parameterized routes
loanRouter.get('/summary', getSummary);
loanRouter.post('/', createLoan);
loanRouter.get('/', getLoans);
loanRouter.patch('/:id/repay', repayLoan);
