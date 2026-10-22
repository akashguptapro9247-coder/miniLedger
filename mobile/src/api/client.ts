import { Platform } from 'react-native';
import { Loan, LoanSummary, User } from '../types';

// On the laptop browser the backend is always on localhost:4000 — the LAN IP
// in .env is correct for a physical Android device on the same WiFi but is
// unreachable from the browser running on the same machine as the dev server.
const ENV_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000';
const BASE_URL = Platform.OS === 'web' ? 'http://localhost:4000' : ENV_URL;

class ApiClient {
  private token: string | null = null;
  private onUnauthorized: (() => void) | null = null;

  public setToken(token: string | null) {
    this.token = token;
  }

  public setOnUnauthorized(callback: () => void) {
    this.onUnauthorized = callback;
  }

  public getBaseUrl(): string {
    return BASE_URL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        if (this.onUnauthorized) {
          this.onUnauthorized();
        }
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          data?.error ||
          data?.message ||
          (data?.details ? Object.values(data.details).flat().join(', ') : null) ||
          `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      return data as T;
    } catch (error: any) {
      if (error.message.includes('Network request failed')) {
        throw new Error(
          `Unable to connect to server at ${BASE_URL}. Ensure the backend is running and the device network is configured correctly.`
        );
      }
      throw error;
    }
  }

  // Auth endpoints
  public async requestOtp(phone: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  public async verifyOtp(phone: string, otp: string): Promise<{ token: string; user: User }> {
    return this.request<{ token: string; user: User }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
  }

  // Loan endpoints
  public async getSummary(): Promise<LoanSummary> {
    return this.request<LoanSummary>('/loans/summary', {
      method: 'GET',
    });
  }

  public async getLoans(): Promise<Loan[]> {
    return this.request<Loan[]>('/loans', {
      method: 'GET',
    });
  }

  public async createLoan(data: {
    friendName: string;
    amount: number;
    dueDate: string;
    receiptUrl?: string | null;
  }): Promise<Loan> {
    return this.request<Loan>('/loans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async repayLoan(id: string): Promise<Loan> {
    return this.request<Loan>(`/loans/${id}/repay`, {
      method: 'PATCH',
    });
  }

  // Health check
  public async checkHealth(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/health', {
      method: 'GET',
    });
  }
}

export const api = new ApiClient();
