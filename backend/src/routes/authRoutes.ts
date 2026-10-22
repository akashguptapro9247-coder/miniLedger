import { Router } from 'express';
import { requestOtp, verifyOtp } from '../controllers/authController';
import { authLimiter } from '../middleware/rateLimiter';

export const authRouter = Router();

authRouter.post('/request-otp', authLimiter, requestOtp);
authRouter.post('/verify-otp', authLimiter, verifyOtp);
