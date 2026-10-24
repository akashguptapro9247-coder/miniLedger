# MiniLedger

A mobile app that helps you track money you lend to friends — record loans, mark them as repaid, and see an instant summary of what you're owed and what's overdue.

---

## 🔗 Project Links

- **GitHub Repository**: [View MiniLedger Source Code](https://github.com/akashguptapro9247-coder/miniLedger)
- **Demo Video & Files**: [Watch the Demo on Google Drive](https://drive.google.com/drive/folders/10KrflcALZUAwXO1_w-wkHp1Ki1onc0JO?usp=sharing)

---

## Key Features

- **Phone login with OTP** — enter your number, receive a 6-digit code printed in the backend terminal, verify it to sign in
- **Add loans** — record a friend's name, amount (₹), and due date; optionally attach a receipt photo
- **Loan list** — view all active and repaid loans with Pending / Overdue / Repaid badges
- **Mark as Repaid** — one tap marks a loan repaid and updates totals immediately
- **Summary totals** — Total Lent, Total Repaid, and Overdue Amount displayed at a glance
- **Tenant isolation** — each phone number sees only its own loans

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Node.js, Express, TypeScript |
| Database | PostgreSQL (hosted on [Neon](https://neon.tech)) |
| ORM | Prisma |
| Auth | JWT (signed with a secret you set in `.env`) |
| Mobile app | React Native, Expo SDK 52, TypeScript |
| Web browser | react-native-web (same codebase, `expo start --web`) |

---

## Prerequisites

- **Node.js** v18 or later — [nodejs.org](https://nodejs.org)
- **npm** v9 or later (bundled with Node.js)
- **Expo Go** app on your Android device — [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **PostgreSQL database** — a free [Neon](https://neon.tech) project works perfectly

---

## Setup and Run

The project has two parts. Open **two terminal windows** — one for the backend, one for the mobile app.

### 1 — Clone and enter the project

```bash
git clone https://github.com/akashguptapro9247-coder/miniLedger.git
cd test_intershala
```

---

### 2 — Configure the backend

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and fill in these three values:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
JWT_SECRET="any-random-string-at-least-32-characters-long"
JWT_EXPIRES_IN="7d"
```

> **DATABASE_URL**: copy it from the Neon console → your project → Connection Details → Connection String.  
> **JWT_SECRET**: any long random string — it signs login tokens.

---

### 3 — Install backend dependencies and apply migrations

```bash
# still inside backend/
npm install
npx prisma migrate deploy
```

> If connecting to a fresh database for the first time, run `npx prisma db push` instead.

---

### 4 — Start the backend server

```bash
npm run dev
```

You should see:

```
🚀 MiniLedger backend running on port 4000
```

Leave this terminal running.

---

### 5 — Configure the mobile app

Open a **new terminal** and run:

```bash
cd mobile
cp .env.example .env
```

Open `mobile/.env` and set the API URL that matches how you will run the app:

```env
# Android Emulator (on the same machine as the backend):
EXPO_PUBLIC_API_URL="http://10.0.2.2:4000"

# Physical Android phone (on the same Wi-Fi network):
EXPO_PUBLIC_API_URL="http://192.168.x.x:4000"   # replace with your machine's LAN IP

# Web browser: no change needed — the app auto-uses http://localhost:4000 on web
```

---

### 6 — Install mobile dependencies and start

```bash
# still inside mobile/
npm install
npx expo start
```

---

## Open on a Device

### Android Emulator

1. Start an emulator from Android Studio (API 33+).
2. Press **`a`** in the Expo terminal — the app opens automatically.
3. Keep `EXPO_PUBLIC_API_URL="http://10.0.2.2:4000"` in `mobile/.env` (the emulator's alias for your machine's localhost).

### Physical Android Phone

1. Install **Expo Go** on the phone from the Google Play Store.
2. Make sure the phone and your laptop are on the **same Wi-Fi network**.
3. Find your machine's LAN IP:
   - **Windows**: run `ipconfig` → look for **IPv4 Address** under your Wi-Fi adapter (e.g. `192.168.1.10`)
   - **macOS/Linux**: run `ifconfig` or `ip addr`
4. Set `EXPO_PUBLIC_API_URL="http://192.168.1.10:4000"` in `mobile/.env`, then restart Expo (`Ctrl+C`, then `npx expo start` again).
5. Scan the QR code shown in the Expo terminal with the **Expo Go** app.

### Web Browser

```bash
npx expo start --web
```

Open `http://localhost:8081` in Chrome or Firefox. No `.env` change needed — the app automatically targets `http://localhost:4000` in the browser.

---

## Testing

Run the automated test suite from the **backend** directory:

```bash
cd backend
npm test
```

**Verified results — 20/20 passing:**

```
 ✓ tests/unit/dateAndOverdue.test.ts   (5 tests)
 ✓ tests/unit/otpService.test.ts       (5 tests)
 ✓ tests/integration/api.test.ts      (10 tests)

 Test Files  3 passed (3)
      Tests  20 passed (20)
   Duration  ~15s
```

Tests cover: health endpoint, OTP lifecycle (generation, expiry, attempt limits, reuse prevention), JWT auth, user deletion session invalidation (401), loan CRUD, tenant isolation, overdue logic, repayment, duplicate-repay prevention, and CORS from a browser origin.

---

## Demo Video & Files

▶ **[Watch the Demo on Google Drive](https://drive.google.com/drive/folders/10KrflcALZUAwXO1_w-wkHp1Ki1onc0JO?usp=sharing)**

---

## Repository

🔗 **[View MiniLedger Source Code](https://github.com/akashguptapro9247-coder/miniLedger)**

