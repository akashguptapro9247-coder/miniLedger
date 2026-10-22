# 🎓 MiniLedger Technical Interview Guide

This guide is designed to help you confidently explain the architecture, design choices, data modeling, and security implementation of MiniLedger during technical interview discussions.

---

## 1. Why a Relational Database (PostgreSQL)?

### The Question:
*"Why did you choose a relational database like PostgreSQL rather than a document store like MongoDB or SQLite?"*

### Talking Points:
- **Relational Integrity**: MiniLedger centers around structured entities with a strict `1-to-N` parent-child relationship (`User -> Loan[]`).
- **Cascade Deletes & Foreign Keys**: When a user account is removed, database-level cascading ensures orphaned loan records are deleted cleanly without manual cleanup queries (`onDelete: Cascade`).
- **ACID Transactions**: Financial operations (repayments, balance summaries) require strict consistency and transactional isolation to avoid race conditions and double-counting.
- **Production Scalability**: PostgreSQL hosted on Neon supports serverless autoscaling, connection pooling, and rich indexing (`@@index([userId])`, `@@index([dueDate])`).

---

## 2. How Prisma Models and Migrations Work

### The Question:
*"How does Prisma fit into your stack, and how are migrations handled?"*

### Talking Points:
- **Declarative Schema Definition**: `schema.prisma` acts as the single source of truth for database tables, column constraints, defaults, and foreign key relationships.
- **Type Safety**: Running `prisma generate` derives TypeScript types directly from the schema, ensuring compilation errors occur if code references invalid database columns.
- **Prisma Migrations**:
  - `prisma migrate dev` or `prisma migrate diff` generates versioned, deterministic SQL migration scripts stored in `prisma/migrations/`.
  - In CI/CD or production deployment, `prisma migrate deploy` executes pending migrations deterministically without interactive prompts.

---

## 3. Why Money Must Use Decimal Instead of Float

### The Question:
*"Why did you use PostgreSQL Decimal(12,2) instead of a Float or double precision number?"*

### Talking Points:
- **Binary Floating-Point Inaccuracy**: Standard IEEE 754 floating-point numbers in programming languages cannot represent decimal fractions precisely (e.g., `0.1 + 0.2 = 0.30000000000000004`). In financial accounting, this causes catastrophic rounding errors over time.
- **Exact Arbitrary-Precision Storage**: PostgreSQL's `Decimal(12, 2)` (also known as `NUMERIC`) stores numbers as exact strings of digits, guaranteeing zero precision loss.
- **API Serialization**: When serializing Decimal objects to JSON for the mobile client, we round and serialize to clean 2-decimal numbers (`Number(val.toFixed(2))`) so the client receives predictable numerical values without float drift.

---

## 4. How the Mock OTP Flow Works

### The Question:
*"How does authentication work without a password, and how is the OTP handled?"*

### Talking Points:
1. **Request Stage**:
   - The user submits their mobile number (`POST /auth/request-otp`).
   - The phone format is validated using Zod regex (`/^\+?[1-9]\d{9,14}$/`).
   - The server rate-limits generation (max 3 requests per 2 minutes) to prevent denial-of-service abuse.
   - A cryptographically secure 6-digit random number is generated via `crypto.randomInt(100000, 1000000)`.
   - The OTP is stored in memory with an expiration timestamp (`expiresAt = now + 5 minutes`) and an attempt counter (`attemptsLeft = 5`).
2. **Terminal Output (Development-Only)**:
   - The server prints the code to the console banner. It is **never** sent in the HTTP response.
3. **Verification Stage**:
   - The user inputs the code (`POST /auth/verify-otp`).
   - The server validates the code against the phone's stored record.
   - If incorrect, `attemptsLeft` is decremented. After 5 failed attempts, the OTP is invalidated.
   - Once verified, the OTP is **consumed and deleted immediately** to prevent replay attacks.
   - The user is upserted (`prisma.user.upsert`) and a signed JWT is returned.

---

## 5. Why Mock OTP is Printed Only in Development

### The Question:
*"Why is the OTP printed in the backend terminal, and what would change in production?"*

### Talking Points:
- **Development Simplicity**: In a coding interview or portfolio review, requiring an SMS vendor (e.g., Twilio, AWS SNS) would require paid credentials, API keys, and carrier approvals.
- **Zero Response Leakage**: Even in development, the OTP is never sent in the API JSON response, maintaining good security habits.
- **Production Path**: In production, the `otpService` would dispatch an SMS through an SMS gateway adapter, and in-memory storage would be replaced by Redis with native TTL (`SETEX phone:otp 300 code`).

---

## 6. How JWT Authentication Works & Secure Token Storage

### The Question:
*"How does the mobile app remain logged in, and how are authenticated requests guarded?"*

### Talking Points:
- **JWT Signing**: The backend signs a JWT with the user's `userId` and `phone` using a secret key read from `process.env.JWT_SECRET` with an expiration (`7d`).
- **Auth Middleware**: On protected routes (`/loans`), the `authMiddleware` checks for `Authorization: Bearer <TOKEN>`, verifies the cryptographic signature with `jwt.verify`, and attaches `req.user = { userId, phone }`.
- **Mobile Persistence**: On the mobile app, tokens are saved in **`expo-secure-store`** (which maps to Android KeyStore and iOS Keychain), rather than unencrypted `AsyncStorage`.
- **Session Auto-Recovery**: On launch, `AuthContext` checks `SecureStore` to restore authentication seamlessly. If the backend returns a `401 Unauthorized`, an interceptor automatically logs out the user and clears the token.

---

## 7. How Ownership & Tenant Isolation is Enforced

### The Question:
*"How do you ensure User A cannot view, modify, or repay User B's loans?"*

### Talking Points:
- **Never Trust Client User IDs**: Endpoints do not accept `userId` from the request body or query params. Instead, `req.user.userId` is decoded strictly from the verified JWT.
- **Scoping Queries**:
  - `GET /loans`: `prisma.loan.findMany({ where: { userId } })`.
  - `GET /loans/summary`: all aggregations filter by `userId`.
  - `PATCH /loans/:id/repay`: The query looks up the loan by ID and verifies `loan.userId === userId`. If not matching or not found, it responds with `404 Not Found` to prevent ID enumeration.

---

## 8. How Overdue Calculations Work

### The Question:
*"Walk me through the business logic for calculating whether a loan is overdue."*

### Talking Points:
- **The Core Rules**:
  1. `totalLent`: Sum of original amounts of all loans belonging to the user.
  2. `totalRepaid`: Sum of original amounts of fully repaid loans (`isRepaid === true`).
  3. `overdueAmount`: Sum of original amounts for loans that are **unpaid** (`isRepaid === false`) AND whose `dueDate` is strictly before the current calendar date (`< today 00:00:00`).
- **Edge Cases Handled**:
  - **Repaid Loans**: A loan marked as repaid is **never** overdue, even if its original due date was in the past.
  - **Due Today**: A loan due today is **not** overdue (it only becomes overdue tomorrow).
  - **Future Loans**: Unpaid loans due in the future are simply "Pending", never overdue.
- **Timezone Normalization**: All incoming date strings (`YYYY-MM-DD`) are normalized to UTC midnight (`00:00:00.000Z`) so timezone shifts between client and server do not cause date boundary bugs.

---

## 9. Mobile App Network Configuration

### The Question:
*"Why can't a mobile app just connect to http://localhost:4000?"*

### Talking Points:
- On an Android device or emulator, `localhost` refers to the mobile device loopback itself, not the developer's laptop.
- **Android Emulator**: Uses the virtual host loopback alias `http://10.0.2.2:4000`, or `adb reverse tcp:4000 tcp:4000`.
- **Physical Phone**: Uses the host computer's local Wi-Fi LAN IP (e.g., `http://192.168.0.8:4000`).
- **Express Binding**: The server listens on `0.0.0.0` (all network interfaces) so traffic from both the emulator and LAN devices can connect without getting rejected.

---

## 10. Trade-offs and Future Improvements

### What Was Prioritized:
- Clean modular code, strict TypeScript types, 100% test coverage for critical paths, responsive mobile UX, and zero flaky dependencies.

### What Would Be Added in a V2:
- **Partial Repayments**: Tracking multiple installment payments against a single loan.
- **Cloud Object Storage**: S3/R2 presigned upload URLs for high-resolution receipt images.
- **Push Notifications / SMS Reminders**: Automated notifications to friends when a loan approaches its due date.
- **Offline Sync**: Optimistic local SQLite caching with watermelondb or TanStack Query.
