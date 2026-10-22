import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { otpService } from '../../src/services/otpService';

describe('MiniLedger Backend API Integration Tests', () => {
  const userAPhone = '+919999900001';
  const userBPhone = '+919999900002';
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    // Clean test data if existed
    await prisma.loan.deleteMany({
      where: {
        user: {
          phone: { in: [userAPhone, userBPhone] },
        },
      },
    });
    await prisma.user.deleteMany({
      where: { phone: { in: [userAPhone, userBPhone] } },
    });
  });

  afterAll(async () => {
    // Teardown test accounts cleanly
    await prisma.loan.deleteMany({
      where: {
        user: {
          phone: { in: [userAPhone, userBPhone] },
        },
      },
    });
    await prisma.user.deleteMany({
      where: { phone: { in: [userAPhone, userBPhone] } },
    });
    await prisma.$disconnect();
  });

  // Requirement 1: Health endpoint returns success
  it('1. GET /health returns success with 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
  });

  // Requirement 2: Invalid phone number is rejected
  it('2. POST /auth/request-otp rejects an invalid phone number', async () => {
    const res = await request(app)
      .post('/auth/request-otp')
      .send({ phone: 'not-a-phone-number' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toHaveProperty('phone');
  });

  // Requirement 5: Successful OTP verification returns a token
  it('5. Successful OTP request and verification creates user and returns JWT token', async () => {
    // Request OTP for User A
    const reqRes = await request(app)
      .post('/auth/request-otp')
      .send({ phone: userAPhone });
    expect(reqRes.status).toBe(200);

    // Retrieve the mock OTP generated
    const otp = otpService.getActiveOtpForTesting(userAPhone);
    expect(otp).toBeDefined();

    // Verify OTP
    const verifyRes = await request(app)
      .post('/auth/verify-otp')
      .send({ phone: userAPhone, otp });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body).toHaveProperty('token');
    expect(verifyRes.body.user).toHaveProperty('id');
    expect(verifyRes.body.user.phone).toBe(userAPhone);

    userAToken = verifyRes.body.token;
    userAId = verifyRes.body.user.id;

    // Also set up User B for isolation tests
    otpService.generateOtp(userBPhone);
    const otpB = otpService.getActiveOtpForTesting(userBPhone)!;
    const verifyB = await request(app)
      .post('/auth/verify-otp')
      .send({ phone: userBPhone, otp: otpB });
    userBToken = verifyB.body.token;
    userBId = verifyB.body.user.id;
  });

  // Requirement 6: Loan creation rejects an invalid amount
  it('6. POST /loans rejects non-positive, zero, or non-finite amounts', async () => {
    const negativeRes = await request(app)
      .post('/loans')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        friendName: 'Rohan',
        amount: -500,
        dueDate: '2026-11-01',
      });
    expect(negativeRes.status).toBe(400);

    const zeroRes = await request(app)
      .post('/loans')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        friendName: 'Rohan',
        amount: 0,
        dueDate: '2026-11-01',
      });
    expect(zeroRes.status).toBe(400);

    const excessiveRes = await request(app)
      .post('/loans')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        friendName: 'Rohan',
        amount: 9999999999,
        dueDate: '2026-11-01',
      });
    expect(excessiveRes.status).toBe(400);
  });

  // Requirement 8: An unauthenticated user cannot access loans
  it('8. Unauthenticated requests to /loans are rejected with 401', async () => {
    const res = await request(app).get('/loans');
    expect(res.status).toBe(401);
  });

  // Requirement 7: Authenticated user can create and list their own loans
  it('7. Authenticated user can create and list their own loans', async () => {
    const createRes = await request(app)
      .post('/loans')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        friendName: 'Amit Sharma',
        amount: 2500,
        dueDate: '2026-11-15',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.friendName).toBe('Amit Sharma');
    expect(createRes.body.amount).toBe(2500);
    expect(createRes.body.isRepaid).toBe(false);

    const listRes = await request(app)
      .get('/loans')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.length).toBeGreaterThanOrEqual(1);
    expect(listRes.body[0].friendName).toBe('Amit Sharma');
  });

  // Requirement 9: One user cannot read or repay another user's loan
  it("9. User B cannot access or repay User A's loan", async () => {
    // Create loan under User A
    const loanRes = await request(app)
      .post('/loans')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        friendName: 'Suresh',
        amount: 1500,
        dueDate: '2026-12-01',
      });
    const userALoanId = loanRes.body.id;

    // User B tries to repay User A's loan
    const repayAttempt = await request(app)
      .patch(`/loans/${userALoanId}/repay`)
      .set('Authorization', `Bearer ${userBToken}`);

    // Must return 404 (or 403) unauthorized
    expect([404, 403]).toContain(repayAttempt.status);

    // Verify User B's loan list does NOT contain User A's loan
    const userBList = await request(app)
      .get('/loans')
      .set('Authorization', `Bearer ${userBToken}`);
    const found = userBList.body.some((l: any) => l.id === userALoanId);
    expect(found).toBe(false);
  });

  // Requirement 10: Marking a loan as repaid updates the summary
  it('10. Marking a loan as repaid updates summary correctly without duplication', async () => {
    // Clean user A loans for a clean calculation test
    await prisma.loan.deleteMany({ where: { userId: userAId } });

    // Loan 1: 1000 due in future (not overdue)
    const l1 = await request(app)
      .post('/loans')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        friendName: 'Kunal',
        amount: 1000,
        dueDate: '2026-11-20',
      });

    // Loan 2: 500 due in past (overdue)
    const l2 = await request(app)
      .post('/loans')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        friendName: 'Vikas',
        amount: 500,
        dueDate: '2026-01-01',
      });

    // Initial summary: totalLent = 1500, totalRepaid = 0, overdueAmount = 500
    const sum1 = await request(app)
      .get('/loans/summary')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(sum1.status).toBe(200);
    expect(sum1.body.totalLent).toBe(1500);
    expect(sum1.body.totalRepaid).toBe(0);
    expect(sum1.body.overdueAmount).toBe(500);

    // Repay the overdue loan (Loan 2)
    const repayRes = await request(app)
      .patch(`/loans/${l2.body.id}/repay`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(repayRes.status).toBe(200);
    expect(repayRes.body.isRepaid).toBe(true);

    // Summary after repayment: totalLent = 1500, totalRepaid = 500, overdueAmount = 0
    const sum2 = await request(app)
      .get('/loans/summary')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(sum2.body.totalLent).toBe(1500);
    expect(sum2.body.totalRepaid).toBe(500);
    expect(sum2.body.overdueAmount).toBe(0);

    // Prevent duplicate repayment
    const duplicateRepay = await request(app)
      .patch(`/loans/${l2.body.id}/repay`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(duplicateRepay.status).toBe(400);
    expect(duplicateRepay.body.error).toContain('already been marked as repaid');
  });

  // Regression test: PATCH /loans/:id/repay works from a browser origin (web fix)
  // Root cause that was fixed: Alert.alert on react-native-web silently swallowed
  // the confirmation callback. The API endpoint itself must accept PATCH from a
  // browser origin and return 200 with isRepaid=true.
  it('11. PATCH /loans/:id/repay is accessible from browser origin (CORS + method)', async () => {
    // Create a fresh loan for User B to keep test isolated
    const loanRes = await request(app)
      .post('/loans')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        friendName: 'Browser Regression',
        amount: 750,
        dueDate: '2026-12-31',
      });
    expect(loanRes.status).toBe(201);
    const loanId = loanRes.body.id;

    // Simulate browser CORS preflight for PATCH (OPTIONS request)
    const preflight = await request(app)
      .options(`/loans/${loanId}/repay`)
      .set('Origin', 'http://localhost:8081')
      .set('Access-Control-Request-Method', 'PATCH')
      .set('Access-Control-Request-Headers', 'Authorization,Content-Type');
    // A permissive CORS config should return 204 or 200 with Allow-Origin header
    expect([200, 204]).toContain(preflight.status);
    expect(preflight.headers['access-control-allow-origin']).toBeTruthy();
    expect(preflight.headers['access-control-allow-methods']).toMatch(/PATCH/i);

    // Actual PATCH request as sent by the browser
    const repayRes = await request(app)
      .patch(`/loans/${loanId}/repay`)
      .set('Authorization', `Bearer ${userBToken}`)
      .set('Origin', 'http://localhost:8081');
    expect(repayRes.status).toBe(200);
    expect(repayRes.body.isRepaid).toBe(true);
    expect(repayRes.body.id).toBe(loanId);
  });
});
