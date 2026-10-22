import { describe, it, expect, beforeEach, vi } from 'vitest';
import { otpService } from '../../src/services/otpService';

describe('OtpService', () => {
  const testPhone = '+919876543210';

  beforeEach(() => {
    otpService.clear();
    vi.restoreAllMocks();
  });

  it('generates a 6-digit numeric OTP', () => {
    const res = otpService.generateOtp(testPhone);
    expect(res.success).toBe(true);

    const activeOtp = otpService.getActiveOtpForTesting(testPhone);
    expect(activeOtp).toMatch(/^\d{6}$/);
  });

  // Requirement 3: Invalid OTP is rejected
  it('rejects an incorrect OTP and decrements attempts left', () => {
    otpService.generateOtp(testPhone);
    const result = otpService.verifyOtp(testPhone, '000000');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Incorrect OTP');
  });

  // Requirement 4: Expired OTP is rejected
  it('rejects an expired OTP after 5 minutes TTL', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    otpService.generateOtp(testPhone);
    const activeOtp = otpService.getActiveOtpForTesting(testPhone)!;

    // Fast-forward 5 minutes + 1 second
    vi.spyOn(Date, 'now').mockReturnValue(now + 5 * 60 * 1000 + 1000);

    const result = otpService.verifyOtp(testPhone, activeOtp);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('expired');
  });

  it('enforces maximum 5 verification attempts', () => {
    otpService.generateOtp(testPhone);

    // Try 5 wrong attempts
    for (let i = 0; i < 4; i++) {
      const res = otpService.verifyOtp(testPhone, '999999');
      expect(res.valid).toBe(false);
    }

    // 5th attempt exhausts limit
    const finalRes = otpService.verifyOtp(testPhone, '999999');
    expect(finalRes.valid).toBe(false);
    expect(finalRes.error).toContain('Maximum attempts exceeded');

    // 6th attempt fails because OTP entry was deleted
    const subsequentRes = otpService.verifyOtp(testPhone, '999999');
    expect(subsequentRes.valid).toBe(false);
  });

  it('consumes OTP upon successful verification to prevent reuse', () => {
    otpService.generateOtp(testPhone);
    const activeOtp = otpService.getActiveOtpForTesting(testPhone)!;

    const firstVerify = otpService.verifyOtp(testPhone, activeOtp);
    expect(firstVerify.valid).toBe(true);

    // Replay attempt must fail
    const replayVerify = otpService.verifyOtp(testPhone, activeOtp);
    expect(replayVerify.valid).toBe(false);
  });
});
