import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { config } from '../config';
import { otpService } from '../services/otpService';
import { requestOtpSchema, verifyOtpSchema } from '../utils/validation';

export async function requestOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { phone } = requestOtpSchema.parse(req.body);

    const result = otpService.generateOtp(phone);
    if (!result.success) {
      res.status(429).json({ error: result.message });
      return;
    }

    res.status(200).json({
      message: 'OTP has been generated. In development, check the server terminal.',
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { phone, otp } = verifyOtpSchema.parse(req.body);

    const verification = otpService.verifyOtp(phone, otp);
    if (!verification.valid) {
      res.status(400).json({ error: verification.error });
      return;
    }

    // Find or create user atomically
    const user = await prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone },
    });

    // Generate JWT with userId and phone
    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    res.status(200).json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
      },
    });
  } catch (error) {
    next(error);
  }
}
