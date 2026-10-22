import crypto from 'crypto';

interface OtpEntry {
  code: string;
  expiresAt: number;
  attemptsLeft: number;
}

interface RequestRateEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory OTP storage service.
 * Note: Suitable for development and single-instance deployments.
 * In distributed production, a centralized cache such as Redis would be used
 * with automated TTL and clustering support.
 */
class OtpService {
  private otpStore = new Map<string, OtpEntry>();
  private rateStore = new Map<string, RequestRateEntry>();

  private readonly OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ATTEMPTS = 5;
  private readonly RATE_LIMIT_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
  private readonly MAX_REQUESTS_PER_WINDOW = 3;

  /**
   * Generates a 6-digit cryptographically secure OTP and stores it.
   */
  public generateOtp(phone: string): { success: boolean; message: string } {
    const now = Date.now();

    // Check request rate limit per phone
    const rateEntry = this.rateStore.get(phone);
    if (rateEntry) {
      if (now < rateEntry.resetAt) {
        if (rateEntry.count >= this.MAX_REQUESTS_PER_WINDOW) {
          const waitSecs = Math.ceil((rateEntry.resetAt - now) / 1000);
          return {
            success: false,
            message: `Too many OTP requests. Please try again in ${waitSecs} seconds.`,
          };
        }
        rateEntry.count += 1;
      } else {
        this.rateStore.set(phone, { count: 1, resetAt: now + this.RATE_LIMIT_WINDOW_MS });
      }
    } else {
      this.rateStore.set(phone, { count: 1, resetAt: now + this.RATE_LIMIT_WINDOW_MS });
    }

    // Generate 6-digit random code (100000 to 999999)
    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = now + this.OTP_TTL_MS;

    this.otpStore.set(phone, {
      code,
      expiresAt,
      attemptsLeft: this.MAX_ATTEMPTS,
    });

    // Development terminal output
    console.log('\n' + '='.repeat(50));
    console.log(`  🔐 MINILEDGER MOCK OTP FOR: ${phone}`);
    console.log(`  👉 CODE: ${code}`);
    console.log(`  ⏳ Valid for: 5 minutes (Max ${this.MAX_ATTEMPTS} attempts)`);
    console.log('='.repeat(50) + '\n');

    return {
      success: true,
      message: 'OTP has been generated and printed to server terminal',
    };
  }

  /**
   * Verifies the OTP.
   * Decrements attempts on failure. Consumes OTP on success.
   */
  public verifyOtp(phone: string, inputOtp: string): { valid: boolean; error?: string } {
    const entry = this.otpStore.get(phone);
    const now = Date.now();

    if (!entry) {
      return { valid: false, error: 'No OTP requested for this phone number or it has already expired' };
    }

    if (now > entry.expiresAt) {
      this.otpStore.delete(phone);
      return { valid: false, error: 'OTP has expired. Please request a new one.' };
    }

    if (entry.attemptsLeft <= 0) {
      this.otpStore.delete(phone);
      return { valid: false, error: 'Maximum verification attempts exceeded. Please request a new OTP.' };
    }

    if (entry.code !== inputOtp.trim()) {
      entry.attemptsLeft -= 1;
      if (entry.attemptsLeft <= 0) {
        this.otpStore.delete(phone);
        return { valid: false, error: 'Incorrect OTP. Maximum attempts exceeded. Please request a new one.' };
      }
      return {
        valid: false,
        error: `Incorrect OTP. ${entry.attemptsLeft} attempt(s) remaining.`,
      };
    }

    // Success: consume OTP immediately to prevent replay attacks
    this.otpStore.delete(phone);
    return { valid: true };
  }

  /**
   * For testing purposes only: inspect active OTP without modifying it
   */
  public getActiveOtpForTesting(phone: string): string | null {
    const entry = this.otpStore.get(phone);
    return entry ? entry.code : null;
  }

  /**
   * For testing purposes: clear store
   */
  public clear(): void {
    this.otpStore.clear();
    this.rateStore.clear();
  }
}

export const otpService = new OtpService();
