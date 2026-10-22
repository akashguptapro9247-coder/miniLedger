import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/healthRoutes';
import { authRouter } from './routes/authRoutes';
import { loanRouter } from './routes/loanRoutes';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';

export const app = express();

// Security and CORS configuration
app.use(
  cors({
    origin: '*', // Permissive for local dev across Expo web / mobile emulators
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Payload size limit (supports optional receipt image payload)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply general rate limiting to API
app.use(apiLimiter);

// Mount core routes
app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/loans', loanRouter);

// Catch-all 404 for undefined endpoints
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Centralized error handler
app.use(errorHandler);
