import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/prisma';

export interface AuthenticatedUser {
  userId: string;
  phone: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Missing or malformed Bearer token.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; phone: string };
    if (!decoded.userId || !decoded.phone) {
      res.status(401).json({ error: 'Invalid token payload.' });
      return;
    }

    // Verify user still exists in the database (handles session invalidation upon user deletion)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, phone: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User account no longer exists. Please log in again.' });
      return;
    }

    req.user = {
      userId: user.id,
      phone: user.phone,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Session expired. Please log in again.' });
      return;
    }
    res.status(401).json({ error: 'Invalid or forged token.' });
  }
}

